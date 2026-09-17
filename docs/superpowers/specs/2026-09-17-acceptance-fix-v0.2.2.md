# Gold Label Studio Pro v0.2.2 Acceptance Fix Specification

## Baseline

- Repository: `amirnourhan-max/Gold-Label-Studio-Pro`
- Source branch: `final-audit-release`
- Verified source commit: `5878aad66e60bc623a9837501da962afd1b8d70b`
- Work branch: `acceptance-fix-v0.2.2`
- Do not modify `main`.

## Required outcomes

1. Resolve the packaged first-administrator failure through the real production path. Do not hide the cause with a fallback or destroy an existing database.
2. Use one authoritative per-user SQLite location for Rust bootstrap, Tauri SQL, backup, restore, diagnostics, and tests. SQLite remains embedded.
3. Persist sanitized diagnostics in the per-user log directory. Include paths, path writability, database metadata, SQLite failures, schema compatibility, table/column checks, migrations, and first-admin insert failures. Never log credentials or derived password material.
4. Gate startup into exactly one of: First Run, Login, or a dedicated Database Error screen. Database Error includes a stable `DB-*` code, retry, copy details, exit, and open-logs actions.
5. Login, First Run, and Database Error use a compact centered native window with draggable close/minimize controls. Authentication success expands the same window to the approved workspace dimensions; logout returns it to compact mode.
6. Preserve the Windows GUI subsystem and never show a console window.
7. Cover fresh, compatible, incompatible, corrupt, unwritable, spaced-path, and Unicode-path database cases without silently deleting user data.
8. Bump all application versions from `0.2.1` to `0.2.2` and produce a new NSIS artifact named `Gold Label Studio Pro_0.2.2_x64-setup.exe`.
9. Windows CI must build, install, launch, exercise the real persistence/authentication path as far as reliable automation permits, relaunch, verify persistence, inspect window modes and console state, uninstall, and confirm user data remains.
10. Final reporting must separate local/unit evidence, Windows installed-build evidence, and physical-PC verification still pending.

## Non-goals

- No workspace UI redesign.
- No destructive schema migration.
- No silent database replacement.
- No second native application window.
- No unrelated feature work.

