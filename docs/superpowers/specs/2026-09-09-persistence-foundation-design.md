# Persistence foundation design

## Scope and baseline

This phase starts from `7ed21c0` on `react-tauri-dashboard`. It introduces the local persistence foundation only: SQLite schema, versioned migrations, domain contracts, database adapter, repositories, and automated tests. The approved React UI, its CSS, routes, and mock-driven rendering remain unchanged.

No printing, scale, scanner, printer, backup execution, authentication flow, or user-management behavior is implemented in this phase.

## Database technology and boundary

Use standard SQLite through `tauri-plugin-sql` with its `sqlite` Cargo feature and the `@tauri-apps/plugin-sql` guest binding. Tauri registers the plugin and its migrations in Rust; React components never execute SQL or import the plugin directly.

The frontend owns a `SqlClient` interface with only parameterized `select`, `execute`, `transaction`, and `close` operations. `TauriSqlClient` is the sole production adapter for the SQL plugin. Repositories depend only on `SqlClient`, so replacing the SQLite connection/bootstrap implementation with SQLCipher later does not change repositories or feature code.

The database connection identifier is `sqlite:gold-label-studio-pro.db`, which Tauri resolves relative to its AppConfig directory. The effective Windows location is the application configuration directory, not the executable directory. A database-path provider in Rust centralizes this identifier and documents the expected location for future backup tooling.

## Migration policy

Migrations are embedded SQL files in `src-tauri/migrations/` and registered in `src-tauri/src/database/migrations.rs` with unique, monotonic numeric versions. `0001_initial.sql` is the only migration in this phase.

The plugin applies registered migrations in a transaction. If a statement fails, the migration transaction rolls back; no partially migrated schema is retained. The migration SQL is also exercised against in-memory SQLite in Rust tests, including a repeat-application test and constraint checks.

Every later schema change receives a new file and version. Existing migration files are immutable after release.

## Shared data rules

- Every timestamp is stored as UTC ISO-8601 text (`created_at`, `updated_at`, and applicable lifecycle timestamps). Local-time formatting belongs exclusively in UI utilities introduced later.
- Product weights are stored as integer milligrams (`weight_mg` and `stone_weight_mg`), eliminating floating-point drift for values such as `4.385 g`.
- Catalog and user records use soft deletion: `deleted_at` nullable UTC text, with active queries constrained to `deleted_at IS NULL`.
- Physical deletion is reserved for transient, child-only data that has no business history and is not implemented in this phase.
- Foreign keys are enabled for every database connection. Repository SQL is parameterized; SQL text is never assembled from UI input.
- The frontend mock fixtures remain the current source for approved UI display. The repositories are connected only through isolated contract tests and do not replace UI mock data yet.

## Schema: catalog and inventory

### `product_groups`

`id TEXT PRIMARY KEY`, `name TEXT NOT NULL`, `sort_order INTEGER NOT NULL DEFAULT 0`, `is_active INTEGER NOT NULL DEFAULT 1`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`, `deleted_at TEXT`.

Unique active-name index prevents duplicate group names while retaining historical deleted records.

### `main_categories`

`id TEXT PRIMARY KEY`, `product_group_id TEXT NOT NULL REFERENCES product_groups(id)`, `name TEXT NOT NULL`, lifecycle and audit fields equivalent to `product_groups`.

Unique active `(product_group_id, name)` index prevents duplicate categories within a group.

### `workshops`

`id TEXT PRIMARY KEY`, `name TEXT NOT NULL`, `is_active`, audit fields, and `deleted_at`. A unique active-name index prevents duplicate workshop choices.

### `label_templates`

`id TEXT PRIMARY KEY`, `name TEXT NOT NULL`, `template_kind TEXT NOT NULL`, `width_mm INTEGER NOT NULL`, `height_mm INTEGER NOT NULL`, `layout_json TEXT NOT NULL`, `is_default INTEGER NOT NULL DEFAULT 0`, `is_active INTEGER NOT NULL DEFAULT 1`, audit fields.

The JSON payload is an opaque future label-designer contract; no editor logic is added now.

### `products`

`id TEXT PRIMARY KEY`, `product_code TEXT NOT NULL`, `name TEXT NOT NULL`, `product_group_id`, `main_category_id`, `workshop_id`, `label_template_id`, `purity_per_mille INTEGER NOT NULL`, `weight_mg INTEGER NOT NULL`, `stone_weight_mg INTEGER NOT NULL DEFAULT 0`, `size TEXT`, `quantity INTEGER NOT NULL DEFAULT 1`, `image_path TEXT`, `note TEXT`, `status TEXT NOT NULL`, audit fields, and `deleted_at`.

Checks enforce valid purity range, non-negative weights, positive quantity, and stone weight not exceeding product weight. A unique active-code index prevents a live duplicate product code. FK indexes support catalog joins.

## Schema: packaging and returns

### `packages`

`id TEXT PRIMARY KEY`, `package_code TEXT NOT NULL`, `status TEXT NOT NULL`, `operator_user_id TEXT REFERENCES users(id)`, `item_count INTEGER NOT NULL DEFAULT 0`, `total_weight_mg INTEGER NOT NULL DEFAULT 0`, audit fields, and `closed_at TEXT`.

`package_code` is unique; status is constrained to the defined package lifecycle values.

### `package_items`

`id TEXT PRIMARY KEY`, `package_id TEXT NOT NULL REFERENCES packages(id)`, `product_id TEXT NOT NULL REFERENCES products(id)`, `scanned_at TEXT NOT NULL`, `scanned_by_user_id TEXT REFERENCES users(id)`, `weight_mg_snapshot INTEGER NOT NULL`, `purity_per_mille_snapshot INTEGER NOT NULL`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`.

A unique `(package_id, product_id)` constraint blocks accidental duplicate inclusion of a product in the same package. Snapshot values preserve the packaged facts even if a product is later edited.

### `return_sessions`

`id TEXT PRIMARY KEY`, `status TEXT NOT NULL`, `operator_user_id TEXT REFERENCES users(id)`, `started_at TEXT NOT NULL`, `ended_at TEXT`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`.

### `return_scans`

`id TEXT PRIMARY KEY`, `return_session_id TEXT NOT NULL REFERENCES return_sessions(id)`, `product_id TEXT REFERENCES products(id)`, `scanned_code TEXT NOT NULL`, `scan_status TEXT NOT NULL`, `weight_mg_snapshot INTEGER`, `scanned_at TEXT NOT NULL`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`.

`scan_status` distinguishes accepted, duplicate, and rejected scan records. A partial unique index permits at most one accepted scan for a product per return session, while preserving duplicate/rejected events as audit history. Check constraints require an accepted scan to reference a product and a non-negative snapshot weight.

## Schema: settings and access

### Device configuration

`device_settings` holds common identity and connection-display fields. `printer_settings`, `scanner_settings`, and `scale_settings` each use a singleton `id = 1` and reference their corresponding generic device row. This keeps UI settings distinct while allowing future device-specific configuration without sparse columns.

### Backup and app settings

`backup_settings` is a singleton with enabled state, interval, destination preference, and `last_backup_at`. `app_settings` is key/value JSON with audit fields for simple application-wide options.

The future backup service must use a `BackupPreparation` interface: checkpoint/flush WAL, optionally close the database connection, copy the coherent database set, reopen/verify, and only then report success. It must not assume that copying only the main database file is always sufficient.

### `users`

`id TEXT PRIMARY KEY`, `display_name TEXT NOT NULL`, `username TEXT NOT NULL`, `role TEXT NOT NULL`, `is_active INTEGER NOT NULL DEFAULT 1`, `password_hash TEXT`, `password_algorithm TEXT`, `password_version INTEGER`, audit fields, and `deleted_at`.

Usernames are unique among non-deleted users. Password fields are metadata only in this phase; no plaintext password column, login flow, or hash implementation is added.

## Frontend contracts and repositories

`src/types/persistence.ts` defines persisted rows, input DTOs, lifecycle statuses, UTC timestamp aliases, and `Milligrams` branded helpers. Repository modules define:

- `CatalogRepository` for groups, categories, workshops, and label templates.
- `ProductRepository` for product lookup/list/create contract only.
- `PackageRepository` for packages and package-item reads/creation contract.
- `ReturnRepository` for return-session and return-scan contract.
- `SettingsRepository` for device, backup, and application settings contract.
- `UserRepository` for safe user metadata contract.

Services own use-case composition above repositories. None is imported by a React component in this phase.

## Tests and verification

- Rust migration tests execute the exact embedded `0001_initial.sql` against SQLite in memory.
- Migration tests verify foreign-key enforcement, active uniqueness, soft-deletion behavior, package duplicate prevention, return accepted-scan prevention, and integer weight precision.
- TypeScript tests verify milligram conversion and repository contract parameterization through an in-memory test client, not the Tauri API.
- Existing UI tests, responsive tests, and production frontend build must remain green.
- Windows CI validates Rust tests, Tauri compilation, and the existing executable smoke test.

## Deferred work

Connecting React pages to repositories, data import from mock fixtures, product CRUD, password hashing/login, live device integration, print/scan workflows, backup execution, and SQLCipher are all explicitly deferred.
