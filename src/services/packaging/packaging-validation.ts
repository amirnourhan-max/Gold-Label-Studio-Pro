const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

const productCodePattern = /^[A-Z0-9][A-Z0-9-]{1,63}$/;

/** Product codes are stored upper-case; manual entry is forgiving about spacing and case. */
export const normalizeProductCode = (value: string): string => value.trim().toUpperCase();

export const isValidProductCode = (value: string): boolean => productCodePattern.test(value);

/**
 * Weights persist as INTEGER milligrams only. The conversion is string based so
 * "4.385" never travels through an imprecise float: 4.385 g === 4385 mg.
 */
export const gramsToMilligrams = (value: string | number): number => {
  const text = typeof value === "number" ? value.toFixed(3) : value.trim().replace(/٫/g, ".").replace(/,/g, "");

  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new Error("Weight must be a non-negative gram value");
  }

  const [whole, fraction = ""] = text.split(".") as [string, string?];
  const paddedFraction = `${fraction}000`.slice(0, 3);

  return Number(whole) * 1000 + Number(paddedFraction);
};

/** Three-decimal gram label, keeping every milligram the database stores. */
export const milligramsToGrams = (milligrams: number): string => (Math.round(milligrams) / 1000).toFixed(3);

export const formatWeightLabel = (milligrams: number): string => `${milligramsToGrams(milligrams)} g`;

export const formatPersianInteger = (value: number): string =>
  String(Math.trunc(value))
    .split("")
    .map((digit) => persianDigits[Number(digit)] ?? digit)
    .join("");

export const formatItemCountLabel = (value: number): string => `${formatPersianInteger(value)} قلم`;

export const formatClockLabel = (value: Date | string): string => {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "--:--:--";
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/** Elapsed time between package creation and now, as HH:MM:SS. */
export const formatDurationLabel = (elapsedMilliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMilliseconds / 1000));
  const pad = (part: number) => String(part).padStart(2, "0");

  return `${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;
};

/** Package codes follow the approved PK-YYMMDD-NNNNN shape. */
export const formatPackageCodePrefix = (value: Date): string => {
  const pad = (part: number) => String(part).padStart(2, "0");

  return `PK-${pad(value.getUTCFullYear() % 100)}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}-`;
};

export const buildPackageCode = (prefix: string, sequence: number): string => `${prefix}${String(sequence).padStart(5, "0")}`;
