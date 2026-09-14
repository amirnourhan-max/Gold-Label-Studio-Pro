import { describe, expect, it } from "vitest";
import { parseAandGFrame } from "./aand-scale-adapter";

describe("A&D scale frame parsing", () => {
  it("parses stable kg frames with millisecond precision", () => {
    const parsed = parseAandGFrame("ST,GS,+0004.385 kg");
    expect(parsed).toEqual({ grams: 4385, unit: "kg", stable: true });
  });

  it("parses unstable g frames without a status prefix", () => {
    const parsed = parseAandGFrame("US,GS,+0004.385 g");
    expect(parsed).toEqual({ grams: 4.385, unit: "g", stable: false });
  });

  it("parses bare masses in grams", () => {
    expect(parseAandGFrame("  4.385 g")).toEqual({ grams: 4.385, unit: "g", stable: true });
    expect(parseAandGFrame("+0012.345")).toEqual({ grams: 12.345, unit: "g", stable: true });
  });

  it("rejects overload, error and garbage frames", () => {
    expect(parseAandGFrame("OL")).toBeNull();
    expect(parseAandGFrame("OVER")).toBeNull();
    expect(parseAandGFrame("ERR04")).toBeNull();
    expect(parseAandGFrame("hello world")).toBeNull();
    expect(parseAandGFrame("")).toBeNull();
    expect(parseAandGFrame("4,385 g")).toBeNull();
  });

  it("keeps gram precision to three decimals", () => {
    expect(parseAandGFrame("ST,+0000.500 g")?.grams).toBe(0.5);
    expect(parseAandGFrame("ST,+0012.345 g")?.grams).toBe(12.345);
  });

  it("rejects negative masses", () => {
    expect(parseAandGFrame("ST,-0002.000 g")).toBeNull();
  });
});