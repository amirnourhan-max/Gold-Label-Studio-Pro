import { describe, expect, it } from "vitest";
import { formatWeightMg, weightMgFromGramText } from "./weight";

describe("weight persistence precision", () => {
  it("converts an exact decimal gram value to integer milligrams", () => {
    expect(weightMgFromGramText("4.385")).toBe(4385);
    expect(weightMgFromGramText("0.001")).toBe(1);
    expect(weightMgFromGramText("12")).toBe(12000);
  });

  it("rejects values that cannot be represented as whole milligrams", () => {
    expect(() => weightMgFromGramText("4.3851")).toThrow("milligram precision");
    expect(() => weightMgFromGramText("-1")).toThrow("non-negative");
    expect(() => weightMgFromGramText("abc")).toThrow("decimal gram value");
  });

  it("formats integer milligrams without floating-point drift", () => {
    expect(formatWeightMg(4385)).toBe("4.385");
    expect(formatWeightMg(12000)).toBe("12");
    expect(formatWeightMg(1)).toBe("0.001");
  });
});
