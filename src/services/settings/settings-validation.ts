import type { SettingsSnapshot } from "./settings-contract";

export type SettingsValidationIssue = Readonly<{
  field: string;
  message: string;
}>;

const MAX_LABEL_DIMENSION_MM = 500;

const parseLabelSize = (labelSize: string): readonly [number, number] | null => {
  const match = /^(\d+)\s*×\s*(\d+)(?:\s*mm)?$/.exec(labelSize.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
};

/**
 * Schema-aligned validation applied before persisting a settings snapshot:
 * required device names/ports, a positive baud rate, a "width × height" label
 * size within the printer column limits, and a backup path when enabled.
 */
export const validateSettings = (snapshot: SettingsSnapshot): readonly SettingsValidationIssue[] => {
  const issues: SettingsValidationIssue[] = [];

  if (snapshot.scale.scaleModel.trim() === "") {
    issues.push({ field: "scale.scaleModel", message: "مدل ترازو نمی‌تواند خالی باشد" });
  }
  if (snapshot.scale.port.trim() === "") {
    issues.push({ field: "scale.port", message: "پورت اتصال ترازو نمی‌تواند خالی باشد" });
  }
  const baud = Number.parseInt(snapshot.scale.baudRate.trim(), 10);
  if (Number.isNaN(baud) || baud <= 0) {
    issues.push({ field: "scale.baudRate", message: "نرخ باود باید عددی بزرگ‌تر از صفر باشد" });
  }

  if (snapshot.printer.printerName.trim() === "") {
    issues.push({ field: "printer.printerName", message: "نام چاپگر نمی‌تواند خالی باشد" });
  }
  if (snapshot.printer.labelSize.trim() !== "") {
    const dimensions = parseLabelSize(snapshot.printer.labelSize);
    if (!dimensions || dimensions[0] <= 0 || dimensions[0] > MAX_LABEL_DIMENSION_MM || dimensions[1] <= 0 || dimensions[1] > MAX_LABEL_DIMENSION_MM) {
      issues.push({ field: "printer.labelSize", message: `سایز لیبل باید به شکل «عرض × ارتفاع» و حداکثر ${MAX_LABEL_DIMENSION_MM} میلی‌متر باشد` });
    }
  }

  if (snapshot.scanner.scannerType.trim() === "") {
    issues.push({ field: "scanner.scannerType", message: "نوع اسکنر نمی‌تواند خالی باشد" });
  }

  if (snapshot.backup.enabled && snapshot.backup.destinationPath.trim() === "") {
    issues.push({ field: "backup.destinationPath", message: "مسیر ذخیره بکاپ نمی‌تواند خالی باشد" });
  }

  return issues;
};

export const isSettingsValid = (snapshot: SettingsSnapshot): boolean =>
  validateSettings(snapshot).length === 0;

export const parseLabelSizeOrThrow = (labelSize: string): readonly [number, number] | null =>
  parseLabelSize(labelSize);
