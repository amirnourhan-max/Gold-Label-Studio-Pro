# Final UI Clean Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the approved UI exactly while making its routes, fixtures, types, shell, and service boundaries ready for real application logic.

**Architecture:** Keep approved page markup and page CSS feature-local. Move only static display data into typed mock modules, centralize route composition in a registry, and introduce small shared layout primitives that have no visual defaults. Future data access is represented by typed interfaces with display-only adapters.

**Tech Stack:** React 19, TypeScript, Vite 6, Vitest 3, Tauri 2, existing CSS files and reference assets.

**Spec:** `docs/superpowers/specs/2026-09-09-final-ui-clean-refactor-design.md`

## Global Constraints

- UI baseline is `react-tauri-dashboard` commit `eed2854e05252a3963b9bee05226b68700ad0970`.
- Do not change approved page layout, CSS cascade order, colors, fonts, RTL direction, responsive breakpoints, assets, or visible copy.
- Keep the sidebar on the left, reports absent, and all return-page text as `مرجوع کالا`.
- Do not add real database, printing, scanner, scale, backup, authentication, or device behavior.
- Preserve existing route query values: `dashboard`, `product-registration`, `label-print`, `label-designer`, `packaging`, `returns`, `products`, and `settings`.
- Add tests before each new reusable contract or module; watch every new test fail before implementing it.

---

### Task 1: Freeze the approved UI baseline and verify the isolated workspace

**Files:**
- Create: Git tag `ui-approved-v1.0.0` at `eed2854e05252a3963b9bee05226b68700ad0970`
- Modify: none
- Test: existing `src/**/*.test.tsx`, `src/**/*.test.ts`

**Interfaces:**
- Consumes: remote branch `react-tauri-dashboard`
- Produces: immutable UI reference tag and a clean refactor branch

- [ ] **Step 1: Fetch and verify the approved commit exists**

Run: `git fetch origin react-tauri-dashboard && git cat-file -e eed2854e05252a3963b9bee05226b68700ad0970^{commit}`

Expected: exit code `0` and no working-tree changes except intentionally downloaded local visual artifacts.

- [ ] **Step 2: Create the immutable UI tag**

Run:

```bash
git tag -a ui-approved-v1.0.0 eed2854e05252a3963b9bee05226b68700ad0970 \
  -m "Approved Gold Label Studio Pro UI baseline"
git push origin ui-approved-v1.0.0
```

Expected: `ui-approved-v1.0.0` resolves to the approved UI commit and does not include refactor-only files.

- [ ] **Step 3: Run the baseline suite**

Run: `npm run test:run`

Expected: all existing tests pass before any refactor production code changes.

- [ ] **Step 4: Commit the design record if it is not already committed**

Run:

```bash
git add docs/superpowers/specs/2026-09-09-final-ui-clean-refactor-design.md
git commit -m "docs: define final UI refactor"
```

Expected: the design document is versioned separately from UI implementation changes.

### Task 2: Create typed domain and route contracts

**Files:**
- Create: `src/types/domain.ts`
- Create: `src/types/routes.ts`
- Create: `src/types/index.ts`
- Create: `src/types/domain.test.ts`
- Modify: `src/components/shell/Sidebar.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: existing product, scan, package, device, user, and navigation fixture shapes
- Produces: `ProductRecord`, `ProductCategory`, `ScanRecord`, `PackageItem`, `DeviceConnection`, `UserRecord`, `ShellRoute`, and `NavigationItem`

- [ ] **Step 1: Write the failing contract test**

```ts
import { describe, expect, it } from "vitest";
import { shellRoutes } from "./routes";

describe("shared UI contracts", () => {
  it("keeps the approved route IDs and omits reports", () => {
    expect(shellRoutes).toEqual([
      "dashboard", "product-registration", "label-print", "label-designer",
      "packaging", "returns", "products", "settings",
    ]);
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `npm run test:run -- src/types/domain.test.ts`

Expected: fail because `src/types/routes.ts` does not exist.

- [ ] **Step 3: Add the minimal type modules**

```ts
export const shellRoutes = [
  "dashboard", "product-registration", "label-print", "label-designer",
  "packaging", "returns", "products", "settings",
] as const;

export type ShellRoute = (typeof shellRoutes)[number];

export type ProductRecord = Readonly<{
  id: number; code: string; name: string; group: string; category: string;
  purity: string; weight: string; status: "فعال" | "در انتظار چاپ" | "غیرفعال"; image: string;
}>;
```

Define equivalent readonly records for each currently hard-coded visual dataset. Re-export them from `src/types/index.ts`. Make `Sidebar` import `ShellRoute` and `NavigationItem` from `types` instead of declaring duplicate local types.

- [ ] **Step 4: Run the type-contract and sidebar tests**

Run: `npm run test:run -- src/types/domain.test.ts src/components/shell/Sidebar.test.tsx`

Expected: both files pass with the same visible navigation labels.

- [ ] **Step 5: Commit typed contracts**

```bash
git add src/types src/components/shell/Sidebar.tsx src/app/App.tsx
git commit -m "refactor: add shared UI contracts"
```

### Task 3: Move visual fixtures out of page JSX

**Files:**
- Create: `src/data/mock/dashboard.ts`
- Create: `src/data/mock/products.ts`
- Create: `src/data/mock/product-registration.ts`
- Create: `src/data/mock/operations.ts`
- Create: `src/data/mock/settings.ts`
- Create: `src/data/mock/index.ts`
- Create: `src/data/mock/fixtures.test.ts`
- Modify: `src/components/dashboard/Dashboard.tsx`
- Modify: `src/features/products/ProductsPage.tsx`
- Modify: `src/features/products/ProductRegistrationPage.tsx`
- Modify: `src/features/operations/PackagingPage.tsx`
- Modify: `src/features/operations/LabelPrintPage.tsx`
- Modify: `src/features/operations/LabelDesignerPage.tsx`
- Modify: `src/features/operations/ReturnsPage.tsx`
- Modify: `src/features/settings/SettingsPage.tsx`

**Interfaces:**
- Consumes: `src/types/*` and approved asset modules
- Produces: readonly fixture exports used by page rendering

- [ ] **Step 1: Write a failing fixture contract test**

```ts
import { describe, expect, it } from "vitest";
import { productRows, returnScans } from "./index";

describe("approved UI fixtures", () => {
  it("keeps product and returns preview rows available without page imports", () => {
    expect(productRows).toHaveLength(7);
    expect(returnScans).toHaveLength(8);
    expect(returnScans[2]?.status).toBe("بارکد تکراری");
  });
});
```

- [ ] **Step 2: Run the fixture test to verify it fails**

Run: `npm run test:run -- src/data/mock/fixtures.test.ts`

Expected: fail because the mock fixture index does not exist.

- [ ] **Step 3: Add typed fixture modules and replace page-local arrays**

```ts
export const returnScans: readonly ScanRecord[] = [
  { row: "۱", time: "10:24:31", code: "R-250904-00125", name: "انگشتر طرح گل", group: "انگشتر", weight: "4.385 g", status: "موفق" },
  // Preserve every approved existing row and literal value.
];
```

Keep page component markup, HTML order, CSS class names, and visible values unchanged. Pages only replace local constants with imports from `data/mock`.

- [ ] **Step 4: Run feature tests affected by fixture imports**

Run: `npm run test:run -- src/components/dashboard/Dashboard.test.tsx src/features/products/ProductRegistrationPage.test.tsx src/features/operations/PackagingPage.test.tsx src/features/operations/LabelPrintPage.test.tsx src/features/operations/LabelDesignerPage.test.tsx src/features/operations/ReturnsPage.test.tsx src/features/settings/SettingsPage.test.tsx`

Expected: all rendering tests pass with unchanged copy, assets, and item counts.

- [ ] **Step 5: Commit fixture extraction**

```bash
git add src/data/mock src/components/dashboard/Dashboard.tsx src/features
git commit -m "refactor: separate approved UI fixtures"
```

### Task 4: Add display-only service boundaries

**Files:**
- Create: `src/services/contracts.ts`
- Create: `src/services/mock-ui-services.ts`
- Create: `src/services/index.ts`
- Create: `src/services/mock-ui-services.test.ts`

**Interfaces:**
- Consumes: types and mock fixture modules
- Produces: side-effect-free repository and service interfaces for future wiring

- [ ] **Step 1: Write the failing adapter test**

```ts
import { describe, expect, it } from "vitest";
import { mockProductRepository } from "./mock-ui-services";

describe("display-only service adapters", () => {
  it("returns the approved product fixture without mutating it", async () => {
    const products = await mockProductRepository.list();
    expect(products).toHaveLength(7);
    expect(products[0]?.code).toBe("R-250904-00125");
  });
});
```

- [ ] **Step 2: Run the adapter test to verify it fails**

Run: `npm run test:run -- src/services/mock-ui-services.test.ts`

Expected: fail because the adapter does not yet exist.

- [ ] **Step 3: Define interfaces and no-op adapters**

```ts
export interface ProductRepository { list(): Promise<readonly ProductRecord[]>; }
export interface ScannerService { status(): Promise<DeviceConnection>; }
export interface PrintService { queue(): Promise<readonly LabelPrintJob[]>; }

export const mockProductRepository: ProductRepository = {
  async list() { return productRows; },
};
```

Do not call these adapters from pages in this phase; they are a compile-time boundary only and must not introduce loading, mutation, persistence, or device behavior.

- [ ] **Step 4: Run service tests**

Run: `npm run test:run -- src/services/mock-ui-services.test.ts`

Expected: pass with no browser, Tauri, database, or network access.

- [ ] **Step 5: Commit the service boundary**

```bash
git add src/services src/types src/data/mock
git commit -m "refactor: add display-only service boundaries"
```

### Task 5: Centralize shell composition and typed route rendering

**Files:**
- Create: `src/layouts/AppShell.tsx`
- Create: `src/layouts/AppShell.test.tsx`
- Create: `src/app/routes.tsx`
- Create: `src/app/routes.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/components/shell/Sidebar.tsx`

**Interfaces:**
- Consumes: `ShellRoute`, `shellRoutes`, existing page components, `Sidebar`, `Topbar`, and `Footer`
- Produces: `pageRegistry`, `parseRoute`, and `AppShell`

- [ ] **Step 1: Write failing route parsing and shell composition tests**

```tsx
import { describe, expect, it } from "vitest";
import { parseRoute } from "./routes";

describe("page route registry", () => {
  it("keeps the approved returns query route", () => {
    expect(parseRoute("returns")).toBe("returns");
    expect(parseRoute("reports")).toBe("dashboard");
  });
});
```

```tsx
expect(screen.getByRole("navigation", { name: "منوی اصلی" })).toBeInTheDocument();
expect(screen.getByRole("contentinfo")).toBeInTheDocument();
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm run test:run -- src/app/routes.test.tsx src/layouts/AppShell.test.tsx`

Expected: fail because the route registry and layout component do not exist.

- [ ] **Step 3: Add a registry and shell without visual styles**

```tsx
type PageRenderOptions = { onNewProduct(): void };

export const pageRegistry: Record<ShellRoute, (options: PageRenderOptions) => ReactNode> = {
  dashboard: ({ onNewProduct }) => <Dashboard onNewProduct={onNewProduct} />,
  "product-registration": () => <ProductRegistrationPage />,
  "label-print": () => <LabelPrintPage />,
  "label-designer": () => <LabelDesignerPage />,
  packaging: () => <PackagingPage />,
  returns: () => <ReturnsPage />,
  products: () => <ProductsPage />,
  settings: () => <SettingsPage />,
};
```

`AppShell` must render the existing classes `app-shell` and `main-shell` in the same DOM order as current `App`. Preserve the Dashboard new-product callback by accepting `children` or a `renderPage` callback rather than changing the Dashboard markup.

- [ ] **Step 4: Run app and shell tests**

Run: `npm run test:run -- src/app/App.test.tsx src/app/routes.test.tsx src/layouts/AppShell.test.tsx src/components/shell/Sidebar.test.tsx src/components/shell/Topbar.test.tsx`

Expected: routes, sidebar selection, footer, and custom title bar pass without copy changes.

- [ ] **Step 5: Commit shell and route refactor**

```bash
git add src/app src/layouts src/components/shell
git commit -m "refactor: centralize app shell and routes"
```

### Task 6: Extract only layout-safe shared primitives and organize feature ownership

**Files:**
- Create: `src/components/common/PageContainer.tsx`
- Create: `src/components/common/ScrollPanel.tsx`
- Create: `src/components/common/PageContainer.test.tsx`
- Create: `src/components/common/ScrollPanel.test.tsx`
- Move: `src/components/dashboard/*` to `src/features/dashboard/*`
- Move: individual operation page files into `src/features/label-print`, `src/features/label-designer`, `src/features/packaging`, and `src/features/returns`
- Modify: imports in `src/app/routes.tsx`, tests, and page-local CSS imports

**Interfaces:**
- Consumes: caller-owned class names and children
- Produces: wrappers that add semantics only, not visual styling

- [ ] **Step 1: Write failing primitive tests**

```tsx
render(<ScrollPanel className="returns-history-scroll" label="فهرست آزمایشی"><table aria-label="جدول آزمایشی" /></ScrollPanel>);
expect(screen.getByRole("region", { name: "فهرست آزمایشی" })).toHaveClass("returns-history-scroll");
expect(screen.getByRole("table", { name: "جدول آزمایشی" })).toBeInTheDocument();
```

- [ ] **Step 2: Run primitive tests to verify they fail**

Run: `npm run test:run -- src/components/common/PageContainer.test.tsx src/components/common/ScrollPanel.test.tsx`

Expected: fail because common primitive files do not exist.

- [ ] **Step 3: Implement semantic-only primitives**

```tsx
export function ScrollPanel({ className, label, children }: {
  className: string; label: string; children: ReactNode;
}) {
  return <div className={className} role="region" aria-label={label} tabIndex={0}>{children}</div>;
}
```

Use `ScrollPanel` only where its rendered element is identical to the current accessible scroll container. Leave page-specific CSS class names unchanged. Keep the already-cohesive operation pages in `features/operations` rather than performing cosmetic folder moves: this avoids needless import churn and protects the pixel-approved UI while still separating shared primitives from page ownership.

- [ ] **Step 4: Run all affected feature tests**

Run: `npm run test:run -- src/features/dashboard/Dashboard.test.tsx src/features/packaging/PackagingPage.test.tsx src/features/label-print/LabelPrintPage.test.tsx src/features/label-designer/LabelDesignerPage.test.tsx src/features/returns/ReturnsPage.test.tsx`

Expected: pass after import-path updates with unchanged DOM text and assets.

- [ ] **Step 5: Commit reusable primitives and feature ownership cleanup**

```bash
git add src/components/common src/features src/app
git commit -m "refactor: organize approved UI features"
```

### Task 7: Clean imports, verify terminology, and perform final visual/build validation

**Files:**
- Modify: only files required to remove now-unused imports or obsolete re-export paths
- Test: existing suite plus `src/app/App.test.tsx`, `src/styles/font-contract.test.ts`, and `src/styles/responsive-contract.test.ts`

**Interfaces:**
- Consumes: all refactored modules
- Produces: final UI refactor commit with no unused imports, reports route, or obsolete return terminology

- [ ] **Step 1: Add a failing terminology and reports regression test if the existing assertions do not cover route config**

```ts
expect(shellRoutes).not.toContain("reports");
expect(navigationItems.map(item => item.label)).not.toContain("گزارش‌ها");
expect(navigationItems.map(item => item.label)).toContain("مرجوع کالا");
```

- [ ] **Step 2: Run the regression test to verify it fails before any new export is added**

Run: `npm run test:run -- src/types/domain.test.ts`

Expected: fail only if the route/navigation contract is not yet exported; otherwise retain the already-passing coverage and do not duplicate the test.

- [ ] **Step 3: Remove unused imports and obsolete compatibility code**

Run: `npx tsc -b --noEmit`

Expected: no TypeScript diagnostics. Do not change CSS declarations to satisfy code cleanup.

- [ ] **Step 4: Run complete automated verification**

Run:

```bash
npm run test:run
npm run build
npm run tauri build -- --no-bundle
git diff --check
rg -n "خروج کالا|گزارش" src .github --glob '!*.test.*' || test "$?" -eq 1
```

Expected: test suite passes; build commands exit `0`; whitespace check is clean; `خروج کالا` and visible report UI/route references produce no matches.

- [ ] **Step 5: Run and inspect the visual workflow**

Run: push the refactor branch to `react-tauri-dashboard` and inspect the generated CI screenshots for Dashboard, product registration, products, label print, label designer, packaging, returns, and settings at the five required resolutions.

Expected: no visual difference from the approved baseline except source-level organization; each page remains usable in windowed and maximized states.

- [ ] **Step 6: Create the final refactor commit**

```bash
git add src docs
git commit -m "refactor: prepare approved UI for application logic"
git push origin react-tauri-dashboard
```

Expected: branch contains the baseline tag, refactor commits, clean CI, and the Windows preview artifact.
