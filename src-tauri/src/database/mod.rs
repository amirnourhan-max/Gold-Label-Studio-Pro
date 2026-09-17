mod schema;
pub(crate) mod self_check;

#[cfg(test)]
mod tests;

use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{LazyLock, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use serde_json::json;
use tauri::{AppHandle, Manager};

use schema::SchemaReport;

pub const DATABASE_URL: &str = "sqlite:gold-label-studio-pro.db";
/// The file the SQL plugin resolves `DATABASE_URL` to inside the AppConfig
/// directory. Kept here so the plugin path, the backup path and the self check
/// cannot drift apart.
pub const DATABASE_FILE_NAME: &str = "gold-label-studio-pro.db";
pub const INITIAL_SCHEMA_SQL: &str = include_str!("../../migrations/0001_initial.sql");

/// The interface shows friendly text, so the technical reason is also appended
/// to this file, next to the database. It is what to inspect when a physical
/// machine reports a database problem.
const DIAGNOSTIC_LOG: &str = "diagnostics.jsonl";
const DIAGNOSTIC_LOG_LIMIT: u64 = 1024 * 1024;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseDescriptor {
    pub database_url: String,
    pub database_path: String,
    pub config_directory: String,
    pub data_directory: String,
    pub log_directory: String,
    pub log_path: String,
}

fn descriptor_from_directories(
    config_directory: PathBuf,
    data_directory: PathBuf,
    log_directory: PathBuf,
) -> DatabaseDescriptor {
    let database_path = resolve_database_path(config_directory.clone());
    let log_path = log_directory.join(DIAGNOSTIC_LOG);
    DatabaseDescriptor {
        database_url: DATABASE_URL.to_string(),
        database_path: database_path.display().to_string(),
        config_directory: config_directory.display().to_string(),
        data_directory: data_directory.display().to_string(),
        log_directory: log_directory.display().to_string(),
        log_path: log_path.display().to_string(),
    }
}

pub fn resolve_database_descriptor(app: &AppHandle) -> Result<DatabaseDescriptor, String> {
    let config = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("AppConfig could not be resolved: {error}"))?;
    let data = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("AppData could not be resolved: {error}"))?;
    let logs = app
        .path()
        .app_log_dir()
        .map_err(|error| format!("AppLog could not be resolved: {error}"))?;
    Ok(descriptor_from_directories(config, data, logs))
}

/// Successful initialisations, keyed by database path. A failure is never
/// cached so a retry after the underlying problem is fixed can succeed.
static PREPARED: LazyLock<Mutex<Option<(String, PersistenceStatus)>>> =
    LazyLock::new(|| Mutex::new(None));

/// Result of preparing persistence, reported to the frontend so a failure in an
/// installed build is diagnosable instead of generic.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistenceStatus {
    pub database_url: String,
    pub database_path: String,
    pub directory: String,
    pub config_directory: String,
    pub data_directory: String,
    pub log_directory: String,
    pub log_path: String,
    pub parent_exists: bool,
    pub parent_writable: bool,
    pub database_exists: bool,
    pub database_size: Option<u64>,
    pub initialized: bool,
    pub created_file: bool,
    pub applied_schema: bool,
    pub tables_present: usize,
    pub tables_expected: usize,
    pub integrity: String,
    pub recorded_sqlx_migrations: Vec<i64>,
    pub warnings: Vec<String>,
    pub error_code: Option<String>,
    pub error: Option<String>,
}

impl PersistenceStatus {
    fn ready(descriptor: &DatabaseDescriptor, report: SchemaReport) -> Self {
        let path = PathBuf::from(&descriptor.database_path);
        Self {
            database_url: descriptor.database_url.clone(),
            database_path: report.path.clone(),
            directory: descriptor.config_directory.clone(),
            config_directory: descriptor.config_directory.clone(),
            data_directory: descriptor.data_directory.clone(),
            log_directory: descriptor.log_directory.clone(),
            log_path: descriptor.log_path.clone(),
            parent_exists: path.parent().map(|parent| parent.is_dir()).unwrap_or(false),
            parent_writable: path.parent().map(directory_is_writable).unwrap_or(false),
            database_exists: path.is_file(),
            database_size: fs::metadata(&path).ok().map(|metadata| metadata.len()),
            initialized: true,
            created_file: report.created_file,
            applied_schema: report.applied_schema,
            tables_present: report.tables_present,
            tables_expected: report.tables_expected,
            integrity: report.integrity,
            recorded_sqlx_migrations: report.recorded_sqlx_migrations,
            warnings: report.warnings,
            error_code: None,
            error: None,
        }
    }

    fn failed(descriptor: Option<&DatabaseDescriptor>, code: &str, detail: impl Into<String>) -> Self {
        let path = descriptor
            .map(|descriptor| PathBuf::from(&descriptor.database_path))
            .unwrap_or_default();
        Self {
            database_url: descriptor.map(|value| value.database_url.clone()).unwrap_or_else(|| DATABASE_URL.to_string()),
            database_path: descriptor.map(|value| value.database_path.clone()).unwrap_or_default(),
            directory: descriptor.map(|value| value.config_directory.clone()).unwrap_or_default(),
            config_directory: descriptor.map(|value| value.config_directory.clone()).unwrap_or_default(),
            data_directory: descriptor.map(|value| value.data_directory.clone()).unwrap_or_default(),
            log_directory: descriptor.map(|value| value.log_directory.clone()).unwrap_or_default(),
            log_path: descriptor.map(|value| value.log_path.clone()).unwrap_or_default(),
            parent_exists: path.parent().map(|parent| parent.is_dir()).unwrap_or(false),
            parent_writable: path.parent().map(directory_is_writable).unwrap_or(false),
            database_exists: path.is_file(),
            database_size: fs::metadata(&path).ok().map(|metadata| metadata.len()),
            initialized: false,
            created_file: false,
            applied_schema: false,
            tables_present: 0,
            tables_expected: schema::EXPECTED_TABLES.len(),
            integrity: "unknown".to_string(),
            recorded_sqlx_migrations: Vec::new(),
            warnings: Vec::new(),
            error_code: Some(code.to_string()),
            error: Some(detail.into()),
        }
    }
}

/// Resolves the production database path exactly like the SQL plugin does.
pub fn resolve_database_path(directory: PathBuf) -> PathBuf {
    directory.join(DATABASE_FILE_NAME)
}

fn directory_is_writable(directory: &std::path::Path) -> bool {
    if !directory.is_dir() {
        return false;
    }
    let probe = directory.join(format!(
        ".glsp-write-probe-{}-{}",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0)
    ));
    match fs::OpenOptions::new().write(true).create_new(true).open(&probe) {
        Ok(_) => {
            let _ = fs::remove_file(probe);
            true
        }
        Err(_) => false,
    }
}

fn diagnostic_code_for_schema(code: schema::SchemaFailureCode) -> &'static str {
    match code {
        schema::SchemaFailureCode::DirectoryNotWritable | schema::SchemaFailureCode::DatabaseNotWritable => {
            "DB-PERMISSION"
        }
        schema::SchemaFailureCode::DatabaseCorrupt | schema::SchemaFailureCode::SchemaIncompatible => "DB-SCHEMA",
    }
}

/// Prepares persistence before any query runs: the schema is applied
/// idempotently to whatever database already exists, and a database this version
/// cannot use is reported honestly instead of half-working.
///
/// Safe to call repeatedly and from more than one entry point.
pub fn initialize(app: &AppHandle) -> PersistenceStatus {
    let descriptor = match resolve_database_descriptor(app) {
        Ok(descriptor) => descriptor,
        Err(error) => {
            return PersistenceStatus::failed(
                None,
                "DB-PATH",
                format!("the application directories could not be resolved: {error}"),
            );
        }
    };

    let path = PathBuf::from(&descriptor.database_path);
    let key = descriptor.database_path.clone();

    if let Ok(guard) = PREPARED.lock() {
        if let Some((cached_key, status)) = guard.as_ref() {
            if cached_key == &key {
                return status.clone();
            }
        }
    }

    let status = match schema::ensure_schema(&path) {
        Ok(report) => PersistenceStatus::ready(&descriptor, report),
        Err(failure) => PersistenceStatus::failed(
            Some(&descriptor),
            diagnostic_code_for_schema(failure.code),
            failure.detail,
        ),
    };

    record_diagnostic(app, &status);

    if status.initialized {
        if let Ok(mut guard) = PREPARED.lock() {
            *guard = Some((key, status.clone()));
        }
    }

    status
}

/// Appends one line describing the database outcome next to the application
/// logs. Never fails startup: a missing log directory only means no log.
fn record_diagnostic(app: &AppHandle, status: &PersistenceStatus) {
    let entry = json!({
        "event": "database-bootstrap",
        "applicationVersion": app.package_info().version.to_string(),
        "platform": std::env::consts::OS,
        "databaseUrl": status.database_url,
        "appConfig": status.config_directory,
        "appData": status.data_directory,
        "appLog": status.log_directory,
        "databasePath": status.database_path,
        "parentExists": status.parent_exists,
        "parentWritable": status.parent_writable,
        "databaseExists": status.database_exists,
        "databaseSize": status.database_size,
        "initialized": status.initialized,
        "createdFile": status.created_file,
        "schemaApplied": status.applied_schema,
        "tableCount": status.tables_present,
        "expectedTableCount": status.tables_expected,
        "integrity": status.integrity,
        "recordedMigrations": status.recorded_sqlx_migrations,
        "warnings": status.warnings,
        "diagnosticCode": status.error_code,
        "sqliteMessage": status.error,
    });
    append_diagnostic(app, &entry.to_string());
}

/// Appends one timestamped line next to the database, rotating the file once it
/// grows past the limit. That directory is the one the application already
/// writes to, so the log is available exactly when the database is not.
fn append_diagnostic(app: &AppHandle, entry: &str) {
    let directory = match app.path().app_log_dir() {
        Ok(directory) => directory,
        Err(_) => return,
    };
    let path = directory.join(DIAGNOSTIC_LOG);

    if fs::metadata(&path).map(|metadata| metadata.len()).unwrap_or(0) >= DIAGNOSTIC_LOG_LIMIT {
        let _ = fs::remove_file(&path);
    }
    if fs::create_dir_all(&directory).is_err() {
        return;
    }

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    let line = if entry.trim_start().starts_with('{') {
        let mut value: serde_json::Value = serde_json::from_str(entry).unwrap_or_else(|_| json!({ "message": entry }));
        value["timestampUnix"] = json!(stamp);
        format!("{}\n", value)
    } else {
        format!("{}\n", json!({ "timestampUnix": stamp, "event": "frontend", "message": entry }))
    };

    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&path) {
        let _ = file.write_all(line.as_bytes());
    }
}

/// Reports the state of the production database. The frontend calls this before
/// it opens a connection, so a real failure is never presented as a generic one.
#[tauri::command]
pub fn persistence_status(app: AppHandle) -> PersistenceStatus {
    initialize(&app)
}

/// Lets the frontend add a line to the same diagnostic log when opening or
/// querying the database fails, so an installed build always leaves the real
/// reason on disk. Best effort by design: a logging problem must never replace
/// the failure the user is looking at.
#[tauri::command]
pub fn record_persistence_diagnostic(app: AppHandle, detail: String) {
    let entry = format!("client: {}", detail.trim());
    append_diagnostic(&app, &entry);
}

#[tauri::command]
pub fn open_diagnostic_logs(app: AppHandle) -> Result<(), String> {
    let descriptor = resolve_database_descriptor(&app)?;
    fs::create_dir_all(&descriptor.log_directory)
        .map_err(|error| format!("could not create the log directory: {error}"))?;

    #[cfg(target_os = "windows")]
    let mut command = std::process::Command::new("explorer");
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("open");
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let mut command = std::process::Command::new("xdg-open");

    command
        .arg(&descriptor.log_directory)
        .spawn()
        .map_err(|error| format!("could not open the log directory: {error}"))?;
    Ok(())
}

#[cfg(test)]
mod status_tests {
    use super::*;

    #[test]
    fn a_failed_status_always_carries_a_code_and_a_detail() {
        let descriptor = descriptor_from_directories(
            PathBuf::from("C:\\data"),
            PathBuf::from("C:\\data"),
            PathBuf::from("C:\\data\\logs"),
        );
        let status = PersistenceStatus::failed(
            Some(&descriptor),
            "DB-SCHEMA",
            "integrity check reported: malformed",
        );

        assert!(!status.initialized);
        assert_eq!(status.error_code.as_deref(), Some("DB-SCHEMA"));
        assert_eq!(status.tables_expected, schema::EXPECTED_TABLES.len());
        assert!(status.error.unwrap().contains("integrity"));
    }

    #[test]
    fn the_database_path_matches_the_plugin_connection_string() {
        let path = resolve_database_path(PathBuf::from("C:\\config"));

        assert!(path.ends_with(DATABASE_FILE_NAME));
        assert!(DATABASE_URL.ends_with(DATABASE_FILE_NAME));
    }

    #[test]
    fn descriptor_preserves_spaces_and_unicode_paths() {
        let descriptor = descriptor_from_directories(
            PathBuf::from("C:\\Users\\کاربر فارسی\\AppData\\Roaming\\Gold Label"),
            PathBuf::from("C:\\Users\\کاربر فارسی\\AppData\\Roaming\\Gold Label"),
            PathBuf::from("C:\\Users\\کاربر فارسی\\AppData\\Roaming\\Gold Label\\logs"),
        );

        assert!(descriptor.database_path.contains("کاربر فارسی"));
        assert!(descriptor.database_path.contains("Gold Label"));
        assert!(descriptor.log_path.ends_with(DIAGNOSTIC_LOG));
    }
}
