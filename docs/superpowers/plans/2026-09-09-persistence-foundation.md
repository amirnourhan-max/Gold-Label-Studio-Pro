# Persistence Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a versioned, testable SQLite persistence foundation for future features without changing the approved React UI or replacing its mock data.

**Architecture:** Rust owns database bootstrap and versioned migrations through `tauri-plugin-sql`; TypeScript receives only a small `SqlClient` abstraction and repositories that depend on it. React components keep reading `displayData` during this phase, so an eventual SQLCipher change is confined to the Tauri connection/bootstrap layer.

**Tech Stack:** Tauri 2, Rust, `tauri-plugin-sql` with SQLite, TypeScript, Vitest, SQLite in-memory migration tests.

**Spec:** `docs/superpowers/specs/2026-09-09-persistence-foundation-design.md`

## Global Constraints

- Start from `7ed21c0` on `react-tauri-dashboard`; work only on `persistence-foundation`.
- Do not modify React page markup, CSS, routes, sidebar, approved UI, or `src/data/mock/*`.
- Store timestamps as UTC ISO-8601 text; the UI will convert them to local time later.
- Store every weight as `INTEGER` milligrams; never use floating-point columns for weight.
- Use soft deletes (`deleted_at`) for products, groups, categories, workshops, and users.
- Migrations are versioned, embedded in Rust, and registered through transactional plugin migrations.
- React never queries SQLite directly; repositories depend only on `SqlClient`.
- Future backups must have a WAL-safe prepare/checkpoint/copy/validate/reopen contract; do not implement backup copying now.
- Passwords must use hash metadata only; raw passwords must never be persisted.
- Retain mock display data until a later feature-by-feature migration.

---

## Planned File Structure

| Path | Responsibility |
| --- | --- |
| `src-tauri/migrations/0001_initial.sql` | First SQLite schema, constraints, indexes, UTC defaults and soft-delete columns. |
| `src-tauri/src/database/mod.rs` | Migration registration and database URL constants. |
| `src-tauri/src/database/migrations.rs` | Embedded migration definitions used by the plugin. |
| `src-tauri/src/database/tests.rs` | In-memory schema, FK, uniqueness, soft-delete and rollback tests. |
| `src-tauri/src/lib.rs` | Register the SQL plugin/migrations; no UI-facing command is added. |
| `src-tauri/Cargo.toml` | SQL plugin and Rust test-only SQLite dependency. |
| `src-tauri/capabilities/default.json` | Minimal SQL plugin permission for the main window. |
| `src/types/persistence.ts` | Database-domain records, DTOs, IDs, statuses and UTC/mg contracts. |
| `src/services/database/sql-client.ts` | Database-independent SQL client interface and transaction result types. |
| `src/services/database/tauri-sql-client.ts` | Only adapter allowed to import the Tauri SQL plugin. |
| `src/services/database/database-bootstrap.ts` | Explicit DB open, `foreign_keys`, WAL and busy-timeout setup. |
| `src/services/database/backup-preparation.ts` | Future-safe backup lifecycle contract only. |
| `src/repositories/*.ts` | Repository contracts and base CRUD/read operations by bounded domain. |
| `src/services/database/*.test.ts` | Adapter/bootstrap and precision contracts using test clients. |
| `src/repositories/*.test.ts` | Repository behavior contracts, including soft-delete filtering and valid bindings. |
| `package.json` | Frontend SQL-plugin package only. |

### Task 1: Define pure persistence contracts and precision helpers

**Files:**
- Create: `src/types/persistence.ts`
- Create: `src/types/persistence.test.ts`
- Create: `src/services/database/sql-client.ts`
- Create: `src/services/database/weight.ts`
- Create: `src/services/database/weight.test.ts`

**Interfaces:**
- Produces `UtcIsoString`, branded milligram type `WeightMg`, `SqlValue`, `SqlClient`, `SqlStatementResult` and database record/insert types.
- Produces `weightMgFromGramText(value: string): WeightMg` and `formatWeightMg(value: WeightMg): string`.

- [ ] **Step 1: Write failing TypeScript contracts and precision tests**

```ts
expect(weightMgFromGramText("4.385")).toBe(4385);
expect(weightMgFromGramText("0.001")).toBe(1);
expect(() => weightMgFromGramText("4.3851")).toThrow("milligram precision");
expect(formatWeightMg(4385 as WeightMg)).toBe("4.385");
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm run test:run -- src/services/database/weight.test.ts src/types/persistence.test.ts`

Expected: FAIL because the persistence contracts and helpers do not yet exist.

- [ ] **Step 3: Implement the smallest pure contract layer**

```ts
export type SqlValue = string | number | null;
export interface SqlClient {
  select<T>(sql: string, bindValues?: readonly SqlValue[]): Promise<readonly T[]>;
  execute(sql: string, bindValues?: readonly SqlValue[]): Promise<SqlStatementResult>;
  transaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
```

Parse grams as a decimal string, pad its fractional part to three digits, reject non-numeric/negative values and fractions longer than three digits; do not convert through floating point.

- [ ] **Step 4: Run focused tests and TypeScript build**

Run: `npm run test:run -- src/services/database/weight.test.ts src/types/persistence.test.ts && npm run build`

Expected: PASS with no UI file changes.

- [ ] **Step 5: Commit the pure contracts**

```bash
git add src/types/persistence.ts src/types/persistence.test.ts src/services/database/sql-client.ts src/services/database/weight.ts src/services/database/weight.test.ts
git commit -m "feat: add persistence contracts"
```

### Task 2: Add transactional SQLite migration and Tauri bootstrap registration

**Files:**
- Create: `src-tauri/migrations/0001_initial.sql`
- Create: `src-tauri/src/database/mod.rs`
- Create: `src-tauri/src/database/migrations.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/capabilities/default.json`
- Test: `src-tauri/src/database/tests.rs`

**Interfaces:**
- Consumes: the `DATABASE_URL` constant and Rust migration list defined in `database/migrations.rs`.
- Produces `pub const DATABASE_URL: &str = "sqlite:gold-label-studio-pro.db";` and `pub fn migrations() -> Vec<tauri_plugin_sql::Migration>`.

- [ ] **Step 1: Write failing Rust migration tests**

```rust
#[test]
fn creates_schema_and_rejects_duplicate_package_items() {
    let connection = migrated_memory_database();
    insert_product_and_package(&connection);
    assert!(insert_package_item(&connection).is_ok());
    assert!(insert_package_item(&connection).is_err());
}

#[test]
fn failed_migration_rolls_back_all_schema_changes() {
    let connection = Connection::open_in_memory().unwrap();
    assert!(apply_transactionally(&connection, "CREATE TABLE ok(id INTEGER); INVALID SQL;").is_err());
    assert!(!table_exists(&connection, "ok"));
}
```

- [ ] **Step 2: Run Rust tests and verify failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml database::tests`

Expected: FAIL because no database module, schema, test harness, or SQLite test dependency exists.

- [ ] **Step 3: Implement the versioned schema and registration**

Create `0001_initial.sql` with:

```sql
CREATE TABLE product_groups (..., created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT);
CREATE UNIQUE INDEX product_groups_active_name_unique
  ON product_groups(name) WHERE deleted_at IS NULL;
CREATE TABLE package_items (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  weight_mg INTEGER NOT NULL CHECK (weight_mg >= 0),
  created_at TEXT NOT NULL,
  UNIQUE (package_id, product_id)
);
```

Include all approved entities, FK/index/check constraints, UTC defaults, update triggers where appropriate, active-name partial unique indexes, `return_sessions`, and the partial unique accepted-return index. Embed the SQL with `include_str!`, register it through `tauri_plugin_sql::Builder::add_migrations`, then add the plugin to the Tauri builder. Use the plugin’s transactional migration mechanism; the test helper explicitly proves rollback behavior.

- [ ] **Step 4: Run migration tests and Rust formatting**

Run: `cargo fmt --manifest-path src-tauri/Cargo.toml --check && cargo test --manifest-path src-tauri/Cargo.toml database::tests`

Expected: PASS; schema supports soft deletes, blocks invalid FKs/duplicate package items and duplicate accepted return scans, and transaction rollback leaves no partial table.

- [ ] **Step 5: Commit schema and bootstrap**

```bash
git add src-tauri/Cargo.toml src-tauri/capabilities/default.json src-tauri/migrations/0001_initial.sql src-tauri/src/database src-tauri/src/lib.rs
git commit -m "feat: add sqlite migration foundation"
```

### Task 3: Implement the isolated Tauri SQL adapter and bootstrap policy

**Files:**
- Create: `src/services/database/tauri-sql-client.ts`
- Create: `src/services/database/database-bootstrap.ts`
- Create: `src/services/database/backup-preparation.ts`
- Create: `src/services/database/database-bootstrap.test.ts`
- Create: `src/services/database/backup-preparation.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes `SqlClient` from `sql-client.ts`.
- Produces `openPersistenceDatabase(): Promise<SqlClient>` and `BackupPreparation` with `prepare`, `validateCopiedBackup`, and `reopen` method contracts.

- [ ] **Step 1: Write failing adapter/bootstrap contract tests**

```ts
await openWithClient(recordingClient);
expect(recordingClient.executeCalls).toEqual([
  ["PRAGMA foreign_keys = ON", []],
  ["PRAGMA journal_mode = WAL", []],
  ["PRAGMA busy_timeout = 5000", []],
]);
expect(backupPreparation.copyDatabase).toBeUndefined();
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm run test:run -- src/services/database/database-bootstrap.test.ts src/services/database/backup-preparation.test.ts`

Expected: FAIL because the SQL adapter and backup contract are not implemented.

- [ ] **Step 3: Implement the adapter boundary and WAL policy**

Install `@tauri-apps/plugin-sql`; only `tauri-sql-client.ts` imports it. `openPersistenceDatabase` dynamically loads the configured database, then enables FK enforcement, WAL and busy timeout through `SqlClient`. Define backup preparation as a type-only lifecycle that will later checkpoint/flush, coordinate a coherent copy, validate and reopen; it must not copy any file in this phase.

- [ ] **Step 4: Run focused tests and frontend build**

Run: `npm run test:run -- src/services/database/database-bootstrap.test.ts src/services/database/backup-preparation.test.ts && npm run build`

Expected: PASS; no React component imports the adapter.

- [ ] **Step 5: Commit adapter isolation**

```bash
git add package.json package-lock.json src/services/database/tauri-sql-client.ts src/services/database/database-bootstrap.ts src/services/database/backup-preparation.ts src/services/database/database-bootstrap.test.ts src/services/database/backup-preparation.test.ts
git commit -m "feat: add database client boundary"
```

### Task 4: Add repository contracts and base implementations

**Files:**
- Create: `src/repositories/catalog-repository.ts`
- Create: `src/repositories/product-repository.ts`
- Create: `src/repositories/package-repository.ts`
- Create: `src/repositories/return-repository.ts`
- Create: `src/repositories/settings-repository.ts`
- Create: `src/repositories/user-repository.ts`
- Create: `src/repositories/test-support/recording-sql-client.ts`
- Create: `src/repositories/*.test.ts`

**Interfaces:**
- Consumes `SqlClient`, `WeightMg`, UTC record and input types.
- Produces repositories whose public methods use typed inputs/results and always bind values rather than interpolate data.

- [ ] **Step 1: Write failing repository contract tests**

```ts
await products.listActive();
expect(client.lastSelect.sql).toContain("WHERE deleted_at IS NULL");

await packages.addItem({ packageId: "pkg-1", productId: "product-1", weightMg: 4385 as WeightMg, createdAt: now });
expect(client.lastExecute.bindValues).toEqual(["item-1", "pkg-1", "product-1", 4385, now]);

await users.softDelete("user-1", now);
expect(client.lastExecute.sql).toContain("SET deleted_at = ?, updated_at = ?");
```

- [ ] **Step 2: Run focused repository tests and verify failure**

Run: `npm run test:run -- src/repositories`

Expected: FAIL because repository modules do not exist.

- [ ] **Step 3: Implement minimal typed repositories**

Add only persistence-ready methods required by the schema contracts: active catalog reads and soft delete, product active reads/create/soft delete, package creation/item insertion, return-session scan insertion, settings upsert/read and user active reads/create/soft delete. Add all timestamp values at the repository boundary in UTC, bind every SQL parameter, preserve accepted/rejected return history, and never accept a raw password field—only `passwordHash` and `passwordHashAlgorithm`.

- [ ] **Step 4: Run repository/precision tests and full frontend test suite**

Run: `npm run test:run -- src/repositories src/services/database/weight.test.ts && npm run test:run`

Expected: PASS; `displayData` tests continue to prove approved mocks remain intact.

- [ ] **Step 5: Commit repository layer**

```bash
git add src/repositories src/types/persistence.ts
git commit -m "feat: add persistence repositories"
```

### Task 5: Verify isolation, build, documentation and final commit

**Files:**
- Modify: `docs/superpowers/specs/2026-09-09-persistence-foundation-design.md` only if implementation uncovers a factual correction.
- Modify: `docs/superpowers/plans/2026-09-09-persistence-foundation.md` to check completed boxes.

**Interfaces:**
- Consumes all prior tasks.
- Produces an evidence-backed persistence-foundation commit with UI mocks still active.

- [ ] **Step 1: Add/adjust isolation verification**

```ts
expect(readFileSync("src/services/display-data.ts", "utf8")).not.toContain("openPersistenceDatabase");
expect(readFileSync("src/features/operations/ReturnsPage.tsx", "utf8")).not.toContain("plugin-sql");
```

Keep the test scoped to the explicit architecture boundary, not UI markup.

- [ ] **Step 2: Run complete required verification**

Run:

```bash
npm run test:run
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build -- --no-bundle
```

Expected: frontend test/build and Rust migration tests pass. If this environment lacks Rust/Cargo, record the exact environmental failure after running the command; do not claim a local Tauri build passed without evidence.

- [ ] **Step 3: Perform static policy checks**

Run:

```bash
rg -n "خروج کالا|reports" src src-tauri
rg -n "plugin-sql|@tauri-apps/plugin-sql" src --glob '!src/services/database/tauri-sql-client.ts'
git diff --check origin/react-tauri-dashboard...HEAD
```

Expected: no user-visible legacy “خروج کالا”, no report route/UI, no plugin imports outside the adapter, and no whitespace errors.

- [ ] **Step 4: Commit final plan state and implementation metadata**

```bash
git add docs/superpowers/plans/2026-09-09-persistence-foundation.md docs/superpowers/specs/2026-09-09-persistence-foundation-design.md
git commit -m "docs: record persistence verification"
```

- [ ] **Step 5: Publish only after verification**

Push `persistence-foundation` for review; do not update `main` and do not wire the UI to the new repositories.

## Self-Review

- UTC timestamps, integer milligrams, partial soft-delete indexes, transactional migrations, FK/unique/check constraints, backup-safe WAL contract, SQL isolation, mocks retained and SQLCipher substitution boundary are each covered in Tasks 1–5.
- The plan contains no unassigned implementation placeholders; deferred production operations are intentionally out of scope rather than missing tasks.
- Public names (`SqlClient`, `WeightMg`, `openPersistenceDatabase`, `BackupPreparation`) are defined before any task consumes them.
