# Product Catalog Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist product catalogs and products in SQLite while preserving the approved registration and products UI.

**Architecture:** A feature service coordinates typed repositories, validation, precise weight conversion, durable image storage, and controlled preview fallback. React receives that service through context and never imports SQL or filesystem plugins directly.

**Tech Stack:** React 19, TypeScript, Vitest, Tauri 2, `tauri-plugin-sql`, `tauri-plugin-fs`, SQLite, Rust/rusqlite.

**Spec:** `docs/superpowers/specs/2026-09-12-product-catalog-integration-design.md`

## Global Constraints

- Baseline is remote commit `ad8e46554409a569c7bd26fa0ab75e22d87e5d4e`; branch is `product-catalog-integration`.
- Preserve approved markup, CSS, typography, icons, RTL, responsive behavior, and unrelated feature behavior.
- No SQL or `SqlClient` access from React components.
- Store timestamps as normalized UTC ISO-8601 strings and weights as integer milligrams.
- Soft-delete groups, categories, workshops, and products.
- Keep mock data as a controlled native-bootstrap fallback; never mix it into a successfully opened real database.
- Do not implement printing, packaging, returns, devices, backup execution, or users.

---

### Task 1: Make catalog and product repositories production-correct

**Files:**
- Modify: `src/types/persistence.ts`
- Modify: `src/repositories/catalog-repository.ts`
- Modify: `src/repositories/catalog-repository.test.ts`
- Modify: `src/repositories/product-repository.ts`
- Modify: `src/repositories/product-repository.test.ts`

**Interfaces:**
- Produces explicit SQLite-row mappers and `ProductCatalogRecord`.
- Produces `createGroup`, `createCategory`, `createWorkshop`, `softDeleteGroup`, `softDeleteCategory`, and joined `listActiveCatalog`.

- [x] **Step 1: Write repository tests that return snake_case SQLite rows and expect camelCase records**
- [x] **Step 2: Run `npm run test:run -- src/repositories/catalog-repository.test.ts src/repositories/product-repository.test.ts` and verify mapping/CRUD failures**
- [x] **Step 3: Implement explicit mapping and bound catalog/product operations**
- [x] **Step 4: Re-run focused tests and verify success**
- [x] **Step 5: Commit as `feat: complete product catalog repositories`**

### Task 2: Add durable product-image storage

**Files:**
- Create: `src/services/product-catalog/product-image-store.ts`
- Create: `src/services/product-catalog/product-image-store.test.ts`
- Create: `src/services/product-catalog/tauri-product-image-store.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

**Interfaces:**
- Produces `ProductImageStore.save(productId, file)`, `load(reference)`, and `remove(reference)`.
- Production files live below `product-images/` in `BaseDirectory.AppLocalData`.

- [x] **Step 1: Write failing tests for MIME validation, deterministic extension selection, save/load, and cleanup contracts**
- [x] **Step 2: Run `npm run test:run -- src/services/product-catalog/product-image-store.test.ts` and verify failure**
- [x] **Step 3: Implement the interface, Tauri FS adapter, plugin registration, and least-scope AppLocalData permissions**
- [x] **Step 4: Run the focused test and `npm run build`**
- [x] **Step 5: Commit as `feat: add durable product image storage`**

### Task 3: Implement the product-catalog application service

**Files:**
- Create: `src/services/product-catalog/product-catalog-types.ts`
- Create: `src/services/product-catalog/product-catalog-service.ts`
- Create: `src/services/product-catalog/product-catalog-service.test.ts`
- Create: `src/services/product-catalog/product-catalog-seed.ts`
- Create: `src/services/product-catalog/preview-product-catalog-service.ts`
- Create: `src/services/product-catalog/runtime.ts`
- Create: `src/services/product-catalog/index.ts`

**Interfaces:**
- Produces `ProductCatalogService` methods for initialize, catalogs, product create/list/delete, and source mode.
- Consumes only repositories, weight helpers, clock/ID dependencies, and `ProductImageStore`.

- [x] **Step 1: Write failing service tests for idempotent seed, validation, exact g→mg conversion, image rollback, list mapping, and soft delete**
- [x] **Step 2: Run `npm run test:run -- src/services/product-catalog` and verify expected failures**
- [x] **Step 3: Implement the persistent service, preview fallback, seed data, and singleton runtime**
- [x] **Step 4: Run all service and repository tests**
- [x] **Step 5: Commit as `feat: add product catalog application service`**

### Task 4: Connect product registration without redesign

**Files:**
- Create: `src/features/products/ProductCatalogProvider.tsx`
- Create: `src/features/products/ProductCatalogProvider.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/features/products/ProductRegistrationPage.tsx`
- Modify: `src/features/products/ProductRegistrationPage.test.tsx`
- Modify: `src/features/products/product-registration.css` only for existing-style category action alignment or status tones.

**Interfaces:**
- Produces `useProductCatalog()` with service, source, revision, and mutation notification.
- Registration saves through `ProductCatalogService.createProduct` and catalog mutations through service methods.

- [ ] **Step 1: Write failing UI tests for persistent catalog load, group/category/workshop mutations, validation feedback, and product save**
- [ ] **Step 2: Run registration/provider tests and verify expected failures**
- [ ] **Step 3: Implement provider and event handlers while retaining existing DOM/class structure**
- [ ] **Step 4: Run registration, App, responsive, and isolation tests**
- [ ] **Step 5: Commit as `feat: connect product registration persistence`**

### Task 5: Connect the products table, statistics, filters, and deletion

**Files:**
- Modify: `src/features/products/ProductsPage.tsx`
- Create: `src/features/products/ProductsPage.test.tsx`
- Modify: `src/features/products/products-page.css` only to preserve the current appearance for native select/loading/error states.
- Modify: `src/app/routes.tsx`
- Modify: `src/app/App.test.tsx`

**Interfaces:**
- Consumes `useProductCatalog()`.
- Produces real list refresh, statistics, search/group/category/purity/status filtering, soft delete, and registration navigation.

- [ ] **Step 1: Write failing products-page tests for real rows, filtering, statistics, navigation, refresh, and soft delete**
- [ ] **Step 2: Run focused tests and verify failures**
- [ ] **Step 3: Implement data loading and interactions without changing the approved panel/table hierarchy**
- [ ] **Step 4: Run all frontend tests and production build**
- [ ] **Step 5: Commit as `feat: connect products inventory persistence`**

### Task 6: Prove restart persistence and complete CI

**Files:**
- Modify: `src-tauri/src/database/tests.rs`
- Modify: `.github/workflows/react-tauri-dashboard-ci.yml`
- Modify: this plan to record completed steps and evidence.

**Interfaces:**
- Produces a file-backed migration test that closes/reopens SQLite and verifies persisted catalog/product data.
- Produces Windows CI for `product-catalog-integration`.

- [ ] **Step 1: Write the Rust restart-persistence test and add the feature branch to workflow triggers**
- [ ] **Step 2: Run complete local `npm run test:run`, `npm run build`, static SQL-boundary checks, and `git diff --check`**
- [ ] **Step 3: Commit as `test: verify product catalog persistence` and publish the branch**
- [ ] **Step 4: Monitor GitHub Actions; inspect and fix every failing job until Rust tests, Tauri Windows build, smoke EXE, and visual checks pass**
- [ ] **Step 5: Record final local/CI evidence without merging or modifying `main`**

## Self-Review

- Every scope item maps to Tasks 1–5; restart durability and Windows validation map to Task 6.
- Production SQL and filesystem details remain behind repository/service adapters.
- No mock product is seeded into a successfully opened database.
- Exact weight conversion, soft-delete behavior, image rollback, and controlled fallback have explicit tests.
- No unrelated page or device workflow is modified.
