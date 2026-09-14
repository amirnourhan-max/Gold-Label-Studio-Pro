/**
 * Printer-neutral label model. Renderers (ZPL/TSPL) turn this into device
 * commands; the designer's persisted layout JSON is mapped onto it on a
 * best-effort basis.
 */
export type LabelTextElement = Readonly<{
  kind: "text";
  xMm: number;
  yMm: number;
  content: string;
  /** Font height in millimetres (defaults to 3.2mm ≈ 26 dots at 203dpi). */
  heightMm?: number;
  /** Font width in millimetres. */
  widthMm?: number;
}>;

export type LabelQrElement = Readonly<{
  kind: "qr";
  xMm: number;
  yMm: number;
  content: string;
  /** Module size in millimetres (magnification). */
  moduleMm?: number;
  errorCorrection?: "L" | "M" | "Q" | "H";
}>;

export type LabelImageElement = Readonly<{
  kind: "image";
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  /** Human-readable placeholder drawn when no bitmap is embedded. */
  label: string;
}>;

export type LabelPrintElement = LabelTextElement | LabelQrElement | LabelImageElement;

export type LabelPrintModel = Readonly<{
  name: string;
  widthMm: number;
  heightMm: number;
  copies: number;
  elements: readonly LabelPrintElement[];
}>;

/** 203 dpi print heads: 8 dots per millimetre. */
export const DOTS_PER_MM = 8;

export const mmToDots = (millimetres: number): number => Math.max(1, Math.round(millimetres * DOTS_PER_MM));

export const DEFAULT_LABEL_SIZE_MM = { widthMm: 50, heightMm: 30 } as const;

/** The approved default label layout: QR plus the product identification block. */
export const createDefaultLabelModel = (options: {
  name?: string;
  widthMm?: number;
  heightMm?: number;
  copies?: number;
  productName?: string;
  productCode?: string;
} = {}): LabelPrintModel => ({
  name: options.name ?? "قالب پیش‌فرض (QR)",
  widthMm: options.widthMm ?? DEFAULT_LABEL_SIZE_MM.widthMm,
  heightMm: options.heightMm ?? DEFAULT_LABEL_SIZE_MM.heightMm,
  copies: options.copies ?? 1,
  elements: [
    { kind: "qr", xMm: 34, yMm: 3, content: options.productCode ?? "R-250904-00125", moduleMm: 0.75, errorCorrection: "M" },
    { kind: "text", xMm: 2, yMm: 3, content: options.productName ?? "Gold Label Studio Pro", heightMm: 3.2, widthMm: 2.6 },
    { kind: "text", xMm: 2, yMm: 11, content: `کد: ${options.productCode ?? "R-250904-00125"}`, heightMm: 2.6, widthMm: 2.1 },
    { kind: "text", xMm: 2, yMm: 18, content: "عیار: 750 (18K)", heightMm: 2.6, widthMm: 2.1 },
  ],
});

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const firstString = (record: Record<string, unknown>, keys: readonly string[]): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
};

const firstNumber = (record: Record<string, unknown>, keys: readonly string[]): number | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0 && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
};

const mapElement = (value: unknown): LabelPrintElement | null => {
  const record = asRecord(value);
  if (!record) return null;

  const kind = (firstString(record, ["kind", "type", "elementType"]) ?? "").toLowerCase();
  const xMm = firstNumber(record, ["xMm", "x", "left"]) ?? 0;
  const yMm = firstNumber(record, ["yMm", "y", "top"]) ?? 0;
  const content = firstString(record, ["content", "text", "value", "data", "qrContent"]);

  if (kind.includes("qr")) {
    if (content === null) return null;
    const moduleMm = firstNumber(record, ["moduleMm", "size", "moduleSize"]);
    return { kind: "qr", xMm, yMm, moduleMm: moduleMm ?? undefined, content };
  }

  if (kind.includes("image") || kind.includes("logo")) {
    return {
      kind: "image",
      xMm,
      yMm,
      widthMm: firstNumber(record, ["widthMm", "width", "w"]) ?? 12,
      heightMm: firstNumber(record, ["heightMm", "height", "h"]) ?? 12,
      label: content ?? firstString(record, ["label", "name"]) ?? "تصویر",
    };
  }

  if (kind.includes("text") || kind.length === 0) {
    if (content === null) return null;
    const heightMm = firstNumber(record, ["heightMm", "fontSizeMm", "fontSize", "size"]);
    const widthMm = firstNumber(record, ["widthMm", "fontWidthMm", "width"]);
    return { kind: "text", xMm, yMm, content, heightMm: heightMm ?? undefined, widthMm: widthMm ?? undefined };
  }

  return null;
};

/**
 * Maps a persisted designer document onto the print model. Unknown shapes fall
 * back to the approved default layout so printing never produces an empty label.
 */
export const labelPrintModelFromTemplate = (
  template: Readonly<{ name: string; widthMm: number; heightMm: number; layoutJson?: string | null }>,
  options: { copies?: number; productName?: string; productCode?: string } = {},
): LabelPrintModel => {
  const base = createDefaultLabelModel({
    name: template.name,
    widthMm: template.widthMm,
    heightMm: template.heightMm,
    copies: options.copies,
    productName: options.productName,
    productCode: options.productCode,
  });

  const raw = template.layoutJson;
  if (typeof raw !== "string" || raw.trim().length === 0) return base;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return base;
  }

  const container = asRecord(parsed);
  const candidate = Array.isArray(parsed)
    ? parsed
    : container && Array.isArray(container.elements)
      ? (container.elements as unknown[])
      : null;
  if (candidate === null) return base;

  const elements = candidate.map(mapElement).filter((element): element is LabelPrintElement => element !== null);
  return elements.length === 0 ? base : { ...base, elements };
};