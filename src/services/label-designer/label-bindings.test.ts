import { describe, expect, it } from "vitest";
import {
  EMPTY_LABEL_DATA_CONTEXT,
  LABEL_FIELD_DEFINITIONS,
  LABEL_FIELD_KEYS,
  SAMPLE_LABEL_DATA_CONTEXT,
  formatLabelDate,
  formatWeightGrams,
  isLabelFieldKey,
  labelFieldLabel,
  resolveLabelField,
  resolveLabelText,
} from "./label-bindings";

describe("label field bindings", () => {
  it("defines a Persian label for every supported key", () => {
    expect(LABEL_FIELD_DEFINITIONS).toHaveLength(LABEL_FIELD_KEYS.length);
    for (const key of LABEL_FIELD_KEYS) {
      expect(labelFieldLabel(key).length).toBeGreaterThan(0);
      expect(isLabelFieldKey(key)).toBe(true);
    }
    expect(isLabelFieldKey("product.unknown")).toBe(false);
  });

  it("resolves product fields from the data context", () => {
    expect(resolveLabelField("product.name", SAMPLE_LABEL_DATA_CONTEXT)).toBe("انگشتر طرح گل");
    expect(resolveLabelField("product.code", SAMPLE_LABEL_DATA_CONTEXT)).toBe("R-250904-00125");
    expect(resolveLabelField("product.group", SAMPLE_LABEL_DATA_CONTEXT)).toBe("انگشتر");
    expect(resolveLabelField("product.workshop", SAMPLE_LABEL_DATA_CONTEXT)).toBe("کارگاه مرکزی");
    expect(resolveLabelField("product.size", SAMPLE_LABEL_DATA_CONTEXT)).toBe("12");
    expect(resolveLabelField("product.status", SAMPLE_LABEL_DATA_CONTEXT)).toBe("فعال");
    expect(resolveLabelField("product.date", SAMPLE_LABEL_DATA_CONTEXT)).toBe("2026-09-21");
  });

  it("formats the milligram weight as grams with milligram precision", () => {
    expect(resolveLabelField("product.weight", SAMPLE_LABEL_DATA_CONTEXT)).toBe("4.385");
    expect(resolveLabelField("product.stoneWeight", SAMPLE_LABEL_DATA_CONTEXT)).toBe("0.12");
    expect(resolveLabelField("package.totalWeight", SAMPLE_LABEL_DATA_CONTEXT)).toBe("24.862");
    expect(resolveLabelField("product.purity", SAMPLE_LABEL_DATA_CONTEXT)).toBe("750");
    expect(resolveLabelField("package.itemCount", SAMPLE_LABEL_DATA_CONTEXT)).toBe("6");
    expect(resolveLabelField("package.code", SAMPLE_LABEL_DATA_CONTEXT)).toBe("PK-250604-00125");
  });

  it("returns an empty string for fields the context does not know", () => {
    for (const key of LABEL_FIELD_KEYS) {
      expect(resolveLabelField(key, EMPTY_LABEL_DATA_CONTEXT)).toBe("");
    }
  });

  it("rejects impossible weights instead of printing a wrong number", () => {
    expect(formatWeightGrams(null)).toBe("");
    expect(formatWeightGrams(-5)).toBe("");
    expect(formatWeightGrams(4.385)).toBe("");
    expect(formatWeightGrams(4385)).toBe("4.385");
  });

  it("only accepts a real calendar date", () => {
    expect(formatLabelDate("2026-09-21T10:00:00.000Z")).toBe("2026-09-21");
    expect(formatLabelDate("not a date")).toBe("");
  });

  it("resolves an element's content from its binding, then its fallback text", () => {
    expect(resolveLabelText({ text: "متن ثابت", binding: null }, SAMPLE_LABEL_DATA_CONTEXT)).toBe("متن ثابت");
    expect(resolveLabelText({ text: "جایگزین", binding: "product.code" }, SAMPLE_LABEL_DATA_CONTEXT)).toBe("R-250904-00125");
    expect(resolveLabelText({ text: "جایگزین", binding: "product.size" }, EMPTY_LABEL_DATA_CONTEXT)).toBe("جایگزین");
    expect(resolveLabelText({ text: "", binding: "product.size" }, EMPTY_LABEL_DATA_CONTEXT)).toBe("{سایز}");
  });

  it("keeps a dynamic element empty when the caller asks for no placeholder", () => {
    expect(resolveLabelText({ text: "", binding: "product.size" }, EMPTY_LABEL_DATA_CONTEXT, { fallbackToPlaceholder: false })).toBe("");
  });
});
