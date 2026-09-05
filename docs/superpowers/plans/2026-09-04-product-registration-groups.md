# Product Registration and Category UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and package the visual-preview phase for Persian RTL product registration and image-based categories.

**Architecture:** Add one focused React product-registration feature composed of a category selector, image preview, and responsive product-information form. Connect it to the existing shell navigation and keep Tauri/Rust and all business integrations unchanged.

**Tech Stack:** React 19, TypeScript, Vitest, React Testing Library, CSS, Tauri 2, Rust stable.

**Spec:** `docs/superpowers/specs/2026-09-04-product-registration-groups-design.md`

## Global Constraints

- This is UI-only preview software for appearance approval.
- No real scale, database, persistence, QR, inventory, print queue, or label-printing logic.
- Persian RTL, approved dark navy/charcoal surfaces and gold accents.
- Fixed local category assets only; no runtime web images or emoji substitutes.
- Existing Dashboard remains intact.
- Responsive at 1600×900 and 1366×768 without horizontal clipping.
- Every behavior change follows red-green-refactor and the full suite stays green.

---

### Task 1: Product registration preview page

**Files:**
- Create: `src/features/products/ProductRegistrationPage.tsx`
- Create: `src/features/products/ProductRegistrationPage.test.tsx`
- Create: `src/features/products/product-registration.css`

**Interfaces:**
- Consumes: `categoryAssets` and the fixed local reference assets.
- Produces: `ProductRegistrationPage(): JSX.Element`.

- [ ] Write failing tests proving the approved form labels and actions are visible, every category uses a local image, the page identifies itself as preview-only, category selection works, and a valid local image can be previewed and removed.
- [ ] Run `npm run test:run -- src/features/products/ProductRegistrationPage.test.tsx` and verify RED because the feature does not exist.
- [ ] Implement the image-category selector, product image preview/removal, product fields, switches, and actions as local UI state only.
- [ ] Add responsive dark/gold styling with no horizontal clipping at 1366×768.
- [ ] Run the focused test and `npm run test:run`; confirm all pass.
- [ ] Commit with `feat: add product registration UI preview`.

### Task 2: Shell navigation integration

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/components/shell/Sidebar.tsx`
- Modify: `src/components/shell/Sidebar.test.tsx`
- Modify: `src/components/dashboard/Dashboard.tsx`

**Interfaces:**
- Consumes: `ProductRegistrationPage` from Task 1.
- Produces: local route state for `dashboard` and `product-registration`.

- [ ] Write failing integration tests proving `ثبت محصول` appears in the sidebar, opens the preview page, receives active navigation state, and `محصول جدید` on Dashboard opens the same page.
- [ ] Run focused App/Sidebar tests and verify the expected RED failures.
- [ ] Implement controlled shell navigation without changing unrelated Dashboard sections.
- [ ] Run focused tests, `npm run test:run`, and `npm run build`.
- [ ] Commit with `feat: connect product registration navigation`.

### Task 3: Windows preview build and smoke test

**Files:**
- Modify: `.github/workflows/react-tauri-dashboard-ci.yml`

**Interfaces:**
- Consumes: the completed UI preview.
- Produces: `gold-label-studio-pro.exe` and a 1600×900 visual-check artifact.

- [ ] Preserve frontend tests, production build, visual capture, Rust tests, Tauri build, smoke launch, and artifact upload.
- [ ] Ensure the workflow triggers for the implementation branch.
- [ ] Run `npm run test:run` and `npm run build` locally.
- [ ] Push the branch, wait for GitHub Actions, and verify every Windows step succeeds.
- [ ] Download the smoke-tested executable artifact for delivery.
- [ ] Commit with `build: package product registration preview`.

### Task 4: Pixel-accurate product registration redesign

**Files:**
- Create: `docs/reference/product-registration-approved.png`
- Create: `src/assets/reference/product-registration-ring.webp`
- Create: `src/assets/reference/product-registration-label.webp`
- Modify: `src/assets/reference/index.ts`
- Modify: `src/assets/reference/assets.test.ts`
- Modify: `src/features/products/ProductRegistrationPage.tsx`
- Modify: `src/features/products/ProductRegistrationPage.test.tsx`
- Modify: `src/features/products/product-registration.css`

**Interfaces:**
- Consumes: the approved 1448×1086 registration reference and existing shell.
- Produces: a pixel-accurate UI-only registration screen and fixed local product/label artwork.

- [ ] Add the approved reference image and extract only the product and label-preview artwork as fixed local assets.
- [ ] Write failing tests for the reference-specific regions: category accordion, exact central form groups, product image panel, static label preview, visual-only device rail, and bottom action order.
- [ ] Run the focused tests and verify expected RED failures against the previous card-strip layout.
- [ ] Rebuild the component hierarchy to match the reference while retaining only local presentation state.
- [ ] Rebuild the scoped CSS to match the reference proportions, density, colors, borders, and responsive behavior at 1600×900 and 1366×768.
- [ ] Run focused tests, the complete frontend suite, production build, and visual capture.
- [ ] Commit with `ui: match approved product registration reference`.
