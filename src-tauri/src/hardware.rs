use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::Engine as _;
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

const SQLITE_HEADER: &[u8] = b"SQLite format 3\0";
const DATABASE_FILE_NAME: &str = "gold-label-studio-pro.db";

/// Open serial sessions, keyed by the id handed to the frontend. `SerialPort`
/// already requires `Send`, so the mutex keeps the map shareable across the
/// command threads without an extra bound.
static SERIAL_SESSIONS: LazyLock<Mutex<HashMap<u64, Box<dyn serialport::SerialPort>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static NEXT_SERIAL_ID: Mutex<u64> = Mutex::new(1);

/// Resolves the live SQLite file to the same location the SQL plugin uses.
///
/// The plugin resolves the relative `sqlite:gold-label-studio-pro.db` URL
/// against the AppConfig directory, so that directory is authoritative. AppData
/// is only consulted when no database exists there yet, which keeps a database
/// written by an older layout reachable instead of backing up the wrong file.
fn resolve_database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_directory = app.path().app_config_dir().ok();
    let data_directory = app.path().app_data_dir().ok();

    for directory in [config_directory.as_ref(), data_directory.as_ref()]
        .into_iter()
        .flatten()
    {
        let candidate = directory.join(DATABASE_FILE_NAME);
        if candidate.is_file() {
            return Ok(candidate);
        }
    }

    config_directory
        .or(data_directory)
        .map(|directory| directory.join(DATABASE_FILE_NAME))
        .ok_or_else(|| "could not resolve the application data directory".to_string())
}

/// Flushes the WAL into the main database file so a plain file copy is coherent.
fn checkpoint(path: &Path) -> Result<(), String> {
    let connection = Connection::open(path).map_err(|error| format!("open database for checkpoint: {error}"))?;
    connection
        .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
        .map_err(|error| format!("checkpoint failed: {error}"))?;
    Ok(())
}

/// Validates a SQLite file: header magic plus a full integrity check.
pub(crate) fn validate_sqlite_file(path: &Path) -> Result<(), String> {
    if !path.is_file() {
        return Err(format!("file not found: {}", path.display()));
    }
    let bytes = fs::read(path).map_err(|error| format!("read file: {error}"))?;
    if bytes.len() < 16 || &bytes[..16] != SQLITE_HEADER {
        return Err("not a SQLite database file".to_string());
    }
    let connection = Connection::open_with_flags(
        path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(|error| format!("open database for validation: {error}"))?;
    let result: String = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|error| format!("integrity check failed: {error}"))?;
    if result.trim() != "ok" {
        return Err(format!("integrity check failed: {result}"));
    }
    Ok(())
}

/// WAL-safe copy: checkpoint first, copy the main file plus any side files,
/// then validate the copy before reporting success.
fn copy_database_coherently(source: &Path, destination: &Path) -> Result<(), String> {
    // Checked before the checkpoint, because opening a missing SQLite path
    // would create an empty database and turn a wrong path into a confusing
    // "not a SQLite file" error instead of an honest one.
    if !source.is_file() {
        return Err(format!("database file not found: {}", source.display()));
    }
    if source == destination {
        return Err("backup destination is the live database file".to_string());
    }
    checkpoint(source)?;
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("create destination directory: {error}"))?;
    }
    fs::copy(source, destination).map_err(|error| format!("copy database: {error}"))?;
    for suffix in ["-wal", "-shm"] {
        let side_source = PathBuf::from(format!("{}{}", source.display(), suffix));
        if side_source.is_file() {
            let _ = fs::copy(&side_source, PathBuf::from(format!("{}{}", destination.display(), suffix)));
        }
    }
    validate_sqlite_file(destination)?;
    Ok(())
}

fn now_stamp() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0)
}

#[tauri::command]
pub fn backup_database(app: AppHandle, destination: String) -> Result<String, String> {
    let source = resolve_database_path(&app)?;
    let destination_path = PathBuf::from(&destination);
    copy_database_coherently(&source, &destination_path)?;
    Ok(destination)
}

#[tauri::command]
pub fn backup_list(directory: String) -> Result<Vec<String>, String> {
    let directory_path = PathBuf::from(&directory);
    if !directory_path.is_dir() {
        return Ok(Vec::new());
    }
    let mut candidates: Vec<PathBuf> = fs::read_dir(&directory_path)
        .map_err(|error| format!("list backup directory: {error}"))?
        .filter_map(|entry| entry.ok().map(|entry| entry.path()))
        .filter(|path| {
            path.is_file()
                && path
                    .extension()
                    .map(|extension| extension == "db")
                    .unwrap_or(false)
                && !path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .starts_with("gold-label-studio-pro.pre-restore")
        })
        .collect();
    candidates.sort_by_key(|path| fs::metadata(path).and_then(|metadata| metadata.modified()).ok());
    candidates.reverse();
    Ok(candidates.into_iter().map(|path| path.display().to_string()).collect())
}

/// Standalone validation so the UI can reject an unusable backup file before
/// it ever touches the active database.
#[tauri::command]
pub fn backup_validate(source: String) -> Result<String, String> {
    validate_sqlite_file(Path::new(&source))?;
    Ok("valid".to_string())
}

/// Replaces the live database with a validated backup. The active file is
/// checkpointed and kept as a `pre-restore` safety copy first, and stale WAL
/// side files are removed so the restored file is what SQLite actually opens.
/// Extracted from the command so it can be tested without an `AppHandle`.
pub(crate) fn replace_database_with_backup(target: &Path, source: &Path) -> Result<(), String> {
    validate_sqlite_file(source)?;
    if target.exists() {
        checkpoint(target)?;
        let safety = target.with_file_name(format!("gold-label-studio-pro.pre-restore-{}.db", now_stamp()));
        fs::copy(target, &safety).map_err(|error| format!("safety copy of active database failed: {error}"))?;
    }
    fs::copy(source, target).map_err(|error| format!("restore copy failed: {error}"))?;
    for suffix in ["-wal", "-shm"] {
        let _ = fs::remove_file(PathBuf::from(format!("{}{}", target.display(), suffix)));
    }
    validate_sqlite_file(target)?;
    Ok(())
}

#[tauri::command]
pub fn restore_database(app: AppHandle, source: String) -> Result<String, String> {
    let target = resolve_database_path(&app)?;
    replace_database_with_backup(&target, Path::new(&source))?;
    Ok("restore complete".to_string())
}

/// Restarts the application.
///
/// A restored database replaces the file the SQL plugin already has open, so
/// its pooled connection keeps a stale page cache. The UI calls this after a
/// successful restore instead of continuing to run against that connection.
#[tauri::command]
pub fn relaunch_app(app: AppHandle) {
    app.request_restart();
}

#[tauri::command]
pub fn serial_list() -> Result<Vec<String>, String> {
    serialport::available_ports()
        .map(|ports| ports.into_iter().map(|port| port.port_name).collect())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn serial_open(port: String, baud: u32) -> Result<u64, String> {
    let device = serialport::new(&port, baud)
        .timeout(Duration::from_millis(250))
        .open()
        .map_err(|error| error.to_string())?;
    let mut sessions = SERIAL_SESSIONS.lock().map_err(|_| "serial session lock poisoned".to_string())?;
    let mut next = NEXT_SERIAL_ID.lock().map_err(|_| "serial id lock poisoned".to_string())?;
    let session_id = *next;
    *next += 1;
    sessions.insert(session_id, device);
    Ok(session_id)
}

#[tauri::command]
pub fn serial_read(session_id: u64) -> Result<String, String> {
    let mut sessions = SERIAL_SESSIONS.lock().map_err(|_| "serial session lock poisoned".to_string())?;
    let port = sessions
        .get_mut(&session_id)
        .ok_or_else(|| "serial session is not open".to_string())?;
    let mut buffer = [0u8; 4096];
    match port.read(&mut buffer) {
        Ok(0) => Ok(String::new()),
        Ok(count) => Ok(String::from_utf8_lossy(&buffer[..count]).into_owned()),
        Err(error) if error.kind() == std::io::ErrorKind::TimedOut => Ok(String::new()),
        Err(error) => Err(format!("serial read failed: {error}")),
    }
}

#[tauri::command]
pub fn serial_write(session_id: u64, data: String) -> Result<(), String> {
    use std::io::Write;
    let mut sessions = SERIAL_SESSIONS.lock().map_err(|_| "serial session lock poisoned".to_string())?;
    let port = sessions
        .get_mut(&session_id)
        .ok_or_else(|| "serial session is not open".to_string())?;
    port.write_all(data.as_bytes())
        .map_err(|error| format!("serial write failed: {error}"))?;
    port.flush().map_err(|error| format!("serial flush failed: {error}"))
}

#[tauri::command]
pub fn serial_close(session_id: u64) -> Result<(), String> {
    let mut sessions = SERIAL_SESSIONS.lock().map_err(|_| "serial session lock poisoned".to_string())?;
    sessions.remove(&session_id);
    Ok(())
}

/// PowerShell script that sends RAW bytes to a Windows printer through
/// winspool. The script itself is ASCII-only; the printer name and payload are
/// passed through environment variables so no quoting can break.
const RAW_PRINT_SCRIPT: &str = r#"
$ErrorActionPreference = "Stop"
$printer = $env:GLSP_PRINTER
$payload = [System.Convert]::FromBase64String($env:GLSP_PAYLOAD_B64)
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class RawPrinterHelper
{
    [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFO di);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
    public struct DOCINFO
    {
        public string pDocName;
        public string pOutputFile;
        public string pDataType;
    }
    public static int SendRaw(string printerName, byte[] bytes)
    {
        IntPtr printer = IntPtr.Zero;
        if (!OpenPrinter(printerName, out printer, IntPtr.Zero)) return 1;
        try
        {
            DOCINFO info = new DOCINFO();
            info.pDocName = "Gold Label";
            info.pDataType = "RAW";
            if (!StartDocPrinter(printer, 1, ref info)) return 2;
            if (!StartPagePrinter(printer)) return 3;
            IntPtr buffer = Marshal.AllocHGlobal(bytes.Length);
            try
            {
                Marshal.Copy(bytes, 0, buffer, bytes.Length);
                int written = 0;
                if (!WritePrinter(printer, buffer, bytes.Length, out written)) return 4;
            }
            finally
            {
                Marshal.FreeHGlobal(buffer);
            }
            EndPagePrinter(printer);
            EndDocPrinter(printer);
            return 0;
        }
        finally
        {
            ClosePrinter(printer);
        }
    }
}
"@
$code = [RawPrinterHelper]::SendRaw($printer, $payload)
if ($code -ne 0) { throw "raw print failed with code $code" }
"#;

fn encode_utf16le_base64(value: &str) -> String {
    let bytes: Vec<u8> = value
        .encode_utf16()
        .flat_map(|unit| unit.to_le_bytes())
        .collect();
    base64::engine::general_purpose::STANDARD.encode(bytes)
}

#[tauri::command]
pub fn print_raw(printer: String, payload: String) -> Result<(), String> {
    let printer_name = printer.trim();
    if printer_name.is_empty() {
        return Err("printer name is required".to_string());
    }
    if payload.is_empty() {
        return Err("print payload is empty".to_string());
    }
    let payload_b64 = base64::engine::general_purpose::STANDARD.encode(payload.as_bytes());
    let script_b64 = encode_utf16le_base64(RAW_PRINT_SCRIPT);
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-EncodedCommand", &script_b64])
        .env("GLSP_PRINTER", printer_name)
        .env("GLSP_PAYLOAD_B64", payload_b64)
        .stdin(std::process::Stdio::null())
        .output()
        .map_err(|error| format!("failed to start print process: {error}"))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine as _;

    #[test]
    fn validate_rejects_non_sqlite_files() {
        let path = std::env::temp_dir().join(format!("glsp-not-sqlite-{}.bin", now_stamp()));
        fs::write(&path, b"this is not a database file at all").unwrap();
        let error = validate_sqlite_file(&path).unwrap_err();
        assert!(error.contains("SQLite"));
        fs::remove_file(&path).ok();
    }

    #[test]
    fn validate_accepts_a_well_formed_database() {
        let path = std::env::temp_dir().join(format!("glsp-valid-{}.db", now_stamp()));
        let connection = Connection::open(&path).unwrap();
        connection
            .execute_batch("CREATE TABLE sample (id INTEGER PRIMARY KEY, value TEXT); INSERT INTO sample (value) VALUES ('ok');")
            .unwrap();
        drop(connection);
        validate_sqlite_file(&path).unwrap();
        fs::remove_file(&path).ok();
    }

    #[test]
    fn copy_database_coherently_preserves_rows_in_wal_mode() {
        let source = std::env::temp_dir().join(format!("glsp-wal-source-{}.db", now_stamp()));
        let destination = std::env::temp_dir().join(format!("glsp-wal-copy-{}.db", now_stamp()));
        {
            let connection = Connection::open(&source).unwrap();
            connection.pragma_update(None, "journal_mode", "WAL").unwrap();
            connection
                .execute_batch("CREATE TABLE sample (id INTEGER PRIMARY KEY, value TEXT); INSERT INTO sample (value) VALUES ('kept');")
                .unwrap();
            drop(connection);
        }
        copy_database_coherently(&source, &destination).unwrap();
        validate_sqlite_file(&destination).unwrap();
        let connection = Connection::open(&destination).unwrap();
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM sample WHERE value = 'kept'", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);
        fs::remove_file(&source).ok();
        fs::remove_file(&destination).ok();
    }

    /// Creates a fully migrated on-disk database and fills every persisted
    /// feature area so a backup can be checked for completeness.
    fn populated_database(path: &Path) {
        let connection = Connection::open(path).unwrap();
        connection.pragma_update(None, "journal_mode", "WAL").unwrap();
        connection.execute_batch(crate::database::INITIAL_SCHEMA_SQL).unwrap();
        connection
            .execute_batch(
                "INSERT INTO product_groups (id, name) VALUES ('group-1', 'Ring');
                 INSERT INTO main_categories (id, name, product_group_id) VALUES ('category-1', 'Gold', 'group-1');
                 INSERT INTO workshops (id, name) VALUES ('workshop-1', 'Main workshop');
                 INSERT INTO users (id, display_name, username, role, password_hash, password_algorithm, password_version)
                   VALUES ('user-1', 'Admin', 'admin', 'admin', 'hash', 'pbkdf2-sha256', 1);
                 INSERT INTO products (id, product_code, name, product_group_id, main_category_id, workshop_id, purity_per_mille, weight_mg, status)
                   VALUES ('product-1', 'R-001', 'Ring', 'group-1', 'category-1', 'workshop-1', 750, 4385, 'active');
                 INSERT INTO label_templates (id, name, template_kind, width_mm, height_mm, layout_json)
                   VALUES ('template-1', 'Default', 'qr', 50, 30, '{}');
                 INSERT INTO packages (id, package_code, status) VALUES ('package-1', 'PK-001', 'open');
                 INSERT INTO package_items (id, package_id, product_id, scanned_at, weight_mg_snapshot, purity_per_mille_snapshot)
                   VALUES ('item-1', 'package-1', 'product-1', '2026-09-14T00:00:00.000Z', 4385, 750);
                 INSERT INTO return_sessions (id, status, started_at) VALUES ('session-1', 'open', '2026-09-14T00:00:00.000Z');
                 INSERT INTO return_scans (id, return_session_id, product_id, scanned_code, scan_status, weight_mg_snapshot, scanned_at)
                   VALUES ('scan-1', 'session-1', 'product-1', 'R-001', 'accepted', 4385, '2026-09-14T00:00:00.000Z');
                 INSERT INTO device_settings (id, device_type, display_name) VALUES ('device-1', 'scale', 'Scale');
                 INSERT INTO printer_settings (id, printer_name) VALUES (1, 'Zebra ZD421');
                 INSERT INTO scanner_settings (id, scanner_type) VALUES (1, 'QR');
                 INSERT INTO scale_settings (id, scale_model) VALUES (1, 'A&D GX-3002A');
                 INSERT INTO backup_settings (id, is_enabled, interval_minutes) VALUES (1, 1, 1440);
                 INSERT INTO app_settings (setting_key, value_json) VALUES ('settings.ui', '{\"printer.printMode\":\"direct\"}');",
            )
            .unwrap();
    }

    const COVERED_TABLES: [&str; 16] = [
        "product_groups", "main_categories", "workshops", "users", "products", "label_templates",
        "packages", "package_items", "return_sessions", "return_scans", "device_settings",
        "printer_settings", "scanner_settings", "scale_settings", "backup_settings", "app_settings",
    ];

    fn row_counts(path: &Path) -> Vec<(&'static str, i64)> {
        let connection = Connection::open(path).unwrap();
        COVERED_TABLES
            .iter()
            .map(|table| {
                let count: i64 = connection
                    .query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| row.get(0))
                    .unwrap();
                (*table, count)
            })
            .collect()
    }

    #[test]
    fn backup_copies_every_feature_table_coherently() {
        let source = std::env::temp_dir().join(format!("glsp-full-source-{}.db", now_stamp()));
        let destination = std::env::temp_dir().join(format!("glsp-full-backup-{}.db", now_stamp()));
        populated_database(&source);

        copy_database_coherently(&source, &destination).unwrap();

        let original = row_counts(&source);
        let copy = row_counts(&destination);
        assert_eq!(copy, original);
        assert!(copy.iter().all(|(_, count)| *count >= 1), "every table should carry its rows into the backup: {copy:?}");
        assert_eq!(original.len(), 16);

        fs::remove_file(&source).ok();
        fs::remove_file(&destination).ok();
    }

    #[test]
    fn restore_replaces_the_live_database_and_keeps_a_safety_copy() {
        let target = std::env::temp_dir().join(format!("glsp-restore-target-{}.db", now_stamp()));
        let source = std::env::temp_dir().join(format!("glsp-restore-source-{}.db", now_stamp()));
        populated_database(&target);

        // The backup holds a different, older state: no products at all.
        let connection = Connection::open(&source).unwrap();
        connection.execute_batch(crate::database::INITIAL_SCHEMA_SQL).unwrap();
        drop(connection);

        replace_database_with_backup(&target, &source).unwrap();

        validate_sqlite_file(&target).unwrap();
        assert_eq!(row_counts(&target)[4], ("products", 0));

        let safety = fs::read_dir(std::env::temp_dir())
            .unwrap()
            .filter_map(|entry| entry.ok().map(|entry| entry.file_name().to_string_lossy().into_owned()))
            .find(|name| name.starts_with("gold-label-studio-pro.pre-restore"));
        assert!(safety.is_some(), "the active database must be preserved before being overwritten");
        if let Some(name) = safety {
            fs::remove_file(std::env::temp_dir().join(name)).ok();
        }

        fs::remove_file(&target).ok();
        fs::remove_file(&source).ok();
    }

    #[test]
    fn restore_refuses_a_file_that_is_not_a_database() {
        let target = std::env::temp_dir().join(format!("glsp-restore-guard-{}.db", now_stamp()));
        let broken = std::env::temp_dir().join(format!("glsp-restore-broken-{}.db", now_stamp()));
        populated_database(&target);
        fs::write(&broken, b"definitely not a sqlite database").unwrap();

        let error = replace_database_with_backup(&target, &broken).unwrap_err();

        assert!(error.contains("SQLite"));
        assert_eq!(row_counts(&target)[4], ("products", 1)); // live data untouched

        fs::remove_file(&target).ok();
        fs::remove_file(&broken).ok();
    }

    #[test]
    fn copy_reports_a_missing_database_instead_of_creating_one() {
        let missing = std::env::temp_dir().join(format!("glsp-missing-{}.db", now_stamp()));
        let destination = std::env::temp_dir().join(format!("glsp-missing-copy-{}.db", now_stamp()));
        fs::remove_file(&missing).ok();

        let error = copy_database_coherently(&missing, &destination).unwrap_err();

        assert!(error.contains("not found"));
        assert!(!missing.exists(), "a failed backup must not leave an empty database behind");
        assert!(!destination.exists());
    }

    #[test]
    fn copy_refuses_to_overwrite_the_live_database() {
        let live = std::env::temp_dir().join(format!("glsp-live-{}.db", now_stamp()));
        populated_database(&live);

        let error = copy_database_coherently(&live, &live).unwrap_err();

        assert!(error.contains("live database"));
        assert_eq!(row_counts(&live)[4], ("products", 1));
        fs::remove_file(&live).ok();
    }

    #[test]
    fn powershell_encoding_round_trips() {
        let script = "Write-Output 'Gold Label'";
        let encoded = encode_utf16le_base64(script);
        let bytes = base64::engine::general_purpose::STANDARD.decode(encoded).unwrap();
        let units: Vec<u16> = bytes.chunks_exact(2).map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]])).collect();
        let decoded = String::from_utf16(&units).unwrap();
        assert_eq!(decoded, script);
    }
}