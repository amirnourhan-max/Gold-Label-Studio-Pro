import { describe, expect, it } from "vitest";
import { renderTspl, renderTsplTestLabel } from "./tspl-renderer";
import type { LabelPrintModel } from "./label-print-model";

const model: LabelPrintModel = {
  name: "تست",
  widthMm: 50,
  heightMm: 30,
  copies: 2,
  elements: [
    { kind: "text", xMm: 2, yMm: 3, content: "انگشتر", heightMm: 3.2, widthMm: 2.6 },
    { kind: "qr", xMm: 34, yMm: 3, content: "R-250904-00125", moduleMm: 0.75, errorCorrection: "M" },
    { kind: "image", xMm: 2, yMm: 12, widthMm: 12, heightMm: 12, label: "لوگو" },
  ],
};

describe("TSPL renderer", () => {
  it("declares the label size in millimetres and clears the buffer", () => {
    const tspl = renderTspl(model);

    expect(tspl).toContain("SIZE 50 mm,30 mm");
    expect(tspl).toContain("GAP 2 mm,0 mm");
    expect(tspl).toContain("DIRECTION 1");
    expect(tspl).toContain("CLS");
  });

  it("renders text commands with position and font size", () => {
    expect(renderTspl(model)).toContain("TEXT 16,24,\"3\",0,10,13,\"انگشتر\"");
  });

  it("renders QR commands with the configured error correction", () => {
    expect(renderTspl(model)).toContain("QRCODE 272,24,M,3,A,0,\"R-250904-00125\"");
  });

  it("draws an image placeholder box plus its label", () => {
    const tspl = renderTspl(model);

    expect(tspl).toContain("BOX 16,96,112,192,2");
    expect(tspl).toContain("لوگو");
  });

  it("prints the requested number of copies", () => {
    expect(renderTspl(model)).toContain("PRINT 2,1");
  });

  it("neutralises quotes inside TSPL strings", () => {
    const tspl = renderTspl({
      ...model,
      elements: [{ kind: "text", xMm: 2, yMm: 2, content: "bad\"injection" }],
    });

    expect(tspl).toContain("bad injection");
    expect(tspl.match(/"/g)?.length).toBe(4); // two string delimiters for one TEXT command
  });

  it("generates a deterministic test label for the printer test action", () => {
    const tspl = renderTsplTestLabel({ printerName: "TSC TE200" });

    expect(tspl).toContain("GOLD LABEL STUDIO PRO");
    expect(tspl).toContain("GLSP-TEST");
    expect(tspl).toContain("TSC TE200");
    expect(tspl).toContain("PRINT 1,1");
  });
});