# Final UI Clean Refactor Design

## Goal

Preserve the approved Gold Label Studio Pro UI exactly while reorganizing the React/Tauri codebase for the later addition of real product, printing, scanner, device, backup, and user-management logic.

## Baseline and Scope

- UI baseline: `react-tauri-dashboard` at commit `eed2854e05252a3963b9bee05226b68700ad0970`.
- The left sidebar, dark/gold theme, RTL behavior, page layouts, spacing, fonts, responsive breakpoints, and visual assets are frozen during this work.
- Only UI structure, static data placement, type contracts, empty service contracts, route configuration, imports, and stylesheet organization are in scope.
- No database, printer, scanner, scale, backup, authentication, or user-management behavior is implemented.
- `گزارش` remains absent and the visible name and route for returns remain `مرجوع کالا` / `returns`.

## Architecture

The application will keep React components and page CSS feature-local so the approved selectors and layout behavior stay stable. Shared shell components remain under `components/shell`; only reusable primitives that have real repeated consumers will move to `components/common`, `components/cards`, `components/forms`, `components/tables`, or `components/feedback`.

Static visual fixtures move out of page JSX into `data/mock`. Cross-feature data shapes move into `types`. Empty service interfaces and UI-safe mock adapters move into `services`; pages do not call a real backend or Tauri device API.

## Target Structure

```text
src/
├─ app/                    # App route registry and composition
├─ assets/reference/       # Approved static image assets only
├─ components/
│  ├─ cards/               # Reused stat and preview card primitives
│  ├─ common/              # Page container, scroll panel, icon button
│  ├─ feedback/            # Reused status badge/indicator primitives
│  ├─ forms/               # UI-only input/select/button primitives
│  ├─ shell/               # AppShell, Sidebar, Topbar, Footer
│  └─ tables/              # Shared UI-only data table primitive
├─ data/mock/              # Feature fixtures without React rendering code
├─ features/
│  ├─ dashboard/
│  ├─ products/
│  ├─ operations/          # Existing approved operation page CSS remains local
│  └─ settings/
├─ services/               # Typed interfaces and display-only adapters
├─ styles/                 # tokens, global, rtl, responsive, dashboard styles
├─ types/                  # Domain data contracts
└─ utils/                  # Pure, UI-safe helpers only when duplicated
```

## Shared Component Rules

- Extract only a component that is used by at least two page areas or encodes a stable UI contract.
- The extracted component accepts `className` and preserves caller-owned page CSS. It must not introduce default spacing, palette, or layout decisions that alter approved pages.
- Existing page-specific markup stays inside its feature if it is unique to that page.
- No generic component is added merely to match a folder name.

## Data and Service Contracts

`types` defines readonly presentation-friendly records for products, product groups, scans, packages, labels, devices, users, and page routes. `data/mock` exposes static arrays and fixtures implementing those contracts. `services` exports interfaces such as `ProductRepository`, `PrintService`, `ScannerService`, and `DeviceSettingsRepository`, plus display-only adapters that return mock data without side effects.

This gives a future logic phase one replacement point per data source while keeping current UI behavior unchanged.

## Route and Terminology Rules

- Route ownership moves from a nested conditional in `App` to a typed route registry.
- The registry only maps existing page IDs and render functions; URL query behavior remains unchanged.
- `returns` remains the route ID and all visible Persian copy remains `مرجوع کالا`.
- No route, sidebar entry, menu item, or placeholder for reports is retained.

## Styling Rules

- Approved selectors and their rendered rules remain stable unless a selector moves with its owner.
- Shared design values stay in `styles/tokens.css`; global, RTL, and responsive layers retain their current load order.
- Feature CSS is not merged into a broad stylesheet if that could change cascade order.
- Scroll containers retain `min-height: 0`, scoped overflow, and existing themed scrollbars.

## Verification

1. Extend or preserve tests for route registry, navigation labels, terminology, fixture contracts, and service adapters.
2. Run `npm run test:run` and require all tests to pass.
3. Run `npm run build` and require TypeScript and Vite to succeed.
4. Run `npm run tauri build -- --no-bundle` when the environment supports the Windows toolchain.
5. Run the existing visual-check workflow for Dashboard, product registration, products, label print, label designer, packaging, returns, and settings at 1366×768, 1440×900, 1536×864, 1600×900, and 1920×1080.
6. Inspect the visual artifacts against the approved baseline and stop for review if any visual difference is introduced.

## Commit Strategy

1. Mark the approved UI baseline with the `ui-approved-v1.0.0` tag.
2. Commit the design and implementation plan separately from UI refactor code.
3. Commit each independently testable refactor stage with its tests.
4. Finish with one clean `refactor: prepare approved UI for application logic` commit and CI-generated Windows executable.
