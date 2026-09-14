import { describe, expect, it } from "vitest";
import { renderZpl, renderZplTestLabel } from "./zpl-renderer";
import type { LabelPrintModel } from "./label-print-model";

const model: LabelPrintModel = {
  name: "تست",
  widthMm: 50,
  heightMm: 30,
  copies: 3,
  elements: [
    { kind: "text", xMm: 2, yMm: 3, content: "انگشتر", heightMm: 3.2, widthMm: 2.6 },
    { kind: "qr", xMm: 34, yMm: 3, content: "R-250904-00125", moduleMm: 0.75, errorCorrection: "Q" },
    { kind: "image", xMm: 2, yMm: 12, widthMm: 12, heightMm: 12, label: "لوگو" },
  ],
};

describe("ZPL renderer", () => {
  it("wraps the label in a ZPL format and sets the label geometry in dots", () => {
    const zpl = renderZpl(model);

    expect(zpl.startsWith("^XA")).toBe(true);
    expect(zpl.endsWith("^XZ")).toBe(true);
    expect(zpl).toContain("^PW400"); // 50mm at 203dpi
    expect(zpl).toContain("^LL240"); // 30mm at 203dpi
    expect(zpl).toContain("^LH0,0");
    expect(zpl).toContain("^CI28");
  });

  it("renders text fields with their position and font size", () => {
    expect(renderZpl(model)).toContain("^FO16,24^A0N,26,21^FDانگشتر^FS");
  });

  it("renders QR codes with the configured error correction", () => {
    expect(renderZpl(model)).toContain("^BQN,2,3^FDQA,R-250904-00125^FS");
  });

  it("draws an image placeholder box plus its label", () => {
    const zpl = renderZpl(model);

    expect(zpl).toContain("^FO16,96^GB96,96,1^FS");
    expect(zpl).toContain("لوگو");
  });

  it("applies the copy count", () => {
    expect(renderZpl(model)).toContain("^PQ3");
  });

  it("neutralises ZPL control characters inside field data", () => {
    const zpl = renderZpl({
      ...model,
      elements: [{ kind: "text", xMm: 2, yMm: 2, content: "bad^FD~injection" }],
    });

    expect(zpl).toContain("^FDbad FD injection^FS");
    expect(zpl.match(/\^FD/g)).toHaveLength(1);
  });

  it("generates a deterministic test label for the printer test action", () => {
    const zpl = renderZplTestLabel({ printerName: "Zebra ZD421" });

    expect(zpl).toContain("GOLD LABEL STUDIO PRO");
    expect(zpl).toContain("GLSP-TEST");
    expect(zpl).toContain("Zebra ZD421");
    expect(zpl).toContain("^PQ1");
  });
});