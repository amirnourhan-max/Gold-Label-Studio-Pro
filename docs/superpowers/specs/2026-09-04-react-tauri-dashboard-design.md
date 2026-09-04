# React + Tauri Dashboard Migration Design

**Date:** 2026-09-04  
**Repository:** amirnourhan-max/Gold-Label-Studio-Pro  
**Branch:** react-tauri-dashboard  
**Status:** Design approved in chat, implementation pending written-spec review

## 1. Scope

This sub-project replaces the PySide6 UI foundation with a new Windows desktop foundation using React + TypeScript + Tauri, before any heavy business logic is implemented.

The scope of this design is intentionally limited to:
1. React/Tauri application foundation.
2. Pixel-accurate implementation of the approved Dashboard.
3. Fixed local assets derived from the approved reference mockup.
4. Automated tests and Windows build verification.

The following remain out of scope until Dashboard approval:
- product registration behavior
- scale/serial integration
- database schema and persistence
- QR generation
- printing
- label designer behavior
- packaging
- outbound scanning
- reports

## 2. Visual Source of Truth

The approved Dashboard reference image in the project conversation is the visual source of truth.

The implementation must reproduce, as closely as practical:
- dark navy background
- restrained gold borders and highlights
- left navigation rail
- top search/header area
- five KPI cards
- hero jewelry card
- daily activity chart
- category donut chart
- recent activity list
- quick-action block
- jewelry category gallery
- print queue
- three bottom device cards
- support button
- footer
- fixed jewelry/device/logo imagery

No discretionary visual redesign is authorized.

## 3. Asset Strategy

The visual assets must be local and deterministic.

Rules:
- Do not fetch runtime images from the web.
- Do not regenerate assets at runtime.
- Do not replace approved imagery with emoji.
- Do not use generic icon substitutes where a reference asset exists.
- Store fixed reference assets under `src/assets/reference/`.
- Use SVG for geometric UI icons when exact raster artwork is not required.
- Use PNG/WebP for jewelry, device and decorative reference artwork.
- Assets should be cropped/processed once from the approved model-generated reference and then treated as immutable application assets.
- CSS must position and size those assets; the application must not depend on the original full mockup image as a background screenshot.

Expected fixed asset set includes:
- brand diamond mark
- hero jewelry/ring composition
- ring category
- bracelet category
- necklace category
- earrings category
- pendant/tag category
- service/set category
- chain category
- scale device image
- label printer image
- database image
- trust/decorative artwork
- sidebar icons
- dashboard card icons where raster treatment is required

## 4. Technology

Frontend:
- React
- TypeScript
- Vite
- CSS Modules or scoped component CSS plus centralized design tokens
- Recharts for dashboard charts where appropriate
- Lucide React for non-reference utility icons only

Desktop shell:
- Tauri 2
- Rust stable
- Windows WebView2

Testing:
- Vitest
- React Testing Library
- Playwright for visual/smoke checks where practical
- Rust `cargo test`
- Tauri build verification on Windows CI

Future native integrations:
- Rust command layer for scale/serial communication
- Rust command layer for printer integration
- SQLite accessed behind Rust service/repository boundaries

## 5. Repository Architecture

```
src/
  app/
    App.tsx
    routes.ts
  components/
    shell/
      Sidebar.tsx
      Topbar.tsx
      Footer.tsx
    dashboard/
      MetricCard.tsx
      HeroCard.tsx
      DailyActivityChart.tsx
      CategoryDonut.tsx
      RecentActivity.tsx
      QuickActions.tsx
      CategoryGallery.tsx
      PrintQueue.tsx
      DeviceStrip.tsx
  assets/
    reference/
  styles/
    tokens.css
    global.css
    dashboard.css
  test/
    setup.ts

src-tauri/
  src/
    main.rs
    lib.rs
  capabilities/
  icons/
  tauri.conf.json
  Cargo.toml

tests/
  dashboard/
```

## 6. Design Tokens

All layout and colors must come from centralized CSS variables.

Required token groups:
- page background
- panel background
- panel elevated background
- gold primary
- gold soft
- text primary
- text muted
- success green
- warning orange
- info blue
- border base
- border gold
- shadow/glow
- radii
- spacing
- sidebar width
- topbar height
- control heights

No repeated ad-hoc hex values in component files unless representing chart-series data.

## 7. Window and Layout

Target design viewport:
- 1600 × 900 reference
- responsive down to 1366 × 768 without horizontal clipping
- Windows resizable

Main grid:
- fixed left sidebar approximately matching the reference ratio
- remaining space contains topbar + dashboard content
- dashboard content uses CSS Grid
- no absolute positioning for the entire page
- controlled absolute positioning is allowed only inside isolated decorative components

The UI remains RTL for Persian content while English product branding stays LTR where needed.

## 8. Dashboard Composition

### Sidebar
Contains:
- brand mark and Gold Label Studio Pro title
- version
- navigation items
- devices/connections section
- three connection status cards
- decorative trust artwork

### Topbar
Contains:
- central search field
- keyboard shortcut hint
- notification/settings utility actions
- user profile block
- Windows/Tauri titlebar integration may be introduced later; v1 may use the normal OS frame if that reduces risk

### KPI row
Five cards:
- products today
- printed labels
- packaged items
- outbound scans
- total weight today

Each card has:
- icon
- Persian label
- large value
- unit
- comparison/secondary line
- micro-chart/glow decoration if present in reference

### Hero card
Contains the fixed approved jewelry composition and welcome/date information.

### Analytics row
- daily activity bar chart
- category donut
- recent activity list

### Operations row
- quick actions
- image-based category gallery
- print queue

### Device strip
Three cards:
- scale
- label printer
- database

These are visual-only in this sub-project. Status values are static display data until their respective functional phases.

## 9. Data Strategy for Dashboard Phase

Dashboard data is static typed fixture data only.

Create:
`src/components/dashboard/dashboard.fixture.ts`

This avoids fake backend behavior while allowing exact UI rendering.

The fixture must be clearly isolated so future live data can replace it through a single adapter interface.

No persistence or mocked API server is introduced.

## 10. Accessibility and Interaction

- keyboard focus must be visible
- buttons must use semantic elements
- sidebar navigation must expose active state
- decorative images use empty alt text
- meaningful category/device images have localized alt text
- color alone must not be the only status signal

## 11. Testing

Frontend contract tests must verify:
- all dashboard sections render
- exactly five KPI cards render
- exactly seven category image cards render
- exactly three device cards render
- sidebar active item behavior
- asset references resolve locally
- no remote image URLs are present in Dashboard components

Visual regression:
- Playwright captures the Dashboard at 1600×900
- screenshot artifact is uploaded by CI
- user approval remains the final visual gate

Build verification:
- `npm run build`
- `cargo test`
- `npm run tauri build` on Windows
- CI must launch the packaged application or perform a Tauri smoke check before the artifact is considered deliverable

## 12. Error Handling

For this visual-only phase:
- asset-load failures must not crash the app
- React error boundary wraps the main app
- Tauri startup errors are logged
- no native device initialization occurs

## 13. Migration Policy

The existing `phase-1-foundation` PySide6 branch is retained as history and fallback.

The new React/Tauri work starts from `main` on `react-tauri-dashboard`.

No PySide6 production code is copied into the Tauri implementation.

The original Python architecture spec remains historical documentation; this specification supersedes it for the active implementation stack.

## 14. Acceptance Criteria

This sub-project is complete only when:
- React + TypeScript app runs in browser development mode
- Tauri Windows shell opens the same UI
- Dashboard follows the approved reference composition
- fixed local reference assets are used
- all dashboard contract tests pass
- frontend production build passes
- Rust tests pass
- Tauri Windows build passes
- packaged Windows app is smoke-tested
- a Windows artifact is produced
- user visually approves the Dashboard

## 15. Explicit Non-Goals

Do not implement:
- real dashboard metrics
- scale serial protocol
- printer commands
- SQLite models
- authentication
- customer CRUD
- product CRUD
- package workflows
- QR
- Label Designer
- reports

Those begin only after the Dashboard visual gate is approved.
