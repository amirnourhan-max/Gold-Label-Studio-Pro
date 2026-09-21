# Label Designer Repair v0.2.3 — Design

## Goal

Repair the existing Label Designer without changing unrelated application behavior. The canonical `LabelDocument` remains the single persisted and printed representation. UI changes are limited to making existing designer controls truthful and usable.

## Boundaries

- Production data comes only from `LabelTemplateGateway`; demo data exists only behind a build-time visual-test entry.
- React does not access SQL or printer transport directly.
- The editor owns one canonical `LabelDocument`; persistence and printing accept that complete document.
- Stored legacy arrays remain readable, while malformed stored JSON becomes an explicit non-destructive error.
- Thermal output is monochrome. Unsupported appearance values are constrained or clearly disabled.
- Visual CI runs a test-only build, waits for the real designer selectors, performs real insertions, and fails before taking a screenshot when readiness assertions fail.

## State model

The page has explicit template states (`loading`, `ready`, `empty`, `error`), an active template identity, a last-saved serialized document snapshot, and a selected tool. Dirty state is derived by comparing the canonical document/name with that saved snapshot. Destructive transitions use Save / Discard / Cancel.

Insertion tools arm the canvas. A canvas click is converted from preview pixels to millimetres, the element is constrained to the physical label, inserted at that point, selected, and the tool returns to Select. Select mode alone starts move/resize gestures. Text double-click enters an inline editor; editor keyboard events never reach canvas shortcuts.

## Persistence and previews

`PersistenceTemplateGateway` decodes valid legacy arrays and complete documents, but throws a typed corruption error for malformed or structurally invalid JSON. It never substitutes an empty document. The original row remains untouched until an explicit save replaces it.

Template cards render an SVG/DOM projection of each template's actual loaded `LabelDocument`. Preview load failures are shown on the affected card and never replaced with reference artwork.

## Printing

`LabelPrintWorkflow.printCurrentDocument` accepts the current full `LabelDocument`, resolved sample/product bindings and copies. It directly calls `buildLabelPrintModel`, then the configured printer renderer and transport. Saved-template printing loads a full template document and uses the same builder. Legacy JSON parsing is confined to persistence compatibility.

Rotations are carried per print element and emitted in the native orientation parameter of ZPL/TSPL commands. QR quiet zone, barcode human-readable space and rotated bounds are calculated consistently in the canvas, geometry layer and printer-neutral model.

## Image assets

Imported raster files are decoded in the UI, converted to a deterministic monochrome 1-bit bitmap, and stored through a small asset gateway. Production uses Tauri commands backed by the app data directory; tests use an in-memory gateway. The document persists a managed asset id, never an arbitrary temporary path. The print model resolves bitmap bytes and both ZPL (`^GFA`) and TSPL (`BITMAP`) emit actual pixels. A missing/corrupt asset is an explicit error, never a placeholder box.

## Verification

Unit tests cover each pure boundary. Component tests exercise real editor transitions. A deterministic acceptance test creates, edits, saves, reloads, prints the unsaved document, restarts the persistence fake and compares geometry plus ZPL/TSPL output. Visual CI uses a compile-time visual-test entry and browser automation that asserts the actual designer, toolbox, canvas, properties and templates before inserting text/QR/barcode and capturing all six resolutions.

