# Label Designer Repair v0.2.3 Implementation Plan

> **Execution:** Use strict red/green TDD for each task. Keep commits scoped. Do not change schema/migrations or unrelated features.

**Goal:** Make Label Designer persistence, editing, printing, previews and visual CI truthful and production-ready, then release v0.2.3.

**Architecture:** Preserve `LabelDocument` as the canonical millimetre model. Add small gateways only at external boundaries (template persistence, managed assets, printer transport). Keep editor transitions pure where possible and React responsible only for orchestration/presentation.

**Stack:** React 19, TypeScript, Vitest/Testing Library, Tauri 2/Rust, SQLite plugin, ZPL II, TSPL2, GitHub Actions/Windows.

---

## Task 1: Honest visual-test entry and readiness gate

**Files:**
- Create: `src/app/visual-test-mode.ts`
- Create: `src/app/VisualTestApp.tsx`
- Create: `scripts/capture-visual-checks.mjs`
- Modify: `src/app/App.tsx`
- Modify: `package.json`
- Modify: `.github/workflows/react-tauri-dashboard-ci.yml`
- Test: `src/app/VisualTestApp.test.tsx`

1. Write a failing test proving explicit visual-test mode renders the actual `label-designer-page` with toolbox, canvas, properties and template panel, while normal builds do not expose the test entry.
2. Add a build-time-only `VITE_VISUAL_TEST_MODE` branch with deterministic in-memory designer providers and three real initial elements.
3. Add browser capture script that waits for selectors, asserts loading/auth/error screens are absent, inserts text/QR/barcode through the real UI, then writes screenshots.
4. Replace raw Edge screenshot calls for Label Designer with the readiness-gated script at all six resolutions.
5. Run focused tests and a local production build with and without the flag.
6. Commit and push this checkpoint.

## Task 2: Corruption-safe canonical template persistence

**Files:**
- Modify: `src/services/label-templates/template-contract.ts`
- Modify: `src/services/label-templates/persistence-template-gateway.ts`
- Modify: `src/services/label-designer/label-document.ts`
- Modify: `src/services/label-templates/template-document-persistence.test.ts`
- Modify: `src/services/label-templates/template-gateways.test.ts`

1. Add failing tests for malformed JSON, invalid object shape and valid legacy element arrays.
2. Add a typed `CorruptLabelTemplateError` carrying only safe metadata.
3. Decode complete documents or legacy arrays; throw on corruption instead of returning `{}`/empty elements.
4. Prove load does not update/overwrite the repository row.
5. Run focused persistence/document tests and commit.

## Task 3: Canonical current-document print workflow

**Files:**
- Modify: `src/services/printer/print-runtime.ts`
- Modify: `src/services/printer/label-print-model.ts`
- Modify: `src/features/operations/LabelDesignerPage.tsx`
- Modify: `src/services/printer/print-runtime.test.ts`
- Modify: `src/services/printer/label-print-model.test.ts`
- Modify: `src/features/operations/LabelDesignerPage.test.tsx`

1. Add failing tests that edit an unsaved document and assert sent print model reflects the edit and retains dimensions/version path.
2. Add `printCurrentDocument` to `LabelPrintWorkflow` and build directly from the provided canonical document.
3. Refactor saved-template resolution to pass the full loaded document rather than `JSON.stringify(document.elements)`.
4. Wire Test Print to the current editor document and sample binding context.
5. Preserve saved-template printing elsewhere and run focused tests.
6. Commit and push.

## Task 4: Real tools, point insertion and inline text editing

**Files:**
- Modify: `src/features/operations/label-designer/LabelToolbox.tsx`
- Modify: `src/features/operations/label-designer/LabelCanvas.tsx`
- Modify: `src/features/operations/LabelDesignerPage.tsx`
- Modify: `src/services/label-designer/label-editor.ts`
- Modify: `src/services/label-designer/label-geometry.ts`
- Modify: `src/features/operations/label-designer.css`
- Modify: `src/features/operations/LabelDesignerEditing.test.tsx`
- Modify: `src/services/label-designer/label-editor.test.ts`
- Modify: `src/services/label-designer/label-geometry.test.ts`

1. Add failing tests for real active tool, canvas-position insertion, bounds constraint, auto-return to Select and non-stacking placement.
2. Add explicit `DesignerTool` state and a canvas insertion callback with mm coordinates.
3. Use pointer capture for move/resize, preserve zoom precision, and keep resize handles usable at low zoom.
4. Add failing tests for double-click inline text edit, Enter commit, Escape cancel, and shortcut/drag suppression while editing.
5. Implement accessible inline editing and keyboard isolation.
6. Run focused editor/component tests and commit.

## Task 5: Contextual properties, lifecycle and dirty protection

**Files:**
- Modify: `src/features/operations/label-designer/LabelPropertiesPanel.tsx`
- Modify: `src/features/operations/LabelDesignerPage.tsx`
- Create: `src/features/operations/label-designer/TemplatePreview.tsx`
- Modify: `src/features/operations/label-designer.css`
- Modify: `src/features/operations/LabelDesignerPage.catalog-states.test.tsx`
- Modify: `src/features/operations/LabelDesignerPage.test.tsx`
- Modify: `src/features/operations/LabelDesignerEditing.test.tsx`

1. Add failing tests that irrelevant controls are absent for each element kind and active tabs follow click/scroll.
2. Render per-kind property sections and only supported monochrome controls.
3. Add failing lifecycle tests for loading/empty/error/retry, real Open chooser, New/Save/Save As/Rename/Delete/reload and active identity reset.
4. Remove production mock templates and add explicit retryable state.
5. Add actual-document template previews and card-level corrupt-preview errors.
6. Add dirty snapshot tracking plus Save/Discard/Cancel for New, Open, delete-active and page navigation/beforeunload.
7. Run focused tests and commit/push.

## Task 6: Geometry, styles, rotation and symbol parity

**Files:**
- Modify: `src/services/label-designer/label-document.ts`
- Modify: `src/services/label-designer/label-geometry.ts`
- Modify: `src/features/operations/label-designer/LabelCanvas.tsx`
- Modify: `src/services/printer/label-print-model.ts`
- Modify: `src/services/printer/zpl-renderer.ts`
- Modify: `src/services/printer/tspl-renderer.ts`
- Modify: `src/features/operations/label-designer.css`
- Modify tests for document/geometry/print model/ZPL/TSPL/symbols.

1. Add literal orientation snapshots for 0/90/180/270 ZPL and TSPL text, QR and barcode commands.
2. Move ZPL rotation into each native command; remove conflicting global `^FW` usage.
3. Make rotated bounds and label-size reduction deterministic and reachable.
4. Add tests for QR outer bounds/quiet zone/origin and barcode human-readable footprint.
5. Apply or constrain every visible style (`backgroundColor`, radius, border, frame, color, weight, alignment, rotation, visibility) consistently in preview and print; remove unsupported controls.
6. Run focused tests and commit.

## Task 7: Managed real image assets and thermal bitmap output

**Files:**
- Create: `src/services/label-designer/image-assets.ts`
- Create: `src/services/label-designer/image-raster.ts`
- Create: `src/services/label-designer/image-assets.test.ts`
- Create: `src/services/label-designer/image-raster.test.ts`
- Modify: `src/services/label-designer/label-document.ts`
- Modify: `src/features/operations/label-designer/LabelCanvas.tsx`
- Modify: `src/features/operations/label-designer/LabelPropertiesPanel.tsx`
- Modify: `src/services/printer/label-print-model.ts`
- Modify: `src/services/printer/zpl-renderer.ts`
- Modify: `src/services/printer/tspl-renderer.ts`
- Modify: `src-tauri/src/lib.rs` and focused Rust module/tests (no migration)
- Modify renderer/model/component tests.

1. Add failing tests for durable asset ids, restart reload and missing/corrupt asset errors.
2. Add production Tauri asset commands storing validated managed files under app data and an in-memory test gateway.
3. Import/decode/rasterize to deterministic monochrome bitmap; persist only managed asset id and sizing/fit.
4. Render actual preview from managed asset data.
5. Add literal ZPL `^GFA` and TSPL `BITMAP` tests and implementations; never render a fake image rectangle.
6. Run frontend and Rust-focused tests; commit/push.

## Task 8: Deterministic interaction acceptance

**Files:**
- Create: `src/features/operations/LabelDesigner.acceptance.test.tsx`
- Modify test support gateways as needed.

1. Write one integration scenario using real editor, template gateway, print workflow, ZPL and TSPL boundaries.
2. Create/set size/insert text+field+QR+barcode/drag/resize/rotate/change properties/save/reload.
3. Edit without save, Test Print, and assert current canvas model was sent.
4. Recreate persistence gateway to simulate restart; compare exact canonical geometry and generate both printer languages.
5. Run acceptance and all Label Designer tests; commit.

## Task 9: Full verification, genuine screenshots and branch CI

1. Run `npm run test:run` and record exact files/tests.
2. Run `npm run build` and TypeScript checks.
3. Run `cargo test --manifest-path src-tauri/Cargo.toml --all-features` where toolchain is available.
4. Run Tauri release build where platform permits.
5. Verify normal production bundle contains no visual-test route/provider markers.
6. Push branch; verify local HEAD equals remote HEAD.
7. Monitor Windows CI. Inspect and fix only failing steps, rerunning relevant local tests.
8. Download and inspect the visual artifact to confirm all six images show the real workspace and inserted text/QR/barcode.

## Task 10: v0.2.3 release

1. After branch CI is completely green, merge the verified branch into `main` without rewriting history.
2. Bump only release version metadata required for v0.2.3 if not already included; rerun release-critical tests.
3. Tag the exact verified main commit `v0.2.3` and trigger production release CI.
4. Verify Windows frontend/Rust/Tauri/NSIS/MSI jobs and installed smoke tests.
5. Upload/verify `Gold Label Studio Pro_0.2.3_x64-setup.exe` and MSI secondary artifact on release v0.2.3.
6. Verify tag, release assets and checksums point to the same final commit; stop.
