# Gold Label Studio Pro — Foundation & UI Design Specification

**Date:** 2026-09-04  
**Repository:** amirnourhan-max/Gold-Label-Studio-Pro  
**Status:** Approved direction, implementation not started

## 1. Product Goal
Build a standalone Windows desktop application for jewelry product registration, weight capture, QR label design/printing, packaging, inventory movement, fast outbound scanning, duplicate-scan prevention, reporting, and future extensibility.

The UI is a first-class requirement. The approved Dark + Gold Persian RTL mockups in the project conversation are the visual source of truth. No discretionary UI redesign is allowed without user approval.

## 2. Technology Baseline
- Python 3.13
- PySide6 / Qt 6
- SQLAlchemy for persistence abstraction
- SQLite for initial single-workstation mode
- PostgreSQL-ready repository/service boundaries for future network mode
- QR generation isolated behind a QR service
- Direct printer adapters isolated behind a printing interface (ZPL/TSPL-capable)
- Nuitka for production Windows builds
- pytest + pytest-qt for automated testing

## 3. Development Rules
1. UI-first: build and review each page visually before adding heavy business logic.
2. Pixel-accurate target: Dark + Gold, Persian RTL, approved spacing, card geometry, sidebar, typography hierarchy, forms and tables.
3. No placeholders or half-wired production features.
4. No duplicate implementation: inspect existing code before adding a new capability.
5. Reuse the final Gold Bar scale/settings module when its source becomes available and is compatible; otherwise preserve the same user interaction contract and implement a clean adapter.
6. Device failures, printer failures, QR failures and database failures must be handled without crashing the application.
7. Sensitive workflows receive automated tests before being considered complete.
8. Each phase ends with a runnable build and a clean commit history.
9. Scope is frozen unless the user explicitly changes it.

## 4. Initial Architecture
```
src/gold_label_studio/
  app/                 # startup, application wiring, navigation
  ui/
    shell/             # main window, sidebar, top bar, status bar
    theme/             # palette, typography, spacing, QSS tokens
    pages/             # one module per approved page
    widgets/           # reusable visual components
  domain/
    products/          # product/category entities and rules
    labels/            # templates and label document model
    packaging/         # package aggregate and membership rules
    inventory/         # item state transitions
    scanning/          # scan session rules and duplicate detection
  services/
    scale/             # scale abstraction and adapters
    qr/                # QR payload/generation
    printing/          # printer abstraction and adapters
    reporting/         # Excel/PDF reporting
    backup/            # backup/restore
  infrastructure/
    database/          # SQLAlchemy engine, repositories, migrations
    settings/          # application/device settings
    logging/           # structured application logging
tests/
  unit/
  ui/
  integration/
docs/
  superpowers/
    specs/
    plans/
```

## 5. UI System
### Visual source of truth
The approved mockups define:
- dark navy/charcoal base
- restrained gold accent
- Persian RTL composition
- compact professional desktop density
- rounded panels/cards
- high contrast status states
- visually prominent weight, scan, print and package actions
- persistent device status for scale/printer/database where applicable

### Shared shell
- Left navigation sidebar in RTL-aware layout
- Top application bar
- Main content host
- Optional contextual right panel where mockup requires it
- Bottom status area for user/version/device state
- Navigation does not rebuild the entire main window

### Theme implementation
Theme values must be centralized as design tokens rather than scattered QSS literals:
- colors
- spacing
- corner radii
- typography sizes/weights
- border widths
- status colors
- control heights

## 6. Approved Page Set
Implementation order for UI approval:
1. Dashboard
2. Product Registration
3. Label Designer
4. Packaging
5. Product Exit / Scan
6. Product List / Inventory
7. Reports
8. Settings

No heavy domain logic is added to a page before its UI is approved.

## 7. Product Registration UI Contract
Must support:
- product group/category
- subgroup
- product name
- internal/display code
- manual weight entry
- scale weight capture via Up Arrow interaction consistent with Gold Bar
- assay/fineness
- size
- quantity
- workshop/manufacturer
- optional notes
- template selection
- live label preview
- register
- print
- print + register
- clear form
- visible device status

## 8. Label Designer UI Contract
A BarTender-inspired but jewelry-focused designer with:
- drag/drop canvas
- rulers, guides, grid and snapping
- zoom
- undo/redo
- selection, move, resize, rotate
- text, variable, QR, image/logo, line, rectangle/shape, table
- property inspector
- layers/group/lock
- template save/copy/import/export architecture
- multiple saved templates
- template preview
- label dimensions in physical units
- QR mandatory capability

Template persistence uses a versioned document schema independent of widget state.

## 9. QR Strategy
Jewelry labels are physically small. QR content must therefore stay compact.

The QR payload stores a short unique identifier, not the complete product record. Product details remain in the database. The display code may be human-readable and structured, while the database primary identity remains stable and independent of product category naming.

QR sizing, quiet zone and error correction will be validated against the target printer/label dimensions during the printing phase.

## 10. Packaging Workflow
- start package
- scan/add products rapidly
- manual product-code fallback
- duplicate detection within the package/session
- live item count
- live total weight
- remove last/selected item with controlled history
- finish package
- choose a package-label template
- print package label
- package receives its own identity/QR

A product already locked into an active/final package cannot silently be added to another incompatible package state.

## 11. Outbound Scan Workflow
Optimized for keyboard-wedge/USB 2D scanner speed:
- scanner input always returns focus to scan target
- Enter-terminated scan processing
- immediate success feedback
- immediate duplicate-scan error
- no duplicate outbound transaction
- unknown-code error
- live total item count
- live total weight
- session history
- controlled undo of last valid action
- end session and report

The hot path must not perform slow synchronous UI-blocking work.

## 12. Data Integrity
Core transitions are explicit and auditable:
- registered
- labeled
- packaged
- outbound
- returned/adjusted where later approved

Weight changes after a committed/printed record require an audited edit rather than silent mutation.

## 13. Error Handling
- UI event handlers must not expose raw exceptions to the user.
- Domain errors produce clear Persian messages.
- Device adapters return typed status/errors.
- Database writes use transactions.
- printing is recorded separately from product creation so retries do not duplicate products.
- scan duplicate detection is enforced in domain/service logic, not only in UI.

## 14. Test Strategy
- unit tests for identifiers, state transitions, totals, duplicate scans and template serialization
- UI tests for navigation, RTL-critical layout presence, form behavior and keyboard shortcuts
- integration tests for repository transactions
- adapter-level tests/mocks for scale and printer
- smoke test for packaged Windows build

## 15. Phase Roadmap
1. Foundation/scaffold
2. Approved UI shell and pages
3. Product/category workflow
4. Scale/manual weight
5. Database
6. QR/identity
7. Printing
8. Label Designer behavior
9. Packaging
10. Outbound scanning/duplicate detection
11. Totals
12. Package labels
13. Reports
14. Settings/backup
15. Verification/installer

## 16. Phase-1 Acceptance Criteria
Phase 1 is complete only when:
- project starts cleanly on Python 3.13
- main application shell opens
- module boundaries above exist without circular imports
- central theme/token system exists
- navigation framework exists
- logging and configuration bootstrap exist
- baseline tests run
- no heavy product/printing/database business logic is prematurely implemented
- a runnable development build is produced

## 17. Scope Boundary
This specification does not authorize visual changes outside the approved mockups, new business modules, mobile applications, web services, accounting integration or RFID. Those require explicit user approval.
