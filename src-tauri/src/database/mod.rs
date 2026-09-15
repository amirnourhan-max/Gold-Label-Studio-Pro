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
use tauri::{AppHandle, Manager};

use schema::SchemaReport;

pub const DATABASE_URL: &str = "sqlite:gold-label-studio-pro.db";
/// The file the SQL plugin resolves `DATABASE_URL` to inside the AppConfig
/// directory. Kept here so the plugin path, the backup path and the self check
/// cannot drift apart.
pub const DATABASE_FILE_NAME: &str = "gold-label-studio-pro.db";
pub const INITIAL_SCHEMA_SQL: &str = include_str!("../../migrations/0001_initial.sql");

/// The interface shows friendly text, so the technical reason is also appended
/// here. This is the file to inspect when a physical machine reports a database
/// problem.
const DIAGNOSTIC_LOG: &str = "persistence.log";
const DIAGNOSTIC_LOG_LIMIT: u64 = 256 * 1024;

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
    fn ready(directory: String, report: SchemaReport) -> Self {
        Self {
            database_url: DATABASE_URL.to_string(),
            database_path: report.path.clone(),
            directory,
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

    fn failed(directory: String, path: String, code: &str, detail: impl Into<String>) -> Self {
        Self {
            database_url: DATABASE_URL.to_string(),
            database_path: path,
            directory,
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

/// Prepares persistence before any query runs: the schema is applied
/// idempotently to whatever database already exists, and a database this version
/// cannot use is reported honestly instead of half-working.
///
/// Safe to call repeatedly and from more than one entry point.
pub fn initialize(app: &AppHandle) -> PersistenceStatus {
    let directory = match app.path().app_config_dir() {
        Ok(directory) => directory,
        Err(error) => {
            return PersistenceStatus::failed(
                String::new(),
                String::new(),
                "directory-unresolved",
                format!("the application data directory could not be resolved: {error}"),
            );
        }
    };

    let path = resolve_database_path(directory.clone());
    let directory_label = directory.display().to_string();
    let key = path.display().to_string();

    if let Ok(guard) = PREPARED.lock() {
        if let Some((cached_key, status)) = guard.as_ref() {
            if cached_key == &key {
                return status.clone();
            }
        }
    }

    let status = match schema::ensure_schema(&path) {
        Ok(report) => PersistenceStatus::ready(directory_label, report),
        Err(failure) => PersistenceStatus::failed(
            directory_label,
            key.clone(),
            failure.code.label(),
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
    let entry = match (&status.error_code, &status.error) {
        (Some(code), Some(detail)) => format!("[{stamp}] failed ({code}): {detail}\n"),
        _ => format!(
            "[{stamp}] ready: {} — tables {}/{}, integrity {}, created file: {}, warnings {:?}\n",
            status.database_path,
            status.tables_present,
            status.tables_expected,
            status.integrity,
            status.created_file,
            status.warnings
        ),
    };

    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&path) {
        let _ = file.write_all(entry.as_bytes());
    }
}

/// Reports the state of the production database. The frontend calls this before
/// it opens a connection, so a real failure is never presented as a generic one.
#[tauri::command]
pub fn persistence_status(app: AppHandle) -> PersistenceStatus {
    initialize(&app)
}

#[cfg(test)]
mod status_tests {
    use super::*;

    #[test]
    fn a_failed_status_always_carries_a_code_and_a_detail() {
        let status = PersistenceStatus::failed(
            "C:\\data".to_string(),
            "C:\\data\\gold-label-studio-pro.db".to_string(),
            "database-corrupt",
            "integrity check reported: malformed",
        );

        assert!(!status.initialized);
        assert_eq!(status.error_code.as_deref(), Some("database-corrupt"));
        assert_eq!(status.tables_expected, schema::EXPECTED_TABLES.len());
        assert!(status.error.unwrap().contains("integrity"));
    }

    #[test]
    fn the_database_path_matches_the_plugin_connection_string() {
        let path = resolve_database_path(PathBuf::from("C:\\config"));

        assert!(path.ends_with(DATABASE_FILE_NAME));
        assert!(DATABASE_URL.ends_with(DATABASE_FILE_NAME));
    }
}
