import { describe, expect, it } from "vitest";
import { createLabelElement, type LabelElement } from "./label-document";
import {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  PREVIEW_PIXELS_PER_MM,
  clampZoom,
  estimateTextOffsetMm,
  estimateTextWidthMm,
  mmToPreviewPx,
  moveElement,
  nextZoom,
  previewPxToMm,
  resizeElementByDelta,
  snapMm,
  zoomPercent,
} from "./label-geometry";

const bounds = { widthMm: 40, heightMm: 25 } as const;
const element = (overrides: Partial<LabelElement> = {}): LabelElement =>
  createLabelElement("text", [], { xMm: 4, yMm: 4, widthMm: 20, heightMm: 6, ...overrides });

describe("label editor geometry", () => {
  it("projects millimetres to pixels without ever changing the millimetre value", () => {
    for (const zoom of [0.5, 1, DEFAULT_ZOOM, 3]) {
      const pixels = mmToPreviewPx(12.5, zoom);
      expect(pixels).toBeCloseTo(12.5 * PREVIEW_PIXELS_PER_MM * zoom, 6);
      expect(previewPxToMm(pixels, zoom)).toBeCloseTo(12.5, 6);
    }
  });

  it("keeps the stored millimetre size identical at every zoom level", () => {
    const sizes = [0.5, 1, 1.5, 2, 4].map(zoom => previewPxToMm(mmToPreviewPx(40, zoom), zoom));
    expect(new Set(sizes.map(value => value.toFixed(6)))).toEqual(new Set(["40.000000"]));
  });

  it("clamps zoom into the supported range and steps through the ladder", () => {
    expect(clampZoom(0.01)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(DEFAULT_ZOOM);
    expect(nextZoom(DEFAULT_ZOOM, 1)).toBe(2);
    expect(nextZoom(DEFAULT_ZOOM, -1)).toBe(1.25);
    expect(zoomPercent(DEFAULT_ZOOM)).toBe(150);
  });

  it("snaps to the grid only when snapping is enabled", () => {
    expect(snapMm(3.4)).toBe(3);
    expect(snapMm(3.6)).toBe(4);
    expect(snapMm(3.4, 1, false)).toBe(3.4);
    expect(snapMm(3.44, 0.5)).toBe(3.5);
  });

  it("moves an element by a millimetre delta and keeps it inside the label", () => {
    const moved = moveElement(element(), 3, 2, bounds);
    expect(moved).toMatchObject({ xMm: 7, yMm: 6 });

    const clamped = moveElement(element(), 500, 500, bounds);
    expect(clamped.xMm + clamped.widthMm).toBeLessThanOrEqual(bounds.widthMm);
    expect(clamped.yMm + clamped.heightMm).toBeLessThanOrEqual(bounds.heightMm);
  });

  it("ignores a non-finite drag delta instead of corrupting the element", () => {
    const original = element();
    expect(moveElement(original, Number.NaN, 0, bounds)).toBe(original);
    expect(moveElement(original, 0, Number.POSITIVE_INFINITY, bounds)).toBe(original);
  });

  it("grows from the bottom-right handle", () => {
    const resized = resizeElementByDelta(element(), "se", 5, 3, bounds);
    expect(resized).toMatchObject({ xMm: 4, yMm: 4, widthMm: 25, heightMm: 9 });
  });

  it("grows from the top-left handle by moving the origin", () => {
    const resized = resizeElementByDelta(element(), "nw", -2, -1, bounds);
    expect(resized).toMatchObject({ xMm: 2, yMm: 3, widthMm: 22, heightMm: 7 });
  });

  it("stops at the minimum size instead of flipping the box", () => {
    const resized = resizeElementByDelta(element({ widthMm: 4, heightMm: 4 }), "se", -50, -50, bounds);
    expect(resized.widthMm).toBe(2);
    expect(resized.heightMm).toBe(2);
    expect(resized.xMm).toBe(4);
    expect(resized.yMm).toBe(4);

    const fromTopLeft = resizeElementByDelta(element(), "nw", 500, 500, bounds);
    expect(fromTopLeft.widthMm).toBe(2);
    expect(fromTopLeft.heightMm).toBe(2);
    expect(fromTopLeft.xMm + fromTopLeft.widthMm).toBe(24);
    expect(fromTopLeft.yMm + fromTopLeft.heightMm).toBe(10);
  });

  it("never produces negative or zero dimensions", () => {
    for (const handle of ["nw", "ne", "sw", "se"] as const) {
      for (const [dx, dy] of [[-99, -99], [99, 99], [-99, 99], [99, -99]]) {
        const resized = resizeElementByDelta(element(), handle, dx!, dy!, bounds);
        expect(resized.widthMm).toBeGreaterThan(0);
        expect(resized.heightMm).toBeGreaterThan(0);
        expect(Number.isFinite(resized.xMm)).toBe(true);
        expect(resized.xMm).toBeGreaterThanOrEqual(0);
        expect(resized.yMm).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("keeps a line's thin axis while resizing", () => {
    const line = createLabelElement("line", [], { xMm: 0, yMm: 10, widthMm: 30, heightMm: 0.4 });
    const resized = resizeElementByDelta(line, "se", -20, 0, bounds);
    expect(resized.heightMm).toBeLessThan(2);
    expect(resized.widthMm).toBeGreaterThanOrEqual(0.2);
  });

  it("estimates text width and alignment offsets deterministically", () => {
    expect(estimateTextWidthMm("", 3)).toBe(0);
    expect(estimateTextWidthMm("AB", 4)).toBeGreaterThan(estimateTextWidthMm("ab", 4));
    expect(estimateTextWidthMm("AB", 4, true)).toBeGreaterThan(estimateTextWidthMm("AB", 4, false));

    expect(estimateTextOffsetMm("x", 3, 20, "left")).toBe(0);
    expect(estimateTextOffsetMm("x", 3, 20, "right")).toBeGreaterThan(0);
    expect(estimateTextOffsetMm("x", 3, 20, "center")).toBeCloseTo(estimateTextOffsetMm("x", 3, 20, "right") / 2, 2);
  });
});
