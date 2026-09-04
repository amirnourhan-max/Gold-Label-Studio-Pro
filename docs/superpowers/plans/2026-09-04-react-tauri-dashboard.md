# React + Tauri Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the PySide6 UI foundation with a React + TypeScript + Tauri 2 Windows foundation and reproduce the approved Gold Label Studio Pro Dashboard using fixed local assets extracted from the approved reference image.

**Architecture:** React renders the entire Dashboard and shell with CSS Grid/Flexbox and centralized design tokens. Tauri 2 provides the Windows desktop shell while Rust remains minimal in this phase. Dashboard content uses typed static fixture data so the visual implementation is testable without introducing business logic or fake backend services.

**Tech Stack:** React, TypeScript, Vite, Tauri 2, Rust stable, Vitest, React Testing Library, Playwright, Recharts, Lucide React, CSS.

**Spec:** `docs/superpowers/specs/2026-09-04-react-tauri-dashboard-design.md`

## Global Constraints

- The approved Dashboard reference image in the project conversation is the visual source of truth.
- React + TypeScript + Tauri 2 + Rust stable.
- Fixed local assets only; no runtime web images.
- No emoji substitutes for approved visual assets.
- Persian UI is RTL; English branding stays LTR where required.
- Target visual viewport is 1600×900 and must remain usable at 1366×768.
- No real product, scale, printer, SQLite, QR, packaging, outbound, label-designer, report, or authentication logic in this plan.
- The current PySide6 branch remains untouched as historical fallback.
- Dashboard visual approval by the user is required before starting business logic.

---

### Task 1: Scaffold the React + TypeScript + Tauri 2 application

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/App.test.tsx`
- Create: `src/test/setup.ts`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`

**Interfaces:**
- Produces: `App(): JSX.Element`
- Produces: Tauri command surface with no business commands.
- Consumes: none.

- [ ] **Step 1: Write the failing application-shell test**

```tsx
import { render, screen } from "@testing-library/react";
import { App } from "./App";

test("renders the Gold Label Studio Pro application root", () => {
  render(<App />);
  expect(screen.getByTestId("app-shell")).toBeInTheDocument();
  expect(screen.getByText("Gold Label Studio Pro")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- --run src/app/App.test.tsx
```

Expected: FAIL because the React application does not exist.

- [ ] **Step 3: Add the minimal React/Vite/Tauri foundation**

`src/app/App.tsx` starts with only the application root and product title:

```tsx
export function App() {
  return (
    <main data-testid="app-shell">
      <h1>Gold Label Studio Pro</h1>
    </main>
  );
}
```

Rust remains intentionally minimal:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Gold Label Studio Pro");
}
```

- [ ] **Step 4: Run frontend and Rust verification**

```bash
npm test -- --run src/app/App.test.tsx
npm run build
cd src-tauri && cargo test
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig*.json src src-tauri
git commit -m "chore: scaffold React Tauri desktop foundation"
```

---

### Task 2: Create the approved reference-asset package

**Files:**
- Create: `docs/reference/dashboard-approved.png`
- Create: `src/assets/reference/brand-diamond.png`
- Create: `src/assets/reference/hero-jewelry.png`
- Create: `src/assets/reference/category-ring.png`
- Create: `src/assets/reference/category-bracelet.png`
- Create: `src/assets/reference/category-necklace.png`
- Create: `src/assets/reference/category-earrings.png`
- Create: `src/assets/reference/category-pendant.png`
- Create: `src/assets/reference/category-service.png`
- Create: `src/assets/reference/category-chain.png`
- Create: `src/assets/reference/device-scale.png`
- Create: `src/assets/reference/device-printer.png`
- Create: `src/assets/reference/device-database.png`
- Create: `src/assets/reference/trust-artwork.png`
- Create: `src/assets/reference/index.ts`
- Create: `src/assets/reference/assets.test.ts`

**Interfaces:**
- Produces: `referenceAssets` object whose keys are stable semantic asset names and whose values are imported local asset URLs.
- Consumes: approved conversation reference image, materialized only at development time.

- [ ] **Step 1: Write the failing local-asset contract test**

```ts
import { referenceAssets } from "./index";

test("all approved dashboard assets are local package imports", () => {
  expect(Object.keys(referenceAssets)).toEqual([
    "brandDiamond",
    "heroJewelry",
    "ring",
    "bracelet",
    "necklace",
    "earrings",
    "pendant",
    "service",
    "chain",
    "scale",
    "printer",
    "database",
    "trustArtwork",
  ]);
  for (const url of Object.values(referenceAssets)) {
    expect(url).not.toMatch(/^https?:/);
  }
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npm test -- --run src/assets/reference/assets.test.ts
```

Expected: FAIL because the asset module does not exist.

- [ ] **Step 3: Crop the approved source image once and commit the resulting images**

Use the approved 1448×1086 reference image from the conversation. Crop only the artwork regions, preserving the original pixels. Do not redraw or replace the jewelry/device artwork.

Create `src/assets/reference/index.ts`:

```ts
import brandDiamond from "./brand-diamond.png";
import heroJewelry from "./hero-jewelry.png";
import ring from "./category-ring.png";
import bracelet from "./category-bracelet.png";
import necklace from "./category-necklace.png";
import earrings from "./category-earrings.png";
import pendant from "./category-pendant.png";
import service from "./category-service.png";
import chain from "./category-chain.png";
import scale from "./device-scale.png";
import printer from "./device-printer.png";
import database from "./device-database.png";
import trustArtwork from "./trust-artwork.png";

export const referenceAssets = {
  brandDiamond,
  heroJewelry,
  ring,
  bracelet,
  necklace,
  earrings,
  pendant,
  service,
  chain,
  scale,
  printer,
  database,
  trustArtwork,
} as const;
```

- [ ] **Step 4: Verify GREEN**

```bash
npm test -- --run src/assets/reference/assets.test.ts
npm run build
```

Expected: PASS and production bundle contains local asset files.

- [ ] **Step 5: Commit**

```bash
git add docs/reference src/assets/reference
git commit -m "assets: add approved dashboard reference artwork"
```

---

### Task 3: Implement centralized design tokens and responsive application shell

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/components/shell/Sidebar.tsx`
- Create: `src/components/shell/Sidebar.test.tsx`
- Create: `src/components/shell/Topbar.tsx`
- Create: `src/components/shell/Footer.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `referenceAssets.brandDiamond`, `referenceAssets.trustArtwork`.
- Produces: `Sidebar`, `Topbar`, `Footer`.

- [ ] **Step 1: Write failing shell tests**

```tsx
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

test("sidebar renders the approved navigation and active dashboard state", () => {
  render(<Sidebar />);
  expect(screen.getByRole("navigation", { name: "منوی اصلی" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "داشبورد" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByText("دستگاه‌ها و اتصالات")).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

```bash
npm test -- --run src/components/shell/Sidebar.test.tsx
```

Expected: FAIL because shell components do not exist.

- [ ] **Step 3: Implement the shell**

Use CSS variables in `tokens.css`, including:

```css
:root {
  --bg-app: #020d18;
  --bg-panel: #071625;
  --bg-panel-raised: #0b1d2f;
  --gold: #d5a23d;
  --gold-soft: #8d6a25;
  --text-primary: #f2f5f8;
  --text-muted: #8396a9;
  --success: #39d98a;
  --border: #18344d;
  --border-gold: #6f5422;
  --radius-card: 14px;
  --sidebar-width: 204px;
  --topbar-height: 76px;
}
```

The shell layout uses CSS Grid rather than absolute page positioning.

- [ ] **Step 4: Verify GREEN**

```bash
npm test -- --run src/components/shell/Sidebar.test.tsx
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles src/components/shell src/app/App.tsx
git commit -m "feat: add approved dark gold application shell"
```

---

### Task 4: Add typed Dashboard fixture data and KPI/hero row

**Files:**
- Create: `src/components/dashboard/dashboard.fixture.ts`
- Create: `src/components/dashboard/dashboard.fixture.test.ts`
- Create: `src/components/dashboard/MetricCard.tsx`
- Create: `src/components/dashboard/HeroCard.tsx`
- Create: `src/components/dashboard/Dashboard.tsx`
- Create: `src/components/dashboard/Dashboard.test.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Produces: `DashboardFixture` type.
- Produces: `dashboardFixture: DashboardFixture`.
- Produces: `Dashboard(): JSX.Element`.
- Consumes: `referenceAssets.heroJewelry`.

- [ ] **Step 1: Write failing fixture test**

```ts
import { dashboardFixture } from "./dashboard.fixture";

test("dashboard fixture defines exactly five approved KPI cards", () => {
  expect(dashboardFixture.metrics).toHaveLength(5);
  expect(dashboardFixture.metrics.map((item) => item.id)).toEqual([
    "products",
    "printed",
    "packaged",
    "outbound",
    "weight",
  ]);
});
```

- [ ] **Step 2: Write failing Dashboard row test**

```tsx
import { render, screen } from "@testing-library/react";
import { Dashboard } from "./Dashboard";

test("dashboard renders five KPI cards and the jewelry hero card", () => {
  render(<Dashboard />);
  expect(screen.getAllByTestId("metric-card")).toHaveLength(5);
  expect(screen.getByTestId("hero-jewelry-card")).toBeInTheDocument();
});
```

- [ ] **Step 3: Verify RED**

```bash
npm test -- --run src/components/dashboard/dashboard.fixture.test.ts src/components/dashboard/Dashboard.test.tsx
```

Expected: FAIL because fixture/components do not exist.

- [ ] **Step 4: Implement fixture, KPI cards and hero card**

Fixture data remains static and typed. No API calls or timers are added.

- [ ] **Step 5: Verify GREEN and commit**

```bash
npm test -- --run src/components/dashboard/dashboard.fixture.test.ts src/components/dashboard/Dashboard.test.tsx
npm run build
git add src/components/dashboard src/app/App.tsx
git commit -m "feat: add dashboard KPI and hero composition"
```

---

### Task 5: Implement analytics and recent activity row

**Files:**
- Create: `src/components/dashboard/DailyActivityChart.tsx`
- Create: `src/components/dashboard/CategoryDonut.tsx`
- Create: `src/components/dashboard/RecentActivity.tsx`
- Create: `src/components/dashboard/analytics.test.tsx`
- Modify: `src/components/dashboard/Dashboard.tsx`
- Modify: `src/components/dashboard/dashboard.fixture.ts`

**Interfaces:**
- Consumes: `dashboardFixture.activitySeries`, `dashboardFixture.categoryDistribution`, `dashboardFixture.recentActivities`.
- Produces semantic sections labeled `نمودار فعالیت روزانه`, `توزیع براساس دسته‌بندی`, and `فعالیت‌های اخیر`.

- [ ] **Step 1: Write failing analytics test**

```tsx
import { render, screen } from "@testing-library/react";
import { Dashboard } from "./Dashboard";

test("renders all approved analytics panels", () => {
  render(<Dashboard />);
  expect(screen.getByText("نمودار فعالیت روزانه")).toBeInTheDocument();
  expect(screen.getByText("توزیع براساس دسته‌بندی")).toBeInTheDocument();
  expect(screen.getByText("فعالیت‌های اخیر")).toBeInTheDocument();
  expect(screen.getAllByTestId("recent-activity-row")).toHaveLength(5);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --run src/components/dashboard/analytics.test.tsx
```

Expected: FAIL because panels do not exist.

- [ ] **Step 3: Implement Recharts-based bar/donut charts and static recent activity list**

Charts are pure presentational components fed by fixture props.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npm test -- --run src/components/dashboard/analytics.test.tsx
npm run build
git add src/components/dashboard
git commit -m "feat: add dashboard analytics and activity panels"
```

---

### Task 6: Implement quick actions, image category gallery, and print queue

**Files:**
- Create: `src/components/dashboard/QuickActions.tsx`
- Create: `src/components/dashboard/CategoryGallery.tsx`
- Create: `src/components/dashboard/PrintQueue.tsx`
- Create: `src/components/dashboard/operations.test.tsx`
- Modify: `src/components/dashboard/Dashboard.tsx`
- Modify: `src/components/dashboard/dashboard.fixture.ts`

**Interfaces:**
- Consumes: seven category reference assets.
- Produces: exactly seven category cards and five print-queue rows.
- Quick action buttons remain visual-only in this phase.

- [ ] **Step 1: Write failing operations test**

```tsx
import { render, screen } from "@testing-library/react";
import { Dashboard } from "./Dashboard";

test("renders approved dashboard operations sections", () => {
  render(<Dashboard />);
  expect(screen.getByText("دسترسی سریع")).toBeInTheDocument();
  expect(screen.getByText("دسته‌بندی‌های اصلی")).toBeInTheDocument();
  expect(screen.getByText("صف چاپ")).toBeInTheDocument();
  expect(screen.getAllByTestId("category-card")).toHaveLength(7);
  expect(screen.getAllByTestId("print-queue-row")).toHaveLength(5);
});
```

- [ ] **Step 2: Verify RED**

```bash
npm test -- --run src/components/dashboard/operations.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement the three sections**

Each category card renders its committed reference image, Persian name and static product count.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npm test -- --run src/components/dashboard/operations.test.tsx
npm run build
git add src/components/dashboard
git commit -m "feat: add dashboard quick actions categories and print queue"
```

---

### Task 7: Implement the bottom device strip and support/footer details

**Files:**
- Create: `src/components/dashboard/DeviceStrip.tsx`
- Create: `src/components/dashboard/DeviceStrip.test.tsx`
- Modify: `src/components/dashboard/Dashboard.tsx`
- Modify: `src/components/shell/Footer.tsx`

**Interfaces:**
- Consumes: `referenceAssets.scale`, `referenceAssets.printer`, `referenceAssets.database`.
- Produces: exactly three visual device cards.
- No native device initialization.

- [ ] **Step 1: Write failing device-strip test**

```tsx
import { render, screen } from "@testing-library/react";
import { DeviceStrip } from "./DeviceStrip";

test("renders the three approved visual device cards", () => {
  render(<DeviceStrip />);
  expect(screen.getAllByTestId("device-card")).toHaveLength(3);
  expect(screen.getByText("ترازوی دیجیتال")).toBeInTheDocument();
  expect(screen.getByText("چاپگر لیبل")).toBeInTheDocument();
  expect(screen.getByText("پایگاه داده")).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

```bash
npm test -- --run src/components/dashboard/DeviceStrip.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement device cards plus support/footer visuals**

Status text is static fixture content only.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npm test -- --run src/components/dashboard/DeviceStrip.test.tsx
npm run build
git add src/components/dashboard src/components/shell/Footer.tsx
git commit -m "feat: add dashboard device strip and footer"
```

---

### Task 8: Lock visual composition and responsive behavior

**Files:**
- Create: `src/styles/dashboard.css`
- Create: `tests/dashboard/dashboard.visual.spec.ts`
- Create: `playwright.config.ts`
- Modify: all Dashboard component class assignments only as required by the approved reference.
- Modify: `package.json`

**Interfaces:**
- Consumes: complete Dashboard DOM.
- Produces: deterministic screenshot at 1600×900 and no horizontal overflow at 1366×768.

- [ ] **Step 1: Write failing Playwright contract**

```ts
import { expect, test } from "@playwright/test";

test("dashboard matches the approved desktop composition envelope", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/");
  await expect(page.getByTestId("dashboard")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1600);
  await expect(page).toHaveScreenshot("dashboard-1600x900.png", {
    fullPage: true,
    animations: "disabled",
  });
});
```

Also add a 1366×768 no-horizontal-overflow test.

- [ ] **Step 2: Run visual test and verify RED**

```bash
npm run test:visual
```

Expected: FAIL because the approved baseline does not exist yet.

- [ ] **Step 3: Tune only CSS/layout until the implementation structurally matches the approved reference**

Required composition constraints:
- sidebar keeps the same left-side visual weight as reference
- KPI row contains five compact cards plus hero
- analytics row proportions match reference
- operations row proportions match reference
- device strip spans full dashboard width
- decorative gold is restrained and not used as large fill areas
- category and device images retain original reference pixels

- [ ] **Step 4: Generate the candidate baseline and run both desktop sizes**

```bash
npm run test:visual -- --update-snapshots
npm run test:visual
npm run build
```

Expected: PASS. The generated screenshot is a candidate only; user approval is still required.

- [ ] **Step 5: Commit**

```bash
git add src/styles tests/dashboard playwright.config.ts package.json
git commit -m "style: match approved dashboard reference composition"
```

---

### Task 9: Add React/Tauri Windows CI, package, and smoke verification

**Files:**
- Create: `.github/workflows/react-tauri-dashboard-ci.yml`
- Create: `scripts/smoke.ps1`
- Modify: `src-tauri/tauri.conf.json`

**Interfaces:**
- Produces: Windows installer/bundle artifact and Dashboard screenshot artifact.
- Consumes: all frontend and Tauri build outputs.

- [ ] **Step 1: Add CI commands that fail until the Tauri package is buildable**

Workflow sequence:

```yaml
- npm ci
- npm test -- --run
- npm run build
- cargo test --manifest-path src-tauri/Cargo.toml
- npm run test:visual
- npm run tauri build
- powershell -ExecutionPolicy Bypass -File scripts/smoke.ps1
```

- [ ] **Step 2: Verify the workflow fails for the first missing packaging/smoke requirement**

Push only after local/static validation; read the actual GitHub Actions failure.

- [ ] **Step 3: Configure Tauri Windows bundle**

`tauri.conf.json` must set:
- productName: `Gold Label Studio Pro`
- identifier: `com.amirnourhan.goldlabelstudiopro`
- frontendDist: `../dist`
- beforeBuildCommand: `npm run build`
- bundle active for Windows

- [ ] **Step 4: Make smoke script verify the packaged executable launches**

The script must start the executable, wait for startup, verify the process remains alive long enough to constitute launch, then terminate it cleanly. Build success alone is not accepted.

- [ ] **Step 5: Run full CI until all jobs pass**

Required green gates:
- Vitest
- TypeScript/Vite production build
- Rust cargo test
- Playwright visual test
- Tauri Windows build
- packaged executable smoke test
- artifact upload

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/react-tauri-dashboard-ci.yml scripts/smoke.ps1 src-tauri/tauri.conf.json
git commit -m "ci: verify React Tauri dashboard Windows build"
```

---

## Final Verification Checklist

- [ ] `npm test -- --run` exits 0.
- [ ] `npm run build` exits 0.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` exits 0.
- [ ] `npm run test:visual` exits 0.
- [ ] GitHub Windows CI is green.
- [ ] Packaged application itself is smoke-launched by CI.
- [ ] Dashboard screenshot artifact is available for user review.
- [ ] All runtime Dashboard image references are local.
- [ ] Exactly five KPI cards, seven category cards and three device cards exist.
- [ ] No product/scale/printer/database business logic has been introduced.
- [ ] User visual approval is still required before merging or continuing to feature logic.

## Self-Review

- Spec coverage: Tasks 1–9 cover foundation, fixed assets, shell, all Dashboard sections, responsive visual testing, Windows Tauri packaging and executable smoke verification.
- Placeholder scan: no incomplete or deferred implementation instructions remain.
- Type consistency: `referenceAssets`, `DashboardFixture`, `dashboardFixture`, and `Dashboard` are defined once and reused consistently.
- Scope check: this plan deliberately ends at Dashboard visual approval and does not include business logic.
