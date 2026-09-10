import type { WeightMg } from "../../types/persistence";

const decimalGramPattern = /^(0|[1-9]\d*)(?:\.(\d{1,3}))?$/;

export const weightMgFromGramText = (value: string): WeightMg => {
  const normalized = value.trim();
  const match = decimalGramPattern.exec(normalized);

  if (!match) {
    if (/^-/.test(normalized)) {
      throw new Error("Weight must be non-negative");
    }

    if (/^\d+\.\d{4,}$/.test(normalized)) {
      throw new Error("Weight exceeds milligram precision");
    }

    throw new Error("Weight must be a decimal gram value");
  }

  const wholeGrams = Number(match[1]);
  const fractionalMilligrams = Number((match[2] ?? "").padEnd(3, "0") || "0");

  return (wholeGrams * 1000 + fractionalMilligrams) as WeightMg;
};

export const formatWeightMg = (value: WeightMg | number): string => {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Weight must be a non-negative integer milligram value");
  }

  const wholeGrams = Math.floor(value / 1000);
  const fractionalMilligrams = String(value % 1000).padStart(3, "0").replace(/0+$/, "");

  return fractionalMilligrams ? `${wholeGrams}.${fractionalMilligrams}` : String(wholeGrams);
};
