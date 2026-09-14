import { describe, expect, it } from "vitest";
import {
  buildPackageCode,
  formatClockLabel,
  formatDurationLabel,
  formatItemCountLabel,
  formatPackageCodePrefix,
  formatPersianInteger,
  formatWeightLabel,
  gramsToMilligrams,
  isValidProductCode,
  milligramsToGrams,
  normalizeProductCode,
} from "./packaging-validation";

describe("packaging weight precision", () => {
  it("converts gram input to integer milligrams without floating point drift", () => {
    expect(gramsToMilligrams("4.385")).toBe(4385);
    expect(gramsToMilligrams("24.862")).toBe(24862);
    expect(gramsToMilligrams(4.385)).toBe(4385);
    expect(gramsToMilligrams("0.5")).toBe(500);
    expect(gramsToMilligrams(2)).toBe(2000);
  });

  it("round-trips milligram values through the gram label", () => {
    for (const milligrams of [1, 999, 1950, 4385, 24862]) {
      expect(gramsToMilligrams(milligramsToGrams(milligrams))).toBe(milligrams);
    }

    expect(milligramsToGrams(4385)).toBe("4.385");
    expect(formatWeightLabel(24862)).toBe("24.862 g");
    expect(formatWeightLabel(0)).toBe("0.000 g");
  });

  it("rejects values that are not non-negative gram amounts", () => {
    expect(() => gramsToMilligrams("4,385 g")).toThrow("non-negative gram value");
    expect(() => gramsToMilligrams("-1")).toThrow("non-negative gram value");
    expect(() => gramsToMilligrams("*")).toThrow("non-negative gram value");
  });
});

describe("packaging labels", () => {
  it("formats counts with Persian digits", () => {
    expect(formatPersianInteger(6)).toBe("۶");
    expect(formatItemCountLabel(6)).toBe("۶ قلم");
    expect(formatItemCountLabel(12)).toBe("۱۲ قلم");
    expect(formatItemCountLabel(0)).toBe("۰ قلم");
  });

  it("formats scan times and elapsed package time", () => {
    expect(formatClockLabel(new Date("2026-09-10T10:24:15"))).toBe("10:24:15");
    expect(formatClockLabel("not-a-date")).toBe("--:--:--");
    expect(formatDurationLabel(877_000)).toBe("00:14:37");
    expect(formatDurationLabel(3_723_000)).toBe("01:02:03");
    expect(formatDurationLabel(-5_000)).toBe("00:00:00");
  });

  it("builds package codes in the approved PK-YYMMDD-NNNNN shape", () => {
    const prefix = formatPackageCodePrefix(new Date("2026-06-04T12:00:00.000Z"));

    expect(prefix).toBe("PK-260604-");
    expect(buildPackageCode(prefix, 125)).toBe("PK-260604-00125");
    expect(buildPackageCode(prefix, 1)).toBe("PK-260604-00001");
  });
});

describe("packaging product code validation", () => {
  it("normalizes manual entry before validation", () => {
    expect(normalizeProductCode("  r-250604-00125 ")).toBe("R-250604-00125");
    expect(isValidProductCode(normalizeProductCode(" r-250604-00125 "))).toBe(true);
    expect(isValidProductCode("R")).toBe(false);
    expect(isValidProductCode("")).toBe(false);
    expect(isValidProductCode("کد محصول")).toBe(false);
    expect(isValidProductCode("R 250604")).toBe(false);
  });
});
