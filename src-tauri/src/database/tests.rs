use std::{fs, time::{SystemTime, UNIX_EPOCH}};

use rusqlite::{Connection, Error};

use super::INITIAL_SCHEMA_SQL;

fn migrated_memory_database() -> Connection {
    let connection = Connection::open_in_memory().expect("in-memory SQLite should open");
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .expect("foreign keys should be enabled");
    connection
        .execute_batch(INITIAL_SCHEMA_SQL)
        .expect("initial schema should apply");
    connection
}

fn insert_catalog_and_product(connection: &Connection) {
    connection
        .execute(
            "INSERT INTO product_groups (id, name) VALUES ('group-1', 'Ring')",
            [],
        )
        .expect("group should insert");
    connection
        .execute(
            "INSERT INTO products (id, product_code, name, product_group_id, purity_per_mille, weight_mg, status)
             VALUES ('product-1', 'R-001', 'Ring', 'group-1', 750, 4385, 'active')",
            [],
        )
        .expect("product should insert");
}

fn insert_package(connection: &Connection) {
    connection
        .execute(
            "INSERT INTO packages (id, package_code, status) VALUES ('package-1', 'PK-001', 'open')",
            [],
        )
        .expect("package should insert");
}

#[test]
fn schema_prevents_duplicate_package_items_and_invalid_relationships() {
    let connection = migrated_memory_database();
    insert_catalog_and_product(&connection);
    insert_package(&connection);

    connection
        .execute(
            "INSERT INTO package_items (id, package_id, product_id, scanned_at, weight_mg_snapshot, purity_per_mille_snapshot)
             VALUES ('item-1', 'package-1', 'product-1', '2026-09-10T00:00:00.000Z', 4385, 750)",
            [],
        )
        .expect("first package item should insert");

    assert!(connection
        .execute(
            "INSERT INTO package_items (id, package_id, product_id, scanned_at, weight_mg_snapshot, purity_per_mille_snapshot)
             VALUES ('item-2', 'package-1', 'product-1', '2026-09-10T00:00:01.000Z', 4385, 750)",
            [],
        )
        .is_err());

    assert!(connection
        .execute(
            "INSERT INTO package_items (id, package_id, product_id, scanned_at, weight_mg_snapshot, purity_per_mille_snapshot)
             VALUES ('item-3', 'missing-package', 'product-1', '2026-09-10T00:00:01.000Z', 4385, 750)",
            [],
        )
        .is_err());
}

#[test]
fn schema_allows_reusing_a_soft_deleted_catalog_name_but_not_an_active_one() {
    let connection = migrated_memory_database();
    connection
        .execute("INSERT INTO workshops (id, name) VALUES ('workshop-1', 'Atelier A')", [])
        .expect("active workshop should insert");

    assert!(connection
        .execute("INSERT INTO workshops (id, name) VALUES ('workshop-2', 'Atelier A')", [])
        .is_err());

    connection
        .execute(
            "UPDATE workshops SET deleted_at = '2026-09-10T00:00:00.000Z' WHERE id = 'workshop-1'",
            [],
        )
        .expect("workshop should soft delete");

    connection
        .execute("INSERT INTO workshops (id, name) VALUES ('workshop-2', 'Atelier A')", [])
        .expect("soft-deleted name should be reusable");
}

#[test]
fn schema_preserves_rejected_return_history_but_blocks_duplicate_accepted_product_scans() {
    let connection = migrated_memory_database();
    insert_catalog_and_product(&connection);
    connection
        .execute(
            "INSERT INTO return_sessions (id, status, started_at) VALUES ('session-1', 'open', '2026-09-10T00:00:00.000Z')",
            [],
        )
        .expect("session should insert");

    connection
        .execute(
            "INSERT INTO return_scans (id, return_session_id, product_id, scanned_code, scan_status, weight_mg_snapshot, scanned_at)
             VALUES ('scan-1', 'session-1', 'product-1', 'R-001', 'accepted', 4385, '2026-09-10T00:00:00.000Z')",
            [],
        )
        .expect("first accepted scan should insert");

    assert!(connection
        .execute(
            "INSERT INTO return_scans (id, return_session_id, product_id, scanned_code, scan_status, weight_mg_snapshot, scanned_at)
             VALUES ('scan-2', 'session-1', 'product-1', 'R-001', 'accepted', 4385, '2026-09-10T00:00:01.000Z')",
            [],
        )
        .is_err());

    connection
        .execute(
            "INSERT INTO return_scans (id, return_session_id, product_id, scanned_code, scan_status, weight_mg_snapshot, scanned_at)
             VALUES ('scan-3', 'session-1', 'product-1', 'R-001', 'duplicate', 4385, '2026-09-10T00:00:01.000Z')",
            [],
        )
        .expect("duplicate event should remain available as history");
}

#[test]
fn schema_enforces_integer_milligram_storage() {
    let connection = migrated_memory_database();
    insert_catalog_and_product(&connection);

    let stored_weight: i64 = connection
        .query_row("SELECT weight_mg FROM products WHERE id = 'product-1'", [], |row| row.get(0))
        .expect("stored weight should read");

    assert_eq!(stored_weight, 4385);
}

#[test]
fn product_persists_after_reopen_and_soft_delete_hides_it() {
    let suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock should follow epoch")
        .as_nanos();
    let path = std::env::temp_dir().join(format!("gold-label-product-{suffix}.sqlite3"));

    {
        let connection = Connection::open(&path).expect("file database should open");
        connection
            .pragma_update(None, "foreign_keys", "ON")
            .expect("foreign keys should be enabled");
        connection
            .execute_batch(INITIAL_SCHEMA_SQL)
            .expect("initial schema should apply");
        connection
            .execute(
                "INSERT INTO products (
                    id, product_code, name, purity_per_mille, weight_mg, stone_weight_mg,
                    quantity, status, created_at, updated_at
                 ) VALUES (
                    'restart-product', 'R-RESTART', 'Restart Ring', 750, 4385, 125,
                    1, 'active', '2026-09-10T00:00:00.000Z', '2026-09-10T00:00:00.000Z'
                 )",
                [],
            )
            .expect("product should insert");
    }

    {
        let connection = Connection::open(&path).expect("database should reopen");
        let stored: (i64, i64, String) = connection
            .query_row(
                "SELECT weight_mg, stone_weight_mg, status
                 FROM products WHERE product_code = 'R-RESTART' AND deleted_at IS NULL",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("product should survive restart");
        assert_eq!(stored, (4385, 125, "active".to_owned()));

        connection
            .execute(
                "UPDATE products SET deleted_at = '2026-09-11T00:00:00.000Z',
                 updated_at = '2026-09-11T00:00:00.000Z'
                 WHERE id = 'restart-product' AND deleted_at IS NULL",
                [],
            )
            .expect("product should soft-delete");
        let active_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL",
                [],
                |row| row.get(0),
            )
            .expect("active product count should read");
        assert_eq!(active_count, 0);
    }

    fs::remove_file(path).expect("temporary database should be removable");
}

#[test]
fn completed_return_session_and_totals_survive_database_restart() {
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after epoch")
        .as_nanos();
    let path = std::env::temp_dir().join(format!("gold-label-returns-{unique}.db"));

    {
        let connection = Connection::open(&path).expect("temporary SQLite file should open");
        connection
            .pragma_update(None, "foreign_keys", "ON")
            .expect("foreign keys should be enabled");
        connection
            .execute_batch(INITIAL_SCHEMA_SQL)
            .expect("initial schema should apply");
        insert_catalog_and_product(&connection);
        connection.execute(
            "INSERT INTO return_sessions (id, status, started_at) VALUES ('session-restart', 'open', '2026-09-10T10:00:00.000Z')",
            [],
        ).expect("return session should insert");
        connection.execute(
            "INSERT INTO return_scans (id, return_session_id, product_id, scanned_code, scan_status, weight_mg_snapshot, scanned_at)
             VALUES ('scan-accepted', 'session-restart', 'product-1', 'R-001', 'accepted', 4385, '2026-09-10T10:01:00.000Z')",
            [],
        ).expect("accepted return should insert");
        connection.execute(
            "INSERT INTO return_scans (id, return_session_id, product_id, scanned_code, scan_status, weight_mg_snapshot, scanned_at)
             VALUES ('scan-duplicate', 'session-restart', 'product-1', 'R-001', 'duplicate', 4385, '2026-09-10T10:02:00.000Z')",
            [],
        ).expect("duplicate history should insert");
        connection.execute(
            "INSERT INTO return_scans (id, return_session_id, scanned_code, scan_status, scanned_at)
             VALUES ('scan-rejected', 'session-restart', 'UNKNOWN', 'rejected', '2026-09-10T10:03:00.000Z')",
            [],
        ).expect("rejected history should insert");
        connection.execute(
            "UPDATE return_sessions SET status = 'completed', ended_at = '2026-09-10T10:04:00.000Z', updated_at = '2026-09-10T10:04:00.000Z'
             WHERE id = 'session-restart'",
            [],
        ).expect("return session should complete");
    }

    {
        let connection = Connection::open(&path).expect("SQLite file should reopen");
        let status: String = connection.query_row(
            "SELECT status FROM return_sessions WHERE id = 'session-restart'", [], |row| row.get(0),
        ).expect("completed session should remain persisted");
        let (items, weight, errors, scans): (i64, i64, i64, i64) = connection.query_row(
            "SELECT
               SUM(CASE WHEN scan_status = 'accepted' THEN 1 ELSE 0 END),
               SUM(CASE WHEN scan_status = 'accepted' THEN weight_mg_snapshot ELSE 0 END),
               SUM(CASE WHEN scan_status IN ('duplicate', 'rejected') THEN 1 ELSE 0 END),
               COUNT(*)
             FROM return_scans WHERE return_session_id = 'session-restart'",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        ).expect("return totals should reload after restart");

        assert_eq!(status, "completed");
        assert_eq!((items, weight, errors, scans), (1, 4385, 2, 3));
    }

    fs::remove_file(&path).expect("temporary SQLite file should be removed");
}

#[test]
fn failed_schema_batch_rolls_back_its_partial_changes() {
    let mut connection = Connection::open_in_memory().expect("in-memory SQLite should open");
    let transaction = connection.transaction().expect("transaction should start");
    let error = transaction.execute_batch("CREATE TABLE transient_table (id INTEGER); INVALID SQL;");

    assert!(error.is_err());
    drop(transaction);

    let table_error = connection.query_row(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'transient_table'",
        [],
        |row| row.get::<_, String>(0),
    );

    assert!(matches!(table_error, Err(Error::QueryReturnedNoRows)));
}
