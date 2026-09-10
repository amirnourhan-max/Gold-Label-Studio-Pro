use tauri_plugin_sql::{Migration, MigrationKind};

use super::INITIAL_SCHEMA_SQL;

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "initial gold label persistence schema",
        sql: INITIAL_SCHEMA_SQL,
        kind: MigrationKind::Up,
    }]
}
