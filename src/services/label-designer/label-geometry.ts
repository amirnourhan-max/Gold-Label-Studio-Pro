import {
  LABEL_MIN_ELEMENT_MM,
  clampNumber,
  constrainElement,
  roundMm,
  type LabelElement,
} from "./label-document";

/**
 * Editor-only presentation scale. Physical millimetres are the persisted unit;
 * this constant and the zoom factor only ever exist between the document and
 * the DOM, so changing zoom can never change a saved coordinate.
 */
export const PREVIEW_PIXELS_PER_MM = 8;
export const DEFAULT_ZOOM = 1.5;
export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 4;
export const ZOOM_STEPS: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];
export const DEFAULT_GRID_MM = 1;
export const ARROW_STEP_MM = 0.5;
export const SHIFT_ARROW_STEP_MM = 2;

export const clampZoom = (zoom: number): number =>
  Number.isFinite(zoom) ? Math.round(clampNumber(zoom, MIN_ZOOM, MAX_ZOOM) * 100) / 100 : DEFAULT_ZOOM;

export const mmToPreviewPx = (millimetres: number, zoom: number): number =>
  millimetres * PREVIEW_PIXELS_PER_MM * clampZoom(zoom);

export const previewPxToMm = (pixels: number, zoom: number): number =>
  pixels / (PREVIEW_PIXELS_PER_MM * clampZoom(zoom));

export const zoomPercent = (zoom: number): number => Math.round(clampZoom(zoom) * 100);

export const nextZoom = (zoom: number, direction: 1 | -1): number => {
  const current = clampZoom(zoom);
  if (direction === 1) {
    return ZOOM_STEPS.find(step => step > current + 0.001) ?? MAX_ZOOM;
  }
  return [...ZOOM_STEPS].reverse().find(step => step < current - 0.001) ?? MIN_ZOOM;
};

/** Snaps a millimetre value onto the grid when snapping is active. */
export const snapMm = (value: number, gridMm = DEFAULT_GRID_MM, enabled = true): number =>
  !Number.isFinite(value) || !enabled ? roundMm(value) : roundMm(Math.round(value / gridMm) * gridMm);

export type ResizeHandle = "nw" | "ne" | "sw" | "se";
export const RESIZE_HANDLES: readonly ResizeHandle[] = ["nw", "ne", "sw", "se"];

/**
 * Moves an element by a millimetre delta and re-applies the label bounds, so a
 * drag can never produce NaN, negative dimensions or an unreachable element.
 */
export const moveElement = (
  element: LabelElement,
  deltaXMm: number,
  deltaYMm: number,
  bounds: { widthMm: number; heightMm: number },
): LabelElement => {
  if (!Number.isFinite(deltaXMm) || !Number.isFinite(deltaYMm)) return element;
  return constrainElement(
    { ...element, xMm: roundMm(element.xMm + deltaXMm), yMm: roundMm(element.yMm + deltaYMm) },
    bounds,
  );
};

/**
 * Resizes from a corner handle by a millimetre delta. The opposite corner stays
 * anchored and the minimum size is enforced, which is what makes a drag feel
 * stable and keeps dimensions positive.
 */
export const resizeElementByDelta = (
  element: LabelElement,
  handle: ResizeHandle,
  deltaXMm: number,
  deltaYMm: number,
  bounds: { widthMm: number; heightMm: number },
): LabelElement => {
  if (!Number.isFinite(deltaXMm) || !Number.isFinite(deltaYMm)) return element;

  const minWidth = element.kind === "line" ? 0.2 : LABEL_MIN_ELEMENT_MM;
  const minHeight = element.kind === "line" ? 0.2 : LABEL_MIN_ELEMENT_MM;

  let xMm = element.xMm;
  let yMm = element.yMm;
  let widthMm = element.widthMm;
  let heightMm = element.heightMm;

  if (handle === "se" || handle === "ne") widthMm = element.widthMm + deltaXMm;
  if (handle === "sw" || handle === "nw") {
    xMm = element.xMm + deltaXMm;
    widthMm = element.widthMm - deltaXMm;
  }
  if (handle === "se" || handle === "sw") heightMm = element.heightMm + deltaYMm;
  if (handle === "ne" || handle === "nw") {
    yMm = element.yMm + deltaYMm;
    heightMm = element.heightMm - deltaYMm;
  }

  // Shrinking past the anchor is stopped at the minimum size instead of
  // flipping the box, which would move the handle to the other corner.
  if (widthMm < minWidth) {
    if (handle === "sw" || handle === "nw") xMm = element.xMm + element.widthMm - minWidth;
    widthMm = minWidth;
  }
  if (heightMm < minHeight) {
    if (handle === "ne" || handle === "nw") yMm = element.yMm + element.heightMm - minHeight;
    heightMm = minHeight;
  }

  return constrainElement(
    { ...element, xMm: roundMm(xMm), yMm: roundMm(yMm), widthMm: roundMm(widthMm), heightMm: roundMm(heightMm) },
    bounds,
  );
};

/**
 * Shared text metric approximation (millimetres). ZPL uses its own field block
 * for alignment; TSPL has no alignment parameter, so it needs the same
 * deterministic estimate the designer shows.
 */
export const estimateTextWidthMm = (text: string, fontSizeMm: number, bold = false): number => {
  const boldFactor = bold ? 0.06 : 0;
  return [...text].reduce((width, character) => {
    if (character === " ") return width + fontSizeMm * 0.32;
    if (/[\u0600-\u06FF]/.test(character)) return width + fontSizeMm * 0.56;
    if (/[0-9]/.test(character)) return width + fontSizeMm * (0.56 + boldFactor);
    if (/[A-Z]/.test(character)) return width + fontSizeMm * (0.68 + boldFactor);
    if (/[a-z]/.test(character)) return width + fontSizeMm * (0.52 + boldFactor);
    return width + fontSizeMm * (0.4 + boldFactor);
  }, 0);
};

export const estimateTextOffsetMm = (
  text: string,
  fontSizeMm: number,
  boxWidthMm: number,
  align: "left" | "center" | "right",
  bold = false,
): number => {
  if (align === "left") return 0;
  const slack = Math.max(0, boxWidthMm - estimateTextWidthMm(text, fontSizeMm, bold));
  return align === "center" ? roundMm(slack / 2) : roundMm(slack);
};
