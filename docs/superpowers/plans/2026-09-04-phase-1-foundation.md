# Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a clean, testable Python 3.13 / PySide6 foundation for Gold Label Studio Pro with a centralized Dark + Gold RTL theme, main application shell, navigation framework, configuration, logging, and baseline tests—without heavy product, printer, scale, database, or scan business logic.

**Architecture:** Use a src-layout package with strict separation between application bootstrap, reusable UI shell/theme primitives, and infrastructure bootstrap. The shell owns navigation and visual composition only. Future domain modules plug into page boundaries without circular imports.

**Tech Stack:** Python 3.13, PySide6/Qt6, pytest, pytest-qt, Ruff, Nuitka (build dependency declared for later Windows packaging).

**Spec:** `docs/superpowers/specs/2026-09-04-foundation-ui-design.md`

## Global Constraints
- UI source of truth is the approved Dark + Gold Persian RTL mockup set.
- No discretionary visual redesign.
- UI-first; no heavy business logic in Phase 1.
- Python 3.13 + PySide6/Qt6.
- Centralized design tokens; no scattered style constants.
- Errors must not crash the application shell.
- TDD for production behavior.
- Clean modular boundaries; no circular imports.

---

### Task 1: Project package, metadata, and application settings

**Files:**
- Create: `pyproject.toml`
- Create: `.gitignore`
- Create: `README.md`
- Create: `src/gold_label_studio/__init__.py`
- Create: `src/gold_label_studio/app/__init__.py`
- Create: `src/gold_label_studio/app/settings.py`
- Test: `tests/unit/test_settings.py`

**Interfaces:**
- Produces: `AppSettings(app_name: str, version: str, organization: str)`
- Produces: `default_settings() -> AppSettings`

- [ ] Step 1: Write failing tests asserting the application name, version and organization are centralized and immutable through a frozen dataclass.
- [ ] Step 2: Run `python -m pytest tests/unit/test_settings.py -v`; verify failure because the package/settings module does not exist.
- [ ] Step 3: Add pyproject metadata and the minimal settings implementation.
- [ ] Step 4: Run the settings test and full test suite; verify pass.
- [ ] Step 5: Commit `chore: bootstrap Python project foundation`.

### Task 2: Centralized design-token system and stylesheet renderer

**Files:**
- Create: `src/gold_label_studio/ui/__init__.py`
- Create: `src/gold_label_studio/ui/theme/__init__.py`
- Create: `src/gold_label_studio/ui/theme/tokens.py`
- Create: `src/gold_label_studio/ui/theme/stylesheet.py`
- Test: `tests/unit/test_theme_tokens.py`
- Test: `tests/unit/test_stylesheet.py`

**Interfaces:**
- Produces: `ThemeTokens` frozen dataclass
- Produces: `DARK_GOLD_TOKENS`
- Produces: `build_stylesheet(tokens: ThemeTokens) -> str`

- [ ] Step 1: Write failing tests for the required palette, spacing/radius/control-height tokens and for stylesheet output containing the approved accent/surface values.
- [ ] Step 2: Run theme tests; verify expected import failures.
- [ ] Step 3: Implement centralized tokens and stylesheet generation with no business logic.
- [ ] Step 4: Run theme tests and full suite; verify pass.
- [ ] Step 5: Commit `feat: add centralized dark gold theme system`.

### Task 3: Navigation model and page registry

**Files:**
- Create: `src/gold_label_studio/app/navigation.py`
- Test: `tests/unit/test_navigation.py`

**Interfaces:**
- Produces: `PageId` enum for dashboard, product_registration, label_print, label_designer, packaging, outbound, products, reports, settings.
- Produces: `NavigationItem(page_id: PageId, title_fa: str, icon_key: str)`
- Produces: `default_navigation() -> tuple[NavigationItem, ...]`

- [ ] Step 1: Write failing tests for exact ordered page set and Persian labels.
- [ ] Step 2: Run navigation tests; verify expected import failure.
- [ ] Step 3: Implement enum/model/registry.
- [ ] Step 4: Run navigation tests and full suite; verify pass.
- [ ] Step 5: Commit `feat: add stable navigation registry`.

### Task 4: Reusable shell widgets

**Files:**
- Create: `src/gold_label_studio/ui/shell/__init__.py`
- Create: `src/gold_label_studio/ui/shell/sidebar.py`
- Create: `src/gold_label_studio/ui/shell/topbar.py`
- Create: `src/gold_label_studio/ui/shell/statusbar.py`
- Create: `src/gold_label_studio/ui/widgets/__init__.py`
- Create: `src/gold_label_studio/ui/widgets/nav_button.py`
- Test: `tests/ui/test_shell_widgets.py`

**Interfaces:**
- Produces: `Sidebar(items: tuple[NavigationItem, ...])` with `page_requested(PageId)` signal.
- Produces: `TopBar`
- Produces: `AppStatusBar`
- Produces: `NavButton`

- [ ] Step 1: Write failing pytest-qt tests verifying RTL direction, nav-button count, emitted page identifiers and stable object names used by QSS.
- [ ] Step 2: Run shell-widget tests; verify expected failure.
- [ ] Step 3: Implement minimal visual widgets driven only by the navigation registry and theme object names.
- [ ] Step 4: Run UI tests in offscreen mode and full suite; verify pass.
- [ ] Step 5: Commit `feat: add RTL application shell widgets`.

### Task 5: Main window composition and page host

**Files:**
- Create: `src/gold_label_studio/ui/pages/__init__.py`
- Create: `src/gold_label_studio/ui/pages/base_page.py`
- Create: `src/gold_label_studio/ui/pages/dashboard_page.py`
- Create: `src/gold_label_studio/ui/main_window.py`
- Test: `tests/ui/test_main_window.py`

**Interfaces:**
- Produces: `BasePage(page_id: PageId, title: str)`
- Produces: `DashboardPage`
- Produces: `MainWindow`
- MainWindow uses a single `QStackedWidget` page host and does not recreate the shell during navigation.

- [ ] Step 1: Write failing tests verifying RTL main window, shell composition, initial dashboard selection and stable stacked-page behavior.
- [ ] Step 2: Run main-window tests; verify expected failure.
- [ ] Step 3: Implement MainWindow plus the dashboard visual foundation only; no charts/data services/business logic.
- [ ] Step 4: Run UI tests and full suite; verify pass.
- [ ] Step 5: Commit `feat: compose Gold Label Studio main window`.

### Task 6: Bootstrap, logging, guarded startup, and development smoke run

**Files:**
- Create: `src/gold_label_studio/app/logging_config.py`
- Create: `src/gold_label_studio/app/bootstrap.py`
- Create: `src/gold_label_studio/__main__.py`
- Test: `tests/unit/test_bootstrap.py`
- Test: `tests/ui/test_app_smoke.py`

**Interfaces:**
- Produces: `configure_logging() -> None`
- Produces: `create_application(argv: list[str] | None = None) -> QApplication`
- Produces: `create_main_window() -> MainWindow`
- Produces: `run() -> int`

- [ ] Step 1: Write failing tests for deterministic QApplication creation, theme application, logging bootstrap and one-window smoke construction.
- [ ] Step 2: Run bootstrap/smoke tests; verify expected failure.
- [ ] Step 3: Implement guarded startup with top-level exception logging and no device/database initialization.
- [ ] Step 4: Run `QT_QPA_PLATFORM=offscreen python -m pytest -v` and `QT_QPA_PLATFORM=offscreen python -m gold_label_studio --smoke-test`; verify clean exits.
- [ ] Step 5: Commit `feat: add guarded application bootstrap and smoke test`.

### Task 7: Phase-1 verification and developer documentation

**Files:**
- Modify: `README.md`
- Create: `docs/development.md`

**Interfaces:**
- Documents exact setup, test, lint and smoke-run commands.

- [ ] Step 1: Run `python -m pytest -v`.
- [ ] Step 2: Run `python -m ruff check src tests`.
- [ ] Step 3: Run `python -m compileall -q src`.
- [ ] Step 4: Run the offscreen smoke command.
- [ ] Step 5: Review the file tree against Phase-1 acceptance criteria and confirm no heavy business modules are implemented.
- [ ] Step 6: Commit `docs: add phase one development guide`.

## Self-Review
- Spec coverage: all Phase-1 acceptance criteria are mapped to Tasks 1–7.
- Placeholder scan: no production TODO/TBD steps are authorized.
- Type consistency: settings, navigation, shell, MainWindow and bootstrap interfaces are defined once and reused consistently.
- Scope check: Phase 1 intentionally excludes product logic, scale protocol, database persistence, QR generation, printing and scanning behavior.
