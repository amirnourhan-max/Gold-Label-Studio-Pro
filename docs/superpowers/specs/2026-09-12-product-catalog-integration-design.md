# Product Catalog Persistence Integration Design

## Goal

Connect the approved product-registration and products screens to the SQLite persistence foundation without redesigning their layout, typography, icons, RTL behavior, or responsive rules.

## Scope

This phase owns product groups, main categories, workshops, product creation, product listing/filtering, product soft deletion, and durable product images. Printing, label-designer persistence, packaging, returns, devices, backup execution, and user management remain unchanged.

## Architecture

React consumes a feature-level `ProductCatalogService` through a context. Components never receive a `SqlClient`, import `@tauri-apps/plugin-sql`, or issue SQL. The production runtime opens SQLite once, constructs repositories and an AppLocalData-backed image store, then exposes the service.

The approved mock data remains the initial display/fallback source. When Tauri/SQLite opens successfully, the provider switches to the persistent service. Fallback is used only when native persistence is unavailable, such as browser visual checks; an empty real database is treated as a valid persistent state and is not replaced by fake products.

## Repository Corrections and Extensions

SQLite returns snake_case columns and integer booleans. Repositories must map database rows explicitly to the existing camelCase persistence records rather than casting raw rows.

`CatalogRepository` adds:

- active group/category/workshop reads;
- transactional-safe create operations with bound values;
- soft delete for groups, categories, and workshops;
- lookup support needed by the application service.

`ProductRepository` adds:

- an active joined product listing containing group/category/workshop names;
- explicit row mapping;
- create and soft-delete operations with bound values.

## Catalog Bootstrap

On first successful native startup, the application service checks the real catalog tables. If all three are empty, it inserts the approved starter groups, main categories, and workshops with stable IDs and UTC timestamps. It never seeds sample products. Subsequent startups read the existing rows and do not duplicate seed data.

## Product Creation

The form service validates:

- non-empty unique product code;
- non-empty product name;
- selected active group, main category, and workshop;
- purity as an integer from 0 through 1000;
- gross weight as a positive decimal with at most milligram precision;
- stone weight as a non-negative decimal no greater than gross weight;
- positive integer quantity;
- image MIME/size when a new image is selected.

Gram text is converted only with `weightMgFromGramText`; database records retain integer milligrams. Product IDs and catalog IDs use `crypto.randomUUID()`, and timestamps use normalized UTC ISO strings.

The database row and product image are coordinated by the service. A selected image is written first to `product-images/<product-id>.<extension>` under Tauri `AppLocalData`; only this relative reference is stored in `products.image_path`. If the database insert fails, the newly written file is removed. Images are loaded as object/data URLs by the image-store boundary for rendering.

## UI Integration

`ProductRegistrationPage` keeps its approved structure and class names. Existing group/workshop controls become asynchronous persistent actions with optimistic visual continuity and error rollback. Main-category add/delete controls reuse the existing inline-action styling. The save button performs real persistence; print-only behavior stays out of scope, while “print and save” saves and reports that printing is not yet connected.

`ProductsPage` keeps the approved cards, filters, table, badges, and actions. Data, statistics, search, group/category/purity/status filters, refresh, navigation to registration, and soft delete become functional. View/edit remain visually present but disabled from persistence behavior in this phase.

## Refresh Model

The provider owns a catalog revision counter. Successful catalog/product mutations increment it. Product registration reloads catalogs and the products page reloads product rows whenever the revision changes; route changes also naturally mount a fresh read.

## Error Handling

Expected validation and uniqueness failures are translated to concise Persian feedback in the existing status area. Native bootstrap failure selects the controlled preview service rather than breaking the UI. Persistent-mode operation failures do not silently fall back or mix mock rows into real data.

## Testing

- Repository mapping and CRUD contract tests.
- Service validation, precise weight conversion, idempotent seed, image rollback, soft-delete, and refresh tests.
- React integration tests with injected services for real save/catalog behavior and products filtering.
- Rust file-backed SQLite test proving data survives connection close/reopen.
- Existing frontend visual/RTL/responsive tests.
- GitHub Actions Windows Rust tests, production build, Tauri build, executable smoke launch, and visual artifacts.

## Security and Storage

Filesystem access is limited to recursive AppLocalData read/write for product images. Images are not stored as Base64 in SQLite. The database location, WAL policy, migration ownership, and future SQLCipher substitution boundary remain unchanged.
