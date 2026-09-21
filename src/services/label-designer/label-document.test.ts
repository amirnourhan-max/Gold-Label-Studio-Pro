import { describe, expect, it } from "vitest";
import {
  LABEL_DOCUMENT_VERSION,
  LABEL_MIN_ELEMENT_MM,
  constrainElement,
  createLabelDocument,
  createLabelElement,
  duplicateLabelElement,
  normalizeLabelElement,
  parseLabelDocument,
  serializeLabelDocument,
  type LabelElement,
} from "./label-document";

describe("canonical label document", () => {
  it("reads the legacy element keys the approved designer already persisted", () => {
    const element = normalizeLabelElement({ type: "qr", x: 54.1, y: 12.3, w: 22, h: 22, ecc: "q" }, "element-1");

    expect(element).toMatchObject({
      id: "element-1",
      kind: "qr",
      xMm: 54.1,
      yMm: 12.3,
      widthMm: 22,
      heightMm: 22,
      errorCorrection: "Q",
    });
  });

  it("normalizes a bound field element and drops an unknown binding", () => {
    const bound = normalizeLabelElement({ kind: "field", binding: "product.weight", xMm: 2, yMm: 2, widthMm: 20, heightMm: 6 });
    expect(bound?.binding).toBe("product.weight");
    expect(bound?.kind).toBe("field");

    const unknown = normalizeLabelElement({ kind: "field", binding: "product.unknown" });
    expect(unknown?.binding).toBeNull();
    expect(unknown?.kind).toBe("field");
  });

  it("never throws on a malformed element and reports it as null", () => {
    expect(normalizeLabelElement(null)).toBeNull();
    expect(normalizeLabelElement("qr")).toBeNull();
    expect(normalizeLabelElement(42)).toBeNull();
    expect(normalizeLabelElement([{ kind: "text" }])).toBeNull();
  });

  it("sanitizes non-finite numbers instead of persisting NaN", () => {
    const element = normalizeLabelElement({
      kind: "text",
      text: "x",
      xMm: Number.NaN,
      yMm: Number.POSITIVE_INFINITY,
      widthMm: Number.NaN,
      fontSizeMm: Number.NaN,
    });

    expect(Number.isFinite(element!.xMm)).toBe(true);
    expect(Number.isFinite(element!.yMm)).toBe(true);
    expect(element!.widthMm).toBeGreaterThanOrEqual(LABEL_MIN_ELEMENT_MM);
    expect(Number.isFinite(element!.heightMm)).toBe(true);
  });

  it("keeps every persisted geometry field in millimetres inside one document", () => {
    const document = createLabelDocument({
      widthMm: 40,
      heightMm: 25,
      elements: [
        { kind: "text", id: "a", text: "کارگاه", xMm: 3, yMm: 4, widthMm: 20, heightMm: 6, rotation: 90, zIndex: 2 },
      ],
    });

    expect(document).toMatchObject({ version: LABEL_DOCUMENT_VERSION, unit: "mm", widthMm: 40, heightMm: 25 });
    expect(document.elements[0]).toMatchObject({ id: "a", xMm: 3, yMm: 4, widthMm: 20, heightMm: 6, rotation: 90, zIndex: 2 });
  });

  it("serializes the versioned document with its physical unit", () => {
    const json = serializeLabelDocument(createLabelDocument({ widthMm: 50, heightMm: 30, elements: [] }));

    expect(JSON.parse(json)).toEqual({ version: 1, unit: "mm", widthMm: 50, heightMm: 30, elements: [] });
  });

  it("parses a stored document, clamping elements into the label", () => {
    const { document, issues } = parseLabelDocument(
      JSON.stringify({
        version: 1,
        unit: "mm",
        widthMm: 40,
        heightMm: 25,
        elements: [{ kind: "text", id: "far", text: "بیرون", xMm: 90, yMm: 90, widthMm: 20, heightMm: 8 }],
      }),
      { widthMm: 50, heightMm: 30 },
    );

    expect(issues).toEqual([]);
    expect(document?.widthMm).toBe(40);
    expect(document?.elements[0]).toMatchObject({ xMm: 20, yMm: 17 });
  });

  it("reports a corrupt document without producing one", () => {
    expect(parseLabelDocument("{not json", { widthMm: 50, heightMm: 30 })).toEqual({
      document: null,
      issues: [{ field: "elements", message: "محتوای قالب ذخیره‌شده قابل خواندن نیست" }],
    });
  });

  it("refuses a document written by a newer format version", () => {
    const { document, issues } = parseLabelDocument(
      JSON.stringify({ version: 99, widthMm: 50, heightMm: 30, elements: [] }),
      { widthMm: 50, heightMm: 30 },
    );

    expect(document).toBeNull();
    expect(issues[0]?.field).toBe("version");
  });

  it("treats a stored document without a version as version 1", () => {
    const { document } = parseLabelDocument(
      JSON.stringify({ widthMm: 50, heightMm: 30, elements: [{ kind: "text", text: "x" }] }),
      { widthMm: 50, heightMm: 30 },
    );

    expect(document?.version).toBe(1);
    expect(document?.elements).toHaveLength(1);
  });

  it("returns no document for an empty layout so the caller can decide", () => {
    expect(parseLabelDocument(undefined, { widthMm: 50, heightMm: 30 })).toEqual({ document: null, issues: [] });
    expect(parseLabelDocument("   ", { widthMm: 50, heightMm: 30 })).toEqual({ document: null, issues: [] });
  });

  it("allows a legacy bare array of elements", () => {
    const { document, issues } = parseLabelDocument(
      JSON.stringify([{ kind: "text", text: "قدیمی", xMm: 1, yMm: 1 }]),
      { widthMm: 50, heightMm: 30 },
    );

    expect(issues).toEqual([]);
    expect(document?.elements).toHaveLength(1);
    expect(document?.widthMm).toBe(50);
  });

  it("constrains elements fully inside the label", () => {
    const element = createLabelElement("text", [], { xMm: 100, yMm: 100, widthMm: 30, heightMm: 10 });
    const constrained = constrainElement(element, { widthMm: 40, heightMm: 25 });

    expect(constrained.xMm).toBe(10);
    expect(constrained.yMm).toBe(15);
    expect(constrained.xMm + constrained.widthMm).toBeLessThanOrEqual(40);
    expect(constrained.yMm + constrained.heightMm).toBeLessThanOrEqual(25);
  });

  it("keeps a thin line element editable in both axes", () => {
    const line = createLabelElement("line");
    expect(line.heightMm).toBeLessThan(LABEL_MIN_ELEMENT_MM);

    const rotated = normalizeLabelElement({ kind: "line", id: "l", widthMm: 0.4, heightMm: 20 });
    expect(rotated?.widthMm).toBe(0.4);
    expect(rotated?.heightMm).toBe(20);
  });

  it("gives every element kind a usable default", () => {
    expect(createLabelElement("text").text).toBe("متن جدید");
    expect(createLabelElement("field").binding).toBe("product.name");
    expect(createLabelElement("qr")).toMatchObject({ widthMm: 18, heightMm: 18 });
    expect(createLabelElement("barcode").humanReadable).toBe(true);
    expect(createLabelElement("image").text).toBe("تصویر");
  });

  it("mints deterministic, collision-free element ids", () => {
    const first = createLabelElement("text", []);
    const second = createLabelElement("text", [first]);

    expect(first.id).toBe("text-1");
    expect(second.id).toBe("text-2");
    expect(second.zIndex).toBeGreaterThan(first.zIndex);
  });

  it("offsets a duplicated element and gives it a fresh identity", () => {
    const source = createLabelElement("qr", [], { xMm: 2, yMm: 3 });
    const copy = duplicateLabelElement(source, [source]) as LabelElement;

    expect(copy.id).not.toBe(source.id);
    expect(copy.xMm).toBe(4);
    expect(copy.yMm).toBe(5);
    expect(copy.kind).toBe(source.kind);
  });
});
