import { describe, expect, it } from "vitest";
import { SAMPLE_LABEL_DATA_CONTEXT, EMPTY_LABEL_DATA_CONTEXT } from "../label-designer/label-bindings";
import { createLabelDocument } from "../label-designer/label-document";
import {
  DEFAULT_PRINTER_DPI,
  buildLabelPrintModel,
  mmToDots,
  mmToDotsAtDpi,
  resolveLabelPrintModel,
} from "./label-print-model";
import { renderZpl } from "./zpl-renderer";
import { renderTspl } from "./tspl-renderer";

const document = () => createLabelDocument({
  widthMm: 40,
  heightMm: 25,
  elements: [
    { kind: "text", id: "t1", text: "انگشتر", xMm: 2, yMm: 2, widthMm: 20, heightMm: 6, zIndex: 0, style: { fontSizeMm: 3 } },
    { kind: "field", id: "f1", binding: "product.code", text: "", xMm: 2, yMm: 9, widthMm: 24, heightMm: 6, zIndex: 1, style: { fontSizeMm: 2.6 } },
    { kind: "qr", id: "q1", binding: "product.code", text: "", xMm: 22, yMm: 9, widthMm: 16, heightMm: 16, zIndex: 2, errorCorrection: "Q" },
    { kind: "barcode", id: "b1", binding: "product.code", text: "", xMm: 2, yMm: 17, widthMm: 36, heightMm: 7, zIndex: 3, humanReadable: true },
    { kind: "line", id: "l1", text: "", xMm: 0, yMm: 8, widthMm: 40, heightMm: 0.4, zIndex: 4 },
    { kind: "frame", id: "r1", text: "", xMm: 1, yMm: 1, widthMm: 38, heightMm: 23, zIndex: 5 },
  ],
});

describe("label print model", () => {
  it("converts millimetres to printer dots at the print head resolution", () => {
    expect(mmToDots(50)).toBe(400);
    expect(mmToDots(30)).toBe(240);
    expect(mmToDots(3.2)).toBe(26);
    expect(mmToDots(2.6)).toBe(21);
    expect(mmToDotsAtDpi(50, DEFAULT_PRINTER_DPI)).toBe(mmToDots(50));
    // A 300 dpi head resolves the same physical label with more dots.
    expect(mmToDotsAtDpi(50, 300)).toBe(Math.round(50 * (300 / 25.4)));
    expect(mmToDotsAtDpi(0, 203)).toBe(1);
  });

  it("resolves dynamic bindings while keeping the static text", () => {
    const model = buildLabelPrintModel({ document: document(), context: SAMPLE_LABEL_DATA_CONTEXT });

    expect(model.widthMm).toBe(40);
    expect(model.heightMm).toBe(25);
    expect(model.elements[0]).toMatchObject({ kind: "text", content: "انگشتر" });
    expect(model.elements[1]).toMatchObject({ kind: "text", content: "R-250904-00125" });
    expect(model.elements[2]).toMatchObject({ kind: "qr", content: "R-250904-00125", errorCorrection: "Q" });
    expect(model.elements[3]).toMatchObject({ kind: "barcode", content: "R-250904-00125", humanReadable: true });
    expect(model.elements[4]).toMatchObject({ kind: "line" });
    expect(model.elements[5]).toMatchObject({ kind: "frame" });
  });

  it("orders visible elements by z-index and drops hidden ones", () => {
    const source = createLabelDocument({
      widthMm: 50,
      heightMm: 30,
      elements: [
        { kind: "text", id: "top", text: "بالا", xMm: 1, yMm: 1, zIndex: 5, widthMm: 10, heightMm: 5 },
        { kind: "text", id: "bottom", text: "پایین", xMm: 1, yMm: 1, zIndex: 1, widthMm: 10, heightMm: 5 },
        { kind: "text", id: "hidden", text: "مخفی", xMm: 1, yMm: 1, zIndex: 0, widthMm: 10, heightMm: 5, visible: false },
      ],
    });

    const model = buildLabelPrintModel({ document: source, context: EMPTY_LABEL_DATA_CONTEXT });
    expect(model.elements.map(element => element.kind === "text" ? element.content : element.kind)).toEqual(["پایین", "بالا"]);
  });

  it("derives the barcode bar width from the real module count", () => {
    const model = buildLabelPrintModel({ document: document(), context: SAMPLE_LABEL_DATA_CONTEXT });
    const barcode = model.elements.find(element => element.kind === "barcode");

    expect(barcode?.kind).toBe("barcode");
    if (barcode?.kind !== "barcode") throw new Error("missing barcode");
    expect(barcode.narrowMm).toBeGreaterThan(0);
    expect(barcode.narrowMm).toBeLessThan(1);
  });

  it("falls back to the approved default layout when the document has no printable element", () => {
    const empty = resolveLabelPrintModel({
      name: "خالی",
      widthMm: 50,
      heightMm: 30,
      layoutJson: JSON.stringify({ version: 1, widthMm: 50, heightMm: 30, elements: [] }),
    });
    expect(empty.usedFallback).toBe(true);
    expect(empty.model.elements.some(element => element.kind === "qr")).toBe(true);

    const corrupt = resolveLabelPrintModel({ name: "خراب", widthMm: 50, heightMm: 30, layoutJson: "{oops" });
    expect(corrupt.usedFallback).toBe(true);

    const missing = resolveLabelPrintModel({ name: "بدون قالب", widthMm: 40, heightMm: 25 });
    expect(missing.usedFallback).toBe(true);
    expect(missing.model.widthMm).toBe(40);
  });

  it("draws a real frame only when the element asks for one", () => {
    const source = createLabelDocument({
      widthMm: 50,
      heightMm: 30,
      elements: [
        { kind: "text", id: "plain", text: "بدون قاب", xMm: 2, yMm: 2, widthMm: 20, heightMm: 6 },
        { kind: "qr", id: "framed", binding: "product.code", text: "", xMm: 30, yMm: 2, widthMm: 14, heightMm: 14, showFrame: true, paddingMm: 1 },
      ],
    });
    const model = buildLabelPrintModel({ document: source, context: SAMPLE_LABEL_DATA_CONTEXT });

    expect(model.elements.map(element => element.kind)).toEqual(["text", "frame", "qr"]);
    expect(model.elements[1]).toMatchObject({ kind: "frame", xMm: 30, yMm: 2, widthMm: 14, heightMm: 14 });

    const zpl = renderZpl(model);
    expect(zpl.match(/\^GB/g)).toHaveLength(1);
    expect(zpl).toContain("^FO240,16^GB112,112,2^FS");
  });

  it("shrinks the QR module size by the element padding", () => {
    const withoutPadding = buildLabelPrintModel({
      document: createLabelDocument({ widthMm: 50, heightMm: 30, elements: [{ kind: "qr", text: "R-1", xMm: 4, yMm: 4, widthMm: 20, heightMm: 20 }] }),
    });
    const withPadding = buildLabelPrintModel({
      document: createLabelDocument({ widthMm: 50, heightMm: 30, elements: [{ kind: "qr", text: "R-1", xMm: 4, yMm: 4, widthMm: 20, heightMm: 20, paddingMm: 4 }] }),
    });

    const moduleOf = (model: typeof withoutPadding) => {
      const qr = model.elements[0]!;
      if (qr.kind !== "qr") throw new Error("not a qr element");
      return qr.moduleMm!;
    };

    expect(moduleOf(withPadding)).toBeLessThan(moduleOf(withoutPadding));
  });

  it("uses the stored document instead of the fallback when it has elements", () => {
    const stored = createLabelDocument({
      widthMm: 40,
      heightMm: 25,
      elements: [{ kind: "text", text: "اصلی", xMm: 3, yMm: 3, widthMm: 20, heightMm: 5 }],
    });

    const resolved = resolveLabelPrintModel({
      name: "قالب",
      widthMm: 40,
      heightMm: 25,
      layoutJson: JSON.stringify(stored),
      context: EMPTY_LABEL_DATA_CONTEXT,
    });

    expect(resolved.usedFallback).toBe(false);
    expect(resolved.model.elements).toHaveLength(1);
  });
});

describe("persisted document drives the printer commands", () => {
  it("renders the resolved binding values into ZPL", () => {
    const model = buildLabelPrintModel({ document: document(), context: SAMPLE_LABEL_DATA_CONTEXT, copies: 2 });
    const zpl = renderZpl(model);

    expect(zpl).toContain("رR-250904-00125".slice(1));
    expect(zpl).toContain("^PW320"); // 40mm at 203dpi
    expect(zpl).toContain("^LL200"); // 25mm at 203dpi
    expect(zpl).toContain("^BCN");
    expect(zpl).toContain("^GB");
    expect(zpl).toContain("^PQ2");
  });

  it("renders alignment, rotation and bold for a text element", () => {
    const source = createLabelDocument({
      widthMm: 50,
      heightMm: 30,
      elements: [{
        kind: "text",
        text: "محصول",
        xMm: 2,
        yMm: 2,
        widthMm: 20,
        heightMm: 6,
        rotation: 90,
        style: { fontSizeMm: 3, align: "right", fontWeight: "bold" },
      }],
    });
    const model = buildLabelPrintModel({ document: source, context: EMPTY_LABEL_DATA_CONTEXT });
    const zpl = renderZpl(model);

    expect(zpl).toContain("^FWR");
    expect(zpl).toContain("^FB");
    expect(zpl.match(/\^FD/g)).toHaveLength(2); // the bold double strike
  });

  it("renders the same document as TSPL with the same geometry", () => {
    const model = buildLabelPrintModel({ document: document(), context: SAMPLE_LABEL_DATA_CONTEXT, copies: 3 });
    const tspl = renderTspl(model);

    expect(tspl).toContain("SIZE 40 mm,25 mm");
    expect(tspl).toContain("R-250904-00125");
    expect(tspl).toContain("BAR "); // line element
    expect(tspl).toContain("BOX "); // frame element
    expect(tspl).toContain('BARCODE 16,136,"128"');
    expect(tspl).toContain("PRINT 3,1");
  });

  it("renders a rotated, right-aligned text element in TSPL by offsetting it", () => {
    const source = createLabelDocument({
      widthMm: 50,
      heightMm: 30,
      elements: [
        { kind: "text", text: "محصول", xMm: 2, yMm: 2, widthMm: 20, heightMm: 6, style: { fontSizeMm: 3 } },
        { kind: "text", text: "محصول", xMm: 2, yMm: 10, widthMm: 20, heightMm: 6, rotation: 180, style: { fontSizeMm: 3, align: "right" } },
      ],
    });
    const model = buildLabelPrintModel({ document: source, context: EMPTY_LABEL_DATA_CONTEXT });
    const [left, right] = renderTspl(model).split("\n").filter(line => line.startsWith("TEXT"));

    expect(left).toContain('"3",0,');
    expect(right).toContain('"3",180,');
    expect(Number(/^TEXT (\d+),/.exec(right!)![1])).toBeGreaterThan(Number(/^TEXT (\d+),/.exec(left!)![1]));
  });

  it("honours a different print head resolution end to end", () => {
    const model = buildLabelPrintModel({ document: document(), context: EMPTY_LABEL_DATA_CONTEXT });
    expect(renderZpl(model, { dpi: 300 })).toContain(`^PW${mmToDotsAtDpi(40, 300)}`);
    expect(renderZpl(model, { dpi: 300 })).not.toContain("^PW320");
  });
});
