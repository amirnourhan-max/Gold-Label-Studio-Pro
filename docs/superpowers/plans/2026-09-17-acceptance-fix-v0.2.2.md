# Gold Label Studio Pro v0.2.2 Acceptance Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make first-run persistence diagnosable and reliable in the packaged Windows application while adding compact authentication window modes and a production-path installed-app acceptance test.

**Architecture:** Rust owns database/log path resolution, schema verification, and sanitized persistent diagnostics. The frontend asks Rust for the authoritative database descriptor, opens that exact logical database through the SQL plugin, proves the plugin's physical file matches Rust with `PRAGMA database_list`, and exposes failures as a typed startup state. A single Tauri window transitions between compact authentication and normal workspace modes.

**Tech Stack:** React 19, TypeScript 5.7, Vitest, Tauri 2, Rust 2021, rusqlite (bundled SQLite), tauri-plugin-sql/sqlx, GitHub Actions on Windows.

**Spec:** `docs/superpowers/specs/2026-09-17-acceptance-fix-v0.2.2.md`

## Global Constraints

- Baseline is `final-audit-release@5878aad66e60bc623a9837501da962afd1b8d70b`; work only on `acceptance-fix-v0.2.2`.
- Never delete, recreate, or overwrite an existing database automatically.
- Keep SQLite embedded; users install no external SQLite runtime.
- Never log plaintext passwords, hashes, salts, secrets, or raw SQL bind values.
- Keep `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`.
- Keep `decorations: false` and use the same native window for auth and workspace.
- Preserve approved workspace behavior at 1366×768, 1440×900, 1536×864, 1600×900, and 1920×1080.
- Auth layouts must remain usable at 100%, 125%, and 150% DPI.
- Use TDD for every behavior change and do not weaken existing tests.
- A green CI run does not prove the physical Windows machine is fixed; the final report must say physical verification is pending.

---

### Task 1: Authoritative database descriptor and diagnostic model

**Files:**
- Modify: `src-tauri/src/database/mod.rs`
- Modify: `src-tauri/src/database/schema.rs`
- Modify: `src-tauri/src/database/tests.rs`
- Modify: `src-tauri/src/hardware.rs`
- Test: `src-tauri/src/database/mod.rs` unit tests
- Test: `src-tauri/src/database/tests.rs`

**Interfaces:**
- Produces: `DatabaseDescriptor { database_url, database_path, config_directory, data_directory, log_directory, log_path }`.
- Produces: stable `DiagnosticCode` values `DB-PATH`, `DB-OPEN`, `DB-PERMISSION`, `DB-SCHEMA`, `DB-MIGRATION`, `DB-USER-INSERT`.
- Produces: `resolve_database_descriptor(&AppHandle) -> Result<DatabaseDescriptor, DiagnosticFailure>` used by startup, backup, restore, and commands.
- Produces: `append_event(&AppHandle, DiagnosticEvent)` with field allow-listing and no secret-bearing fields.

- [ ] **Step 1: Write failing Rust tests for path identity and error codes**

Add tests proving path resolution preserves directory names containing spaces and `کاربر فارسی`, every failure serializes a stable `DB-*` code, and backup resolution consumes the same descriptor rather than its own AppConfig/AppData search.

- [ ] **Step 2: Run the focused Rust tests and verify RED in Windows CI or a Rust-capable environment**

Run: `cargo test --manifest-path src-tauri/Cargo.toml database:: -- --nocapture`

Expected: compile/test failures because the descriptor and diagnostic-code contract do not exist yet.

- [ ] **Step 3: Implement the single resolver and sanitized structured log**

Resolve AppConfig, AppData, and AppLog once; create the database parent and log directory independently; use `gold-label-studio-pro.db` in AppConfig as the authoritative database; write bounded JSON-lines events containing application version, timestamp, OS, resolved directories, file existence/size, writability probe result, open/schema/table/users-column/migration results, and sanitized SQLite code/message.

- [ ] **Step 4: Route backup and restore through the descriptor**

Remove `hardware.rs`'s AppConfig/AppData fallback search. Backup, restore, bootstrap, self-check, and diagnostics must all consume the same authoritative resolved file without moving or deleting an existing file.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `cargo test --manifest-path src-tauri/Cargo.toml database:: hardware::tests -- --nocapture`

- [ ] **Step 6: Commit**

Commit: `fix(database): establish authoritative paths and diagnostics`

### Task 2: Prove Tauri SQL opens the authoritative physical database

**Files:**
- Modify: `src-tauri/src/database/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/services/database/persistence-failure.ts`
- Modify: `src/services/database/database-bootstrap.ts`
- Modify: `src/services/database/tauri-sql-client.ts`
- Test: `src/services/database/database-bootstrap.test.ts`
- Test: `src/services/database/persistence-preparation.test.ts`
- Test: `src/services/database/persistence-isolation.test.ts`

**Interfaces:**
- Consumes: `DatabaseDescriptor` and Rust database diagnostics from Task 1.
- Produces: `database_descriptor` Tauri command returning the URL and expected physical path.
- Produces: `verifyOpenedDatabase(client, descriptor)` that reads `PRAGMA database_list`, normalizes the reported main-file path, and compares it to Rust's expected path.
- Produces: typed `PersistenceFailure` with a stable diagnostic code and sanitized technical details.

- [ ] **Step 1: Write failing TypeScript tests for descriptor-first open and physical-path mismatch**

Cover a successful exact match, Windows case/separator normalization, spaces, Persian characters, missing `main` row, plugin load error, path mismatch (`DB-PATH`), and configuration failures (`DB-OPEN`).

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm run test:run -- src/services/database/database-bootstrap.test.ts src/services/database/persistence-preparation.test.ts src/services/database/persistence-isolation.test.ts`

Expected: failures because the frontend still uses the hard-coded URL and never verifies the physical file.

- [ ] **Step 3: Implement descriptor-first open and plugin path proof**

Call the Rust descriptor/status command before `Database.load`; use its database URL; configure the connection; select `PRAGMA database_list`; reject any mismatch before repositories are constructed. Record the failing boundary and sanitized plugin/SQLite message in the persistent log.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the focused command from Step 2 and require zero failures.

- [ ] **Step 5: Commit**

Commit: `fix(database): verify the plugin opens the authoritative file`

### Task 3: Preserve the real first-admin failure and model startup explicitly

**Files:**
- Modify: `src/services/users/user-service.ts`
- Modify: `src/services/users/session-bootstrap.ts`
- Modify: `src/services/users/user-gateway.ts`
- Modify: `src/features/auth/auth-session.tsx`
- Modify: `src/features/auth/AuthGate.tsx`
- Test: `src/services/users/user-service.test.ts`
- Test: `src/services/users/session-bootstrap.test.ts`
- Test: `src/features/auth/AuthGate.test.tsx`
- Test: `src/features/auth/auth-failure-messages.test.ts`

**Interfaces:**
- Consumes: typed `PersistenceFailure` from Task 2.
- Produces: startup state union `loading | first-run | login | database-error | authenticated`.
- Produces: retryable `DatabaseErrorState { code, friendlyMessage, technicalDetails, logPath }`.
- Produces: sanitized `record_first_admin_failure` diagnostic call at the exact failed boundary.

- [ ] **Step 1: Write failing tests for fail-closed startup**

Prove an unavailable database renders only `database-error`, never First Run; a healthy empty users table renders First Run; a healthy table with credentials renders Login; an insert failure retains its stable code/detail and emits a sanitized diagnostic; retry re-runs bootstrap.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm run test:run -- src/services/users/user-service.test.ts src/services/users/session-bootstrap.test.ts src/features/auth/AuthGate.test.tsx src/features/auth/auth-failure-messages.test.ts`

- [ ] **Step 3: Implement typed startup and failure propagation**

Stop treating `unavailableReason + hasCredentials=false` as First Run. Keep repository/insert errors typed through `UserService` instead of replacing them with `ذخیره تغییرات کاربر ناموفق بود`, and log only sanitized codes/messages—never inputs or password material.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the focused command from Step 2 and require zero failures.

- [ ] **Step 5: Commit**

Commit: `fix(auth): block first run when persistence is unhealthy`

### Task 4: Dedicated Database Error screen

**Files:**
- Create: `src/features/auth/DatabaseErrorPage.tsx`
- Create: `src/features/auth/DatabaseErrorPage.test.tsx`
- Create: `src/features/auth/AuthWindowChrome.tsx`
- Create: `src/features/auth/AuthWindowChrome.test.tsx`
- Modify: `src/features/auth/AuthGate.tsx`
- Modify: `src/features/auth/login-page.css`
- Modify: `src-tauri/src/database/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

**Interfaces:**
- Consumes: `DatabaseErrorState` and retry callback from Task 3.
- Produces: `DatabaseErrorPage` with Retry, Copy technical details, Exit, and Open logs folder.
- Produces: `open_diagnostic_logs` Tauri command.
- Produces: reusable `AuthWindowChrome` with draggable region, minimize, and close.

- [ ] **Step 1: Write failing UI tests**

Assert Persian friendly text, stable `DB-*` code, technical-details copy payload, retry callback, `open_diagnostic_logs`, `getCurrentWindow().minimize()`, `getCurrentWindow().close()`, and `data-tauri-drag-region`.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm run test:run -- src/features/auth/DatabaseErrorPage.test.tsx src/features/auth/AuthWindowChrome.test.tsx src/features/auth/LoginPage.test.tsx`

- [ ] **Step 3: Implement the shared auth chrome and error page**

Reuse the existing Tauri window-control behavior, omit maximize in compact mode, stop pointer events from starting a drag, and use the Rust command to open the exact per-user log directory.

- [ ] **Step 4: Run tests and verify GREEN**

Run the focused command from Step 2 and require zero failures.

- [ ] **Step 5: Commit**

Commit: `feat(auth): add database error recovery screen`

### Task 5: Compact auth window and workspace transition

**Files:**
- Create: `src/features/auth/window-mode.ts`
- Create: `src/features/auth/window-mode.test.ts`
- Modify: `src/features/auth/AuthGate.tsx`
- Modify: `src/features/auth/LoginPage.tsx`
- Modify: `src/features/auth/login-page.css`
- Modify: `src/layouts/AppShell.tsx`
- Modify: `src/components/shell/Topbar.tsx`
- Modify: `src-tauri/tauri.conf.json`
- Test: `src/features/auth/LoginPage.test.tsx`
- Test: `src/components/shell/Topbar.session.test.tsx`

**Interfaces:**
- Produces: `applyWindowMode("auth" | "workspace")` using `getCurrentWindow`, `LogicalSize`, minimum size, unmaximize, resize, and center.
- Auth logical size: content-driven baseline with a minimum that fits First Run at 150% DPI and internal vertical scrolling when the monitor is shorter.
- Workspace logical size: restore to `1600×900`, constrained by available monitor size and existing responsive minimums.

- [ ] **Step 1: Write failing window-mode tests**

Assert loading/First Run/Login/Database Error select auth mode; authentication selects workspace mode; logout returns auth mode; auth mode unmaximizes, applies compact min/size and centers; workspace mode restores approved size; mode application is idempotent.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm run test:run -- src/features/auth/window-mode.test.ts src/features/auth/LoginPage.test.tsx src/components/shell/Topbar.session.test.tsx`

- [ ] **Step 3: Implement native mode switching and DPI-safe CSS**

Use logical pixels, cap height against monitor work area, keep the card width compact, remove `100vw × 100vh` dependence from the card layout, and use an internal scroll container only when needed. Do not create another window or re-enable decorations.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the focused command from Step 2 and require zero failures.

- [ ] **Step 5: Commit**

Commit: `feat(auth): switch one window between auth and workspace modes`

### Task 6: Production-path installed-app acceptance harness

**Files:**
- Create: `src/services/acceptance/auth-acceptance.ts`
- Create: `src/services/acceptance/auth-acceptance.test.ts`
- Modify: `src/main.tsx`
- Modify: `src-tauri/src/database/self_check.rs`
- Modify: `src-tauri/src/database/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `.github/workflows/react-tauri-dashboard-ci.yml`

**Interfaces:**
- Consumes: the same database descriptor/bootstrap, `UserRepository`, `PersistenceUserGateway`, password hasher, `UserService`, and `AuthService` used by the UI.
- Produces: opt-in installed-build acceptance mode that creates a uniquely named test administrator in a clean isolated AppData, closes/reopens the plugin connection, authenticates, records only pass/fail metadata to a requested report path, and removes the test row.
- Produces: Windows smoke checks for auth/workspace window bounds, minimize/close responsiveness, no conhost, persistence across relaunch, and uninstall data preservation.

- [ ] **Step 1: Write failing frontend tests for the harness orchestration**

Assert the harness calls the production gateway/service/hasher, closes and reopens persistence, authenticates the persisted user, excludes password/hash/salt from its report, and always attempts cleanup.

- [ ] **Step 2: Run focused test and verify RED**

Run: `npm run test:run -- src/services/acceptance/auth-acceptance.test.ts`

- [ ] **Step 3: Implement the opt-in production-path harness**

Activate only when the installed executable is launched with an explicit CI acceptance argument and report path. Keep normal launches unchanged. Use the production modules; do not duplicate SQL or hashing in test-only code.

- [ ] **Step 4: Strengthen Windows installed-app workflow**

Run the NSIS-installed EXE with isolated normal, spaced, and Persian AppData roots; validate fresh/compatible/incompatible/corrupt/unwritable cases; execute the production-path first-admin/reopen/login harness; inspect native window bounds and console children; uninstall; confirm database/log/sentinel preservation. Upload diagnostics and acceptance reports on failure.

- [ ] **Step 5: Run local frontend test and syntax checks**

Run: `npm run test:run -- src/services/acceptance/auth-acceptance.test.ts`

Run: `npm run build`

- [ ] **Step 6: Commit**

Commit: `test(release): exercise installed auth persistence path`

### Task 7: Version, full verification, release, and review

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `.github/workflows/react-tauri-dashboard-ci.yml`

**Interfaces:**
- Produces: version `0.2.2` everywhere and NSIS `Gold Label Studio Pro_0.2.2_x64-setup.exe`.

- [ ] **Step 1: Write/extend version-contract assertions**

Make CI fail unless package, Rust, Tauri, and expected NSIS artifact versions all equal `0.2.2`.

- [ ] **Step 2: Apply the version bump and include the work branch in CI triggers**

Update all four version sources and add `acceptance-fix-v0.2.2` to the workflow branch list without changing `main`.

- [ ] **Step 3: Run fresh local verification**

Run: `npm run test:run`

Run: `npm run build`

Run when Rust is available: `cargo test --manifest-path src-tauri/Cargo.toml`

Require exact test counts and zero failures; note that local Rust is unavailable if that remains true rather than claiming it ran.

- [ ] **Step 4: Self-review spec coverage and inspect the complete diff**

Check every item in the specification, scan diagnostics for secret fields, confirm `main.rs` still has `windows_subsystem = "windows"`, and confirm no existing database deletion path was added.

- [ ] **Step 5: Request independent code review and address Critical/Important findings**

Review the diff from `5878aad` to the branch HEAD against this plan and specification; rerun affected focused tests after every correction.

- [ ] **Step 6: Commit and push**

Commit: `release: prepare Gold Label Studio Pro 0.2.2`

Push: `git push -u origin acceptance-fix-v0.2.2`

- [ ] **Step 7: Inspect Windows CI and iterate minimally until green**

Fetch the actual workflow/job conclusion and logs. For each failure, identify the root cause, add or confirm a reproducing test, make the smallest fix, rerun local verification, commit, push, and inspect the new run.

- [ ] **Step 8: Verify and publish the NSIS artifact**

Confirm the uploaded artifact contains exactly `Gold Label Studio Pro_0.2.2_x64-setup.exe`; do not overwrite the 0.2.1 installer.

- [ ] **Step 9: Final report**

Report the recovered baseline, branch, final commit, evidence-backed database root cause (or explicitly state what remains unproven), authoritative path, exact fix, diagnostics/error codes, auth controls, window transitions, frontend/Rust counts, Windows installed-build CI result, artifact, and physical-PC checks still pending. Stop without starting another feature.

