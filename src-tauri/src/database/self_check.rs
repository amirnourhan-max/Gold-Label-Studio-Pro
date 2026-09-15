//! Installed-build database self check.
//!
//! Physical Windows machines cannot be driven by CI, so the packaged
//! application can verify its own persistence path: `--database-self-check`
//! initialises the real production database, inserts a user row with the exact
//! statement shape the repository uses, reopens the file to prove the row
//! survived, and removes it again. The report is written as JSON so an installer
//! smoke test (and a support request) can read the outcome.

use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{params, Connection};
use serde::Serialize;
use tauri::{AppHandle, Manager};

use super::schema::{self, SchemaReport};
use super::DATABASE_FILE_NAME;

const CHECK_USER_ID: &str = "self-check-user";
const CHECK_USERNAME: &str = "__self_check__";
const CHECK_TIMESTAMP: &str = "2026-01-01T00:00:00.000Z";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelfCheckReport {
    pub passed: bool,
    pub database_path: String,
    pub directory: String,
    pub schema: Option<SchemaReport>,
    pub schema_error: Option<String>,
    pub inserted_user: bool,
    pub user_survived_reopen: bool,
    pub cleaned_up: bool,
    pub error: Option<String>,
}

/// Reads `--database-self-check[=<path>]` from the process arguments.
pub fn requested_report_path() -> Option<PathBuf> {
    let mut arguments = std::env::args().skip(1);

    while let Some(argument) = arguments.next() {
        if let Some(value) = argument.strip_prefix("--database-self-check=") {
            return Some(PathBuf::from(value.trim_matches('"')));
        }
        if argument == "--database-self-check" {
            return match arguments.next() {
                Some(value) if !value.starts_with("--") => Some(PathBuf::from(value.trim_matches('"'))),
                _ => Some(std::env::temp_dir().join("glsp-database-self-check.json")),
            };
        }
    }

    None
}

/// Runs the check and writes the report. Returns the process exit code.
pub fn run(app: &AppHandle, report_path: &Path) -> i32 {
    let report = evaluate(app);

    if let Some(parent) = report_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let serialized = serde_json::to_string_pretty(&report)
        .unwrap_or_else(|error| format!("{{\"passed\":false,\"error\":\"{error}\"}}"));
    let _ = fs::write(report_path, serialized);

    if report.passed {
        0
    } else {
        1
    }
}

fn evaluate(app: &AppHandle) -> SelfCheckReport {
    let mut report = SelfCheckReport {
        passed: false,
        database_path: String::new(),
        directory: String::new(),
        schema: None,
        schema_error: None,
        inserted_user: false,
        user_survived_reopen: false,
        cleaned_up: false,
        error: None,
    };

    // Same resolution the SQL plugin performs for `sqlite:gold-label-studio-pro.db`.
    let directory = match app.path().app_config_dir() {
        Ok(directory) => directory,
        Err(error) => {
            report.error = Some(format!("application data directory could not be resolved: {error}"));
            return report;
        }
    };
    let path = directory.join(DATABASE_FILE_NAME);
    report.directory = directory.display().to_string();
    report.database_path = path.display().to_string();

    match schema::ensure_schema(&path) {
        Ok(schema_report) => report.schema = Some(schema_report),
        Err(failure) => {
            report.schema_error = Some(format!("{}: {}", failure.code.label(), failure.detail));
            return report;
        }
    }

    match insert_check_user(&path) {
        Ok(()) => report.inserted_user = true,
        Err(error) => {
            report.error = Some(error);
            return report;
        }
    }

    match verify_and_cleanup(&path) {
        Ok((survived, cleaned)) => {
            report.user_survived_reopen = survived;
            report.cleaned_up = cleaned;
        }
        Err(error) => {
            report.error = Some(error);
            return report;
        }
    }

    if !report.user_survived_reopen {
        report.error = Some("the user row did not survive reopening the database".to_string());
    } else if !report.cleaned_up {
        report.error = Some("the self-check row could not be removed".to_string());
    }

    report.passed = report.user_survived_reopen && report.cleaned_up;
    report
}

/// Mirrors `UserRepository.create`, so the first administrator insert path is
/// exercised against the real production database.
fn insert_check_user(path: &Path) -> Result<(), String> {
    let connection = Connection::open(path)
        .map_err(|error| format!("could not open the database for writing: {error}"))?;
    let _ = connection.execute(
        "DELETE FROM users WHERE id = ?1 OR username = ?2",
        params![CHECK_USER_ID, CHECK_USERNAME],
    );
    connection
        .execute(
            "INSERT INTO users (
                id, display_name, username, role, password_hash, password_algorithm, password_version,
                created_at, updated_at
             ) VALUES (?1, ?2, ?3, 'admin', ?4, 'pbkdf2-sha256', 1, ?5, ?5)",
            params![
                CHECK_USER_ID,
                "Self check",
                CHECK_USERNAME,
                "self-check-digest",
                CHECK_TIMESTAMP
            ],
        )
        .map_err(|error| format!("the administrator insert failed: {error}"))?;
    Ok(())
}

/// Reopens the file, proves the row persisted, then removes it.
fn verify_and_cleanup(path: &Path) -> Result<(bool, bool), String> {
    let connection = Connection::open(path)
        .map_err(|error| format!("could not reopen the database: {error}"))?;
    let survived = connection
        .query_row(
            "SELECT COUNT(*) FROM users WHERE id = ?1",
            params![CHECK_USER_ID],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| format!("could not read the self-check row: {error}"))?
        == 1;

    connection
        .execute("DELETE FROM users WHERE id = ?1", params![CHECK_USER_ID])
        .map_err(|error| format!("could not remove the self-check row: {error}"))?;
    let remaining = connection
        .query_row(
            "SELECT COUNT(*) FROM users WHERE id = ?1",
            params![CHECK_USER_ID],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| format!("could not confirm the cleanup: {error}"))?;

    Ok((survived, remaining == 0))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_path() -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should follow the epoch")
            .as_nanos();
        std::env::temp_dir()
            .join(format!("glsp-self-check-{stamp}"))
            .join(DATABASE_FILE_NAME)
    }

    #[test]
    fn insert_and_cleanup_round_trip_leaves_no_rows_behind() {
        let path = unique_path();
        schema::ensure_schema(&path).expect("fresh database should initialise");

        insert_check_user(&path).expect("the administrator insert should succeed");
        let (survived, cleaned) = verify_and_cleanup(&path).expect("verification should run");

        assert!(survived, "the row must persist across a reconnect");
        assert!(cleaned, "the self-check row must be removed");

        let connection = Connection::open(&path).unwrap();
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);

        fs::remove_dir_all(path.parent().unwrap()).ok();
    }

    #[test]
    fn normal_startup_does_not_request_a_self_check() {
        // This test binary is launched without the flag, exactly like the
        // installed application during a normal launch.
        assert!(requested_report_path().is_none());
    }
}
