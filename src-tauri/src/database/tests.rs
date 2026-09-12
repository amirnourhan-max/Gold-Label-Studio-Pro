use rusqlite::{Connection, Error};
use std::{fs, path::PathBuf, process, time::{SystemTime, UNIX_EPOCH}};

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

fn unique_test_database_path() -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock should be after epoch")
        .as_nanos();
    std::env::temp_dir().join(format!("gold-label-catalog-{}-{nanos}.db", process::id()))
}

#[test]
fn product_catalog_survives_database_close_and_restart() {
    let database_path = unique_test_database_path();

    {
        let connection = Connection::open(&database_path).expect("file-backed SQLite should open");
        connection.pragma_update(None, "foreign_keys", "ON").expect("foreign keys should enable");
        connection.execute_batch(INITIAL_SCHEMA_SQL).expect("initial schema should apply");
        connection.execute("INSERT INTO product_groups (id, name, sort_order) VALUES ('group-restart', 'Ring', 0)", []).expect("group should persist");
        connection.execute("INSERT INTO main_categories (id, product_group_id, name, sort_order) VALUES ('category-restart', 'group-restart', 'Women Ring', 0)", []).expect("category should persist");
        connection.execute("INSERT INTO workshops (id, name) VALUES ('workshop-restart', 'Atelier')", []).expect("workshop should persist");
        connection.execute(
            "INSERT INTO products (id, product_code, name, product_group_id, main_category_id, workshop_id, purity_per_mille, weight_mg, stone_weight_mg, quantity, status)
             VALUES ('product-restart', 'R-RESTART-001', 'Persistent Ring', 'group-restart', 'category-restart', 'workshop-restart', 750, 4385, 250, 1, 'active')",
            [],
        ).expect("product should persist");
    }

    {
        let connection = Connection::open(&database_path).expect("database should reopen after restart");
        connection.pragma_update(None, "foreign_keys", "ON").expect("foreign keys should re-enable");
        let stored: (String, i64, i64, String, String, String) = connection.query_row(
            "SELECT p.product_code, p.weight_mg, p.stone_weight_mg, g.name, c.name, w.name
             FROM products p
             JOIN product_groups g ON g.id = p.product_group_id
             JOIN main_categories c ON c.id = p.main_category_id
             JOIN workshops w ON w.id = p.workshop_id
             WHERE p.id = 'product-restart' AND p.deleted_at IS NULL",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?)),
        ).expect("catalog product should remain queryable after restart");
        assert_eq!(stored, ("R-RESTART-001".into(), 4385, 250, "Ring".into(), "Women Ring".into(), "Atelier".into()));
        connection.execute(
            "UPDATE products SET deleted_at = '2026-09-12T00:00:00.000Z', updated_at = '2026-09-12T00:00:00.000Z' WHERE id = 'product-restart'",
            [],
        ).expect("product should soft delete");
    }

    {
        let connection = Connection::open(&database_path).expect("database should reopen a second time");
        let active_count: i64 = connection.query_row("SELECT COUNT(*) FROM products WHERE deleted_at IS NULL", [], |row| row.get(0)).expect("active count should read");
        let history_count: i64 = connection.query_row("SELECT COUNT(*) FROM products WHERE id = 'product-restart'", [], |row| row.get(0)).expect("history count should read");
        assert_eq!(active_count, 0);
        assert_eq!(history_count, 1);
    }

    fs::remove_file(&database_path).expect("temporary SQLite database should be removable");
}
