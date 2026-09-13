import { describe, expect, it } from "vitest";
import { isLabelTemplateValid, validateLabelTemplate } from "./template-validation";
import type { LabelTemplateDocument } from "./template-contract";

const validDocument: LabelTemplateDocument = {
  name: "قالب انگشتر",
  templateKind: "product",
  widthMm: 50,
  heightMm: 30,
  elements: [{ type: "qr", x: 1, y: 2 }],
};

describe("label template validation", () => {
  it("accepts a complete, valid document", () => {
    expect(validateLabelTemplate(validDocument)).toEqual([]);
    expect(isLabelTemplateValid(validDocument)).toBe(true);
  });

  it("rejects blank and oversized names with a Persian message", () => {
    const blank = validateLabelTemplate({ ...validDocument, name: "   " });
    expect(blank.map(issue => issue.field)).toContain("name");
    expect(blank[0]?.message).toContain("نام قالب");

    const oversized = validateLabelTemplate({ ...validDocument, name: "x".repeat(81) });
    expect(oversized.map(issue => issue.field)).toContain("name");
  });

  it("requires positive physical dimensions within the schema scale", () => {
    const invalid = validateLabelTemplate({ ...validDocument, widthMm: 0, heightMm: -3 });
    expect(invalid.map(issue => issue.field)).toEqual(["widthMm", "heightMm"]);

    const oversized = validateLabelTemplate({ ...validDocument, widthMm: 900 });
    expect(oversized.map(issue => issue.field)).toContain("widthMm");
  });

  it("flags designer elements that cannot be serialized", () => {
    const document: LabelTemplateDocument = {
      ...validDocument,
      elements: [{ toJSON: () => { throw new Error("circular"); } } as unknown as Record<string, unknown>],
    };

    expect(validateLabelTemplate(document).map(issue => issue.field)).toContain("elements");
  });
});
