//! Deterministic, idempotent schema initialisation for the SQLite database.
//!
//! Schema creation used to belong to the SQL plugin (sqlx migrations). sqlx
//! refuses to open a database whose recorded migration checksum does not match
//! the compiled SQL, and it refuses to re-run a migration whose tables already
//! exist — so a database written by an earlier build became permanently
//! unopenable: the first-run screen appeared and every write failed with a
//! generic "database connection" error.
//!
//! This module owns that job instead. It is idempotent, never deletes or
//! overwrites user data, and reports the exact reason when a database cannot be
//! used so the failure is diagnosable in an installed build.

use std::collections::BTreeMap;
use std::fs::{self, File};
use std::io::Read;
use std::path::Path;

use rusqlite::Connection;
use serde::Serialize;

use super::INITIAL_SCHEMA_SQL;

const SQLITE_HEADER: &[u8] = b"SQLite format 3\0";
/// Recorded in `PRAGMA user_version` so a future schema change can tell an
/// already-initialised database from one that still needs upgrading.
const SCHEMA_VERSION: i64 = 1;

/// Every table the persistence layer expects, in schema-file order.
pub const EXPECTED_TABLES: [&str; 16] = [
    "product_groups",
    "main_categories",
    "workshops",
    "label_templates",
    "users",
    "products",
    "packages",
    "package_items",
    "return_sessions",
    "return_scans",
    "device_settings",
    "printer_settings",
    "scanner_settings",
    "scale_settings",
    "backup_settings",
    "app_settings",
];

/// Machine-readable reason so the UI can show a truthful message instead of a
/// generic one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SchemaFailureCode {
    DirectoryNotWritable,
    DatabaseCorrupt,
    DatabaseNotWritable,
    SchemaIncompatible,
}

impl SchemaFailureCode {
    /// Stable kebab-case label shared with the frontend.
    pub fn label(self) -> &'static str {
        match self {
            Self::DirectoryNotWritable => "directory-not-writable",
            Self::DatabaseCorrupt => "database-corrupt",
            Self::DatabaseNotWritable => "database-not-writable",
            Self::SchemaIncompatible => "schema-incompatible",
        }
    }
}

#[derive(Debug, Clone)]
pub struct SchemaFailure {
    pub code: SchemaFailureCode,
    pub detail: String,
}

impl SchemaFailure {
    fn new(code: SchemaFailureCode, detail: impl Into<String>) -> Self {
        Self {
            code,
            detail: detail.into(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaReport {
    pub path: String,
    pub created_file: bool,
    pub applied_schema: bool,
    pub integrity: String,
    pub tables_present: usize,
    pub tables_expected: usize,
    /// Versions recorded by the sqlx migration table an older build may have
    /// created. Reported for diagnosis only; the schema itself is applied from
    /// `INITIAL_SCHEMA_SQL`.
    pub recorded_sqlx_migrations: Vec<i64>,
    /// Non-blocking differences found between the compiled schema and the
    /// existing database.
    pub warnings: Vec<String>,
}

/// Compares the existing database against the schema this build expects, so a
/// database from an incompatible build is reported instead of half-working.
pub fn ensure_schema(path: &Path) -> Result<SchemaReport, SchemaFailure> {
    if let Some(directory) = path.parent() {
        fs::create_dir_all(directory).map_err(|error| {
            SchemaFailure::new(
                SchemaFailureCode::DirectoryNotWritable,
                format!(
                    "could not create the database directory {}: {error}",
                    directory.display()
                ),
            )
        })?;
    }

    let mut created_file = false;
    if !path.exists() {
        File::create(path).map_err(|error| {
            SchemaFailure::new(
                SchemaFailureCode::DirectoryNotWritable,
                format!("could not create the database file {}: {error}", path.display()),
            )
        })?;
        created_file = true;
    }

    // A zero-length file is what an interrupted first run leaves behind. SQLite
    // opens it as an empty database, so it is treated as a fresh file.
    let size = fs::metadata(path)
        .map_err(|error| {
            SchemaFailure::new(
                SchemaFailureCode::DatabaseNotWritable,
                format!("could not inspect {}: {error}", path.display()),
            )
        })?
        .len();

    let mut integrity = "fresh-database".to_string();
    if size > 0 {
        verify_sqlite_header(path)?;
    }

    let connection = Connection::open(path).map_err(|error| {
        SchemaFailure::new(
            SchemaFailureCode::DatabaseNotWritable,
            format!("could not open {}: {error}", path.display()),
        )
    })?;
    // Startup preparation and a frontend retry can overlap; wait instead of
    // failing on a transient write lock.
    let _ = connection.busy_timeout(std::time::Duration::from_secs(5));

    if size > 0 {
        let reported: String = connection
            .query_row("PRAGMA integrity_check", [], |row| row.get(0))
            .map_err(|error| {
                SchemaFailure::new(
                    SchemaFailureCode::DatabaseCorrupt,
                    format!("integrity check could not run: {error}"),
                )
            })?;
        integrity = reported.trim().to_string();
        if integrity != "ok" {
            return Err(SchemaFailure::new(
                SchemaFailureCode::DatabaseCorrupt,
                format!("integrity check reported: {integrity}"),
            ));
        }
    }

    let recorded_sqlx_migrations = recorded_migration_versions(&connection);

    let expected = expected_structure()?;
    let existing = read_structure(&connection).map_err(|error| {
        SchemaFailure::new(
            SchemaFailureCode::DatabaseNotWritable,
            format!("could not read the database structure: {error}"),
        )
    })?;

    // A table that already exists but lacks columns this version needs can never
    // be completed by re-applying the schema: the compiled batch fails on the
    // first index over a missing column ("no such column"), and that failure
    // says nothing about the real reason. Detect the shape conflict before
    // writing anything, so the problem is reported honestly and the database is
    // left exactly as it was.
    let conflicts = shape_conflicts(&expected, &existing);
    if !conflicts.is_empty() {
        return Err(schema_incompatible(&conflicts));
    }

    // Idempotent: creates whatever is missing and leaves existing tables and
    // rows untouched.
    connection.execute_batch(INITIAL_SCHEMA_SQL).map_err(|error| {
        SchemaFailure::new(
            SchemaFailureCode::DatabaseNotWritable,
            format!("could not apply the persistence schema: {error}"),
        )
    })?;
    let _ = connection.pragma_update(None, "user_version", SCHEMA_VERSION);

    let actual = read_structure(&connection).map_err(|error| {
        SchemaFailure::new(
            SchemaFailureCode::DatabaseNotWritable,
            format!("could not read the database structure: {error}"),
        )
    })?;
    let blocking = blocking_differences(&expected, &actual);

    if !blocking.is_empty() {
        return Err(schema_incompatible(&blocking));
    }

    let warnings = warning_differences(&expected, &actual);
    let tables_present = EXPECTED_TABLES
        .iter()
        .filter(|table| actual.contains_key(**table))
        .count();

    drop(connection);

    Ok(SchemaReport {
        path: path.display().to_string(),
        created_file,
        applied_schema: true,
        integrity,
        tables_present,
        tables_expected: EXPECTED_TABLES.len(),
        recorded_sqlx_migrations,
        warnings,
    })
}

fn verify_sqlite_header(path: &Path) -> Result<(), SchemaFailure> {
    let mut file = File::open(path).map_err(|error| {
        SchemaFailure::new(
            SchemaFailureCode::DatabaseCorrupt,
            format!("could not read {}: {error}", path.display()),
        )
    })?;
    let mut header = [0u8; 16];
    let read = file.read(&mut header).map_err(|error| {
        SchemaFailure::new(
            SchemaFailureCode::DatabaseCorrupt,
            format!("could not read {}: {error}", path.display()),
        )
    })?;

    if read < SQLITE_HEADER.len() || &header[..SQLITE_HEADER.len()] != SQLITE_HEADER {
        return Err(SchemaFailure::new(
            SchemaFailureCode::DatabaseCorrupt,
            format!(
                "{} is not a SQLite database file; it was left untouched",
                path.display()
            ),
        ));
    }

    Ok(())
}

/// Best-effort read of the migration bookkeeping an older build may have
/// written. Any problem here is informational and never blocks startup.
fn recorded_migration_versions(connection: &Connection) -> Vec<i64> {
    let exists: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = '_sqlx_migrations'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if exists == 0 {
        return Vec::new();
    }

    let mut versions = Vec::new();
    if let Ok(mut statement) = connection.prepare("SELECT version FROM _sqlx_migrations ORDER BY version")
    {
        if let Ok(rows) = statement.query_map([], |row| row.get::<_, i64>(0)) {
            versions.extend(rows.filter_map(Result::ok));
        }
    }
    versions
}

/// Table name -> column name -> declared type.
type TableStructure = BTreeMap<String, BTreeMap<String, String>>;

fn read_structure(connection: &Connection) -> rusqlite::Result<TableStructure> {
    let mut statement = connection.prepare(
        "SELECT name FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '_sqlx_migrations'
         ORDER BY name",
    )?;
    let names: Vec<String> = statement
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(statement);

    let mut structure = TableStructure::new();
    for name in names {
        let mut columns = connection.prepare(&format!("PRAGMA table_info(\"{name}\")"))?;
        let declared = columns
            .query_map([], |row| {
                let column: String = row.get(1)?;
                let kind: String = row.get(2)?;
                Ok((column, kind.to_uppercase()))
            })?
            .collect::<rusqlite::Result<BTreeMap<String, String>>>()?;
        structure.insert(name, declared);
    }

    Ok(structure)
}

/// Builds the expected structure from the compiled schema in a scratch database.
fn expected_structure() -> Result<TableStructure, SchemaFailure> {
    let connection = Connection::open_in_memory().map_err(|error| {
        SchemaFailure::new(
            SchemaFailureCode::SchemaIncompatible,
            format!("could not open a scratch database: {error}"),
        )
    })?;
    connection.execute_batch(INITIAL_SCHEMA_SQL).map_err(|error| {
        SchemaFailure::new(
            SchemaFailureCode::SchemaIncompatible,
            format!("the compiled schema could not be applied: {error}"),
        )
    })?;
    read_structure(&connection).map_err(|error| {
        SchemaFailure::new(
            SchemaFailureCode::SchemaIncompatible,
            format!("could not read the compiled schema: {error}"),
        )
    })
}

/// Columns a table the database already has must provide. A missing table is not
/// a conflict: the compiled schema creates it.
fn shape_conflicts(expected: &TableStructure, existing: &TableStructure) -> Vec<String> {
    let mut conflicts = Vec::new();

    for (table, columns) in expected {
        let Some(present) = existing.get(table) else {
            continue;
        };
        for column in columns.keys() {
            if !present.contains_key(column) {
                conflicts.push(format!("missing column {table}.{column}"));
            }
        }
    }

    conflicts
}

fn schema_incompatible(differences: &[String]) -> SchemaFailure {
    SchemaFailure::new(
        SchemaFailureCode::SchemaIncompatible,
        format!(
            "the existing database does not match the schema this version needs and was left untouched: {}. \
             Move it aside (for example rename it to gold-label-studio-pro.backup.db) to start with a fresh database.",
            differences.join(", ")
        ),
    )
}

/// Missing tables or columns break real queries, so they block startup.
fn blocking_differences(expected: &TableStructure, actual: &TableStructure) -> Vec<String> {
    let mut differences = Vec::new();

    for (table, columns) in expected {
        match actual.get(table) {
            None => differences.push(format!("missing table {table}")),
            Some(existing) => {
                for column in columns.keys() {
                    if !existing.contains_key(column) {
                        differences.push(format!("missing column {table}.{column}"));
                    }
                }
            }
        }
    }

    differences
}

/// Extra columns or drifted declared types are tolerated: SQLite applies them
/// with type affinity and no query depends on them being absent.
fn warning_differences(expected: &TableStructure, actual: &TableStructure) -> Vec<String> {
    let mut differences = Vec::new();

    for (table, columns) in expected {
        let Some(existing) = actual.get(table) else {
            continue;
        };
        for (column, kind) in columns {
            match existing.get(column) {
                Some(found) if found != kind => {
                    differences.push(format!("column type differs: {table}.{column} is {found}, expected {kind}"));
                }
                _ => {}
            }
        }
        for column in existing.keys() {
            if !columns.contains_key(column) {
                differences.push(format!("extra column ignored: {table}.{column}"));
            }
        }
    }

    differences
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_path(label: &str) -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should follow the epoch")
            .as_nanos();
        std::env::temp_dir()
            .join(format!("glsp-schema-{label}-{stamp}"))
            .join("gold-label-studio-pro.db")
    }

    fn count(connection: &Connection, sql: &str) -> i64 {
        connection.query_row(sql, [], |row| row.get(0)).unwrap()
    }

    #[test]
    fn creates_a_complete_database_in_a_missing_directory() {
        let path = unique_path("fresh");

        let report = ensure_schema(&path).expect("a fresh database should initialise");

        assert!(report.created_file);
        assert_eq!(report.tables_present, EXPECTED_TABLES.len());
        assert!(path.is_file());

        let connection = Connection::open(&path).unwrap();
        for table in EXPECTED_TABLES {
            assert_eq!(
                count(
                    &connection,
                    &format!("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = '{table}'")
                ),
                1,
                "{table} should exist"
            );
        }

        fs::remove_dir_all(path.parent().unwrap()).ok();
    }

    /// The database written by an earlier build records sqlx migration
    /// bookkeeping. Opening it must never depend on that bookkeeping matching
    /// the compiled SQL again.
    #[test]
    fn opens_an_existing_database_with_stale_sqlx_bookkeeping_and_keeps_its_rows() {
        let path = unique_path("stale-bookkeeping");
        fs::create_dir_all(path.parent().unwrap()).unwrap();

        {
            let connection = Connection::open(&path).unwrap();
            // A database from an older release: schema present, bookkeeping
            // recorded with a checksum this build would never reproduce.
            connection.execute_batch(INITIAL_SCHEMA_SQL).unwrap();
            connection
                .execute_batch(
                    "CREATE TABLE _sqlx_migrations (
                        version BIGINT PRIMARY KEY, description TEXT NOT NULL,
                        installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        success BOOLEAN NOT NULL, checksum BLOB NOT NULL, execution_time BIGINT NOT NULL
                     );
                     INSERT INTO _sqlx_migrations (version, description, success, checksum, execution_time)
                       VALUES (1, 'initial gold label persistence schema', 1, X'00', -1);
                     INSERT INTO users (id, display_name, username, role, password_hash, password_algorithm, password_version)
                       VALUES ('user-1', 'Admin', 'admin', 'admin', 'hash', 'pbkdf2-sha256', 1);",
                )
                .unwrap();
        }

        let report = ensure_schema(&path).expect("an existing database must still open");

        assert!(!report.created_file);
        assert_eq!(report.recorded_sqlx_migrations, vec![1]);

        let connection = Connection::open(&path).unwrap();
        assert_eq!(count(&connection, "SELECT COUNT(*) FROM users"), 1);

        fs::remove_dir_all(path.parent().unwrap()).ok();
    }

    /// Applying the schema twice must not fail and must not touch existing rows.
    #[test]
    fn reapplying_the_schema_is_idempotent_and_preserves_rows() {
        let path = unique_path("idempotent");

        ensure_schema(&path).unwrap();
        {
            let connection = Connection::open(&path).unwrap();
            connection
                .execute(
                    "INSERT INTO users (id, display_name, username, role, password_hash, password_algorithm, password_version)
                     VALUES ('user-1', 'Admin', 'admin', 'admin', 'hash', 'pbkdf2-sha256', 1)",
                    [],
                )
                .unwrap();
        }

        let first = ensure_schema(&path).expect("a second run should succeed");
        let second = ensure_schema(&path).expect("a third run should succeed");

        assert!(!first.created_file);
        assert!(second.applied_schema);
        assert!(second.warnings.is_empty(), "expected no schema drift: {:?}", second.warnings);

        let connection = Connection::open(&path).unwrap();
        assert_eq!(count(&connection, "SELECT COUNT(*) FROM users"), 1);

        fs::remove_dir_all(path.parent().unwrap()).ok();
    }

    /// A partial database (interrupted first run) is completed, not rejected.
    #[test]
    fn completes_a_database_that_is_missing_tables() {
        let path = unique_path("partial");
        fs::create_dir_all(path.parent().unwrap()).unwrap();

        {
            let connection = Connection::open(&path).unwrap();
            // Only the first statement of the schema batch made it to disk.
            let first_table = INITIAL_SCHEMA_SQL
                .split("CREATE TABLE IF NOT EXISTS main_categories")
                .next()
                .unwrap();
            connection.execute_batch(first_table).unwrap();
            connection
                .execute(
                    "INSERT INTO product_groups (id, name) VALUES ('group-1', 'Ring')",
                    [],
                )
                .unwrap();
        }

        let report = ensure_schema(&path).expect("a partial database should be completed");

        assert_eq!(report.tables_present, EXPECTED_TABLES.len());
        let connection = Connection::open(&path).unwrap();
        assert_eq!(count(&connection, "SELECT COUNT(*) FROM product_groups"), 1);

        fs::remove_dir_all(path.parent().unwrap()).ok();
    }

    #[test]
    fn rejects_a_file_that_is_not_a_database_without_touching_it() {
        let path = unique_path("not-sqlite");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, b"definitely not a sqlite database").unwrap();

        let failure = ensure_schema(&path).unwrap_err();

        assert_eq!(failure.code, SchemaFailureCode::DatabaseCorrupt);
        assert_eq!(fs::read(&path).unwrap(), b"definitely not a sqlite database".to_vec());

        fs::remove_dir_all(path.parent().unwrap()).ok();
    }

    #[test]
    fn treats_an_empty_file_left_by_a_failed_run_as_a_fresh_database() {
        let path = unique_path("empty");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, b"").unwrap();

        let report = ensure_schema(&path).expect("an empty file should be initialised");

        assert!(!report.created_file);
        assert_eq!(report.tables_present, EXPECTED_TABLES.len());

        fs::remove_dir_all(path.parent().unwrap()).ok();
    }

    #[test]
    fn reports_a_table_shape_that_cannot_support_the_app() {
        let path = unique_path("incompatible");
        fs::create_dir_all(path.parent().unwrap()).unwrap();

        {
            let connection = Connection::open(&path).unwrap();
            connection
                .execute_batch("CREATE TABLE users (id TEXT PRIMARY KEY, display_name TEXT NOT NULL);")
                .unwrap();
        }

        let failure = ensure_schema(&path).unwrap_err();

        assert_eq!(failure.code, SchemaFailureCode::SchemaIncompatible);
        assert!(failure.detail.contains("users"), "{}", failure.detail);
        // The incompatible database must be preserved exactly as it was.
        let connection = Connection::open(&path).unwrap();
        assert_eq!(count(&connection, "SELECT COUNT(*) FROM users"), 0);
        let columns = read_structure(&connection).unwrap();
        assert!(!columns["users"].contains_key("username"));

        fs::remove_dir_all(path.parent().unwrap()).ok();
    }

    /// The shape conflict is detected before the schema batch runs, so an
    /// incompatible database is never half-migrated: it keeps exactly the
    /// tables it had, and the reason names the columns that are missing.
    #[test]
    fn leaves_an_incompatible_database_completely_untouched() {
        let path = unique_path("untouched");
        fs::create_dir_all(path.parent().unwrap()).unwrap();

        {
            let connection = Connection::open(&path).unwrap();
            connection
                .execute_batch("CREATE TABLE users (id TEXT PRIMARY KEY, display_name TEXT NOT NULL);")
                .unwrap();
        }

        let failure = ensure_schema(&path).unwrap_err();

        assert_eq!(failure.code, SchemaFailureCode::SchemaIncompatible);
        assert!(failure.detail.contains("users.username"), "{}", failure.detail);

        let connection = Connection::open(&path).unwrap();
        // No table or index from the compiled schema may have been applied.
        assert_eq!(
            count(
                &connection,
                "SELECT COUNT(*) FROM sqlite_master WHERE name IN ('products', 'users_active_username_unique')"
            ),
            0
        );
        assert_eq!(count(&connection, "SELECT COUNT(*) FROM users"), 0);

        fs::remove_dir_all(path.parent().unwrap()).ok();
    }
}
