import type { LabelTemplateElement } from "../label-templates/template-contract";
import { isLabelFieldKey, type LabelFieldKey } from "./label-bindings";

/**
 * The one canonical designer document. It is the only model the editor writes,
 * and it is exactly what `layout_json` carries, so the canvas and the print
 * renderers can never drift apart.
 */
export const LABEL_DOCUMENT_VERSION = 1;
export const LABEL_UNIT = "mm";
export const LABEL_MAX_DIMENSION_MM = 500;
/** Smallest editable element; keeps resize handles usable and dimensions positive. */
export const LABEL_MIN_ELEMENT_MM = 2;
export const LABEL_DEFAULT_FONT_MM = 3.2;
export const LABEL_MIN_FONT_MM = 1.2;
export const LABEL_MAX_FONT_MM = 40;

export type LabelElementKind = "text" | "field" | "qr" | "barcode" | "line" | "frame" | "image";
export type LabelTextAlign = "left" | "center" | "right";
export type LabelFontWeight = "normal" | "bold";
export type LabelBarcodeType = "code128";
export type LabelRotation = 0 | 90 | 180 | 270;
export type LabelErrorCorrection = "L" | "M" | "Q" | "H";

export const LABEL_ELEMENT_KINDS: readonly LabelElementKind[] = [
  "text", "field", "qr", "barcode", "line", "frame", "image",
];
export const LABEL_ROTATIONS: readonly LabelRotation[] = [0, 90, 180, 270];
export const LABEL_ERROR_CORRECTIONS: readonly LabelErrorCorrection[] = ["L", "M", "Q", "H"];
export const LABEL_BARCODE_TYPES: readonly LabelBarcodeType[] = ["code128"];

export type LabelElementStyle = Readonly<{
  fontSizeMm: number;
  fontWeight: LabelFontWeight;
  align: LabelTextAlign;
  color: string;
  backgroundColor: string;
  borderWidthMm: number;
  borderRadiusMm: number;
}>;

export type LabelElement = Readonly<{
  id: string;
  kind: LabelElementKind;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotation: LabelRotation;
  zIndex: number;
  visible: boolean;
  /** Static text, or the fallback shown when a bound field has no value. */
  text: string;
  /** Persisted binding itself, e.g. `product.code`. Never a rendered value. */
  binding: LabelFieldKey | null;
  style: LabelElementStyle;
  errorCorrection: LabelErrorCorrection;
  paddingMm: number;
  showFrame: boolean;
  barcodeType: LabelBarcodeType;
  /** Prints the value under a barcode symbol. */
  humanReadable: boolean;
  imagePath: string | null;
}>;

export type LabelDocument = Readonly<{
  version: number;
  unit: typeof LABEL_UNIT;
  widthMm: number;
  heightMm: number;
  elements: readonly LabelElement[];
}>;

export type LabelDocumentIssue = Readonly<{
  field: "version" | "widthMm" | "heightMm" | "elements";
  message: string;
}>;

export const DEFAULT_LABEL_STYLE: LabelElementStyle = {
  fontSizeMm: LABEL_DEFAULT_FONT_MM,
  fontWeight: "normal",
  align: "left",
  color: "#000000",
  backgroundColor: "#FFFFFF",
  borderWidthMm: 0.2,
  borderRadiusMm: 0,
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
/** A stored dimension is never allowed to be zero or negative. */
const MIN_READABLE_MM = 0.1;
/** Element kinds that render content and can therefore carry a field binding. */
const BINDABLE_KINDS: readonly LabelElementKind[] = ["text", "field", "qr", "barcode", "image"];

export const roundMm = (value: number): number => Math.round(value * 100) / 100;

export const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readNumber = (record: Record<string, unknown>, keys: readonly string[]): number | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const readString = (record: Record<string, unknown>, keys: readonly string[]): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return null;
};

const readBooleans = (record: Record<string, unknown>, keys: readonly string[]): boolean | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (value === 0 || value === 1) return value === 1;
  }
  return null;
};

/** Legacy element kinds the approved designer already used. */
const kindFrom = (raw: string | null): LabelElementKind => {
  const value = (raw ?? "text").toLowerCase();
  if (value.includes("qr")) return "qr";
  if (value.includes("barcode")) return "barcode";
  if (value.includes("line")) return "line";
  if (value.includes("frame") || value.includes("rect") || value.includes("box") || value.includes("shape")) return "frame";
  if (value.includes("image") || value.includes("logo")) return "image";
  if (value.includes("variable") || value.includes("field") || value.includes("binding")) return "field";
  return "text";
};

const readStyle = (record: Record<string, unknown>): LabelElementStyle => {
  const nested = typeof record.style === "object" && record.style !== null
    ? (record.style as Record<string, unknown>)
    : {};
  const merged = { ...record, ...nested };

  const align = readString(merged, ["align", "textAlign", "justify"]);
  const weight = readString(merged, ["fontWeight", "weight"]);
  const color = readString(merged, ["color", "foregroundColor"]);
  const background = readString(merged, ["backgroundColor", "fillColor"]);
  const fontSize = readNumber(merged, ["fontSizeMm", "fontSize", "size", "heightMm"]);

  return {
    fontSizeMm: roundMm(clampNumber(fontSize ?? LABEL_DEFAULT_FONT_MM, LABEL_MIN_FONT_MM, LABEL_MAX_FONT_MM)),
    fontWeight: weight === "bold" || weight === "700" ? "bold" : "normal",
    align: align === "center" || align === "right" ? align : "left",
    color: typeof color === "string" && HEX_COLOR.test(color) ? color : DEFAULT_LABEL_STYLE.color,
    backgroundColor:
      typeof background === "string" && HEX_COLOR.test(background)
        ? background
        : DEFAULT_LABEL_STYLE.backgroundColor,
    borderWidthMm: roundMm(clampNumber(finiteOr(merged.borderWidthMm, DEFAULT_LABEL_STYLE.borderWidthMm), 0, 5)),
    borderRadiusMm: roundMm(clampNumber(finiteOr(merged.borderRadiusMm, 0), 0, 20)),
  };
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/**
 * Reads one persisted element into the canonical shape. Unknown values return
 * `null` instead of throwing, so a single malformed element can never make the
 * whole stored template unreadable.
 */
export const normalizeLabelElement = (value: unknown, fallbackId = "element"): LabelElement | null => {
  const record = asRecord(value);
  if (!record) return null;

  const kind = kindFrom(readString(record, ["kind", "type", "elementType"]));
  const style = readStyle(record);
  // Any element that carries content can be bound to a product field, which is
  // what lets a QR code or barcode encode the real product code.
  const rawBinding = readString(record, ["binding", "field", "fieldKey"]);
  const binding = rawBinding !== null && isLabelFieldKey(rawBinding) && BINDABLE_KINDS.includes(kind)
    ? rawBinding
    : null;
  const rotation = readNumber(record, ["rotation", "angle"]);
  const ecc = readString(record, ["errorCorrection", "ecc"]);
  const barcodeType = readString(record, ["barcodeType", "symbology"]);
  const id = readString(record, ["id"]);
  const visible = readBooleans(record, ["visible"]);

  return {
    id: id !== null && id.trim().length > 0 ? id : fallbackId,
    kind,
    xMm: roundMm(Math.max(0, finiteOr(readNumber(record, ["xMm", "x", "left"]), 0))),
    yMm: roundMm(Math.max(0, finiteOr(readNumber(record, ["yMm", "y", "top"]), 0))),
    // Only a positive floor is applied here; the per-kind minimum is enforced by
    // `constrainElement`, which knows that a line may legitimately be thinner.
    widthMm: roundMm(Math.max(MIN_READABLE_MM, finiteOr(readNumber(record, ["widthMm", "w", "width"]), 20))),
    heightMm: roundMm(Math.max(MIN_READABLE_MM, finiteOr(readNumber(record, ["heightMm", "h", "height"]), 12))),
    rotation: rotation !== null && LABEL_ROTATIONS.includes(rotation as LabelRotation)
      ? (rotation as LabelRotation)
      : 0,
    zIndex: Math.max(0, Math.round(finiteOr(record.zIndex, 0))),
    visible: visible ?? true,
    text: readString(record, ["text", "content", "value", "data"]) ?? "",
    binding,
    style,
    errorCorrection: ecc !== null && ecc.toUpperCase() in { L: 1, M: 1, Q: 1, H: 1 }
      ? (ecc.toUpperCase() as LabelErrorCorrection)
      : "M",
    paddingMm: roundMm(clampNumber(finiteOr(record.paddingMm, 0.5), 0, 20)),
    showFrame: readBooleans(record, ["showFrame", "frame"]) ?? false,
    barcodeType: barcodeType !== null && (LABEL_BARCODE_TYPES as readonly string[]).includes(barcodeType)
      ? (barcodeType as LabelBarcodeType)
      : "code128",
    humanReadable: readBooleans(record, ["humanReadable", "showText"]) ?? false,
    imagePath: readString(record, ["imagePath", "src"]) ?? null,
  };
};

export type NormalizeElementsResult = Readonly<{
  elements: readonly LabelElement[];
  droppedCount: number;
}>;

export const normalizeLabelElements = (values: readonly unknown[]): NormalizeElementsResult => {
  const elements: LabelElement[] = [];
  let droppedCount = 0;

  values.forEach((value, index) => {
    const element = normalizeLabelElement(value, `element-${index + 1}`);
    if (element === null) droppedCount += 1;
    else elements.push(element);
  });

  return { elements, droppedCount };
};

/**
 * Builds the canonical document from persisted elements plus the stored label
 * size. Physical millimetres are the only unit here; nothing about the current
 * monitor, zoom level or DOM ever reaches this model.
 */
export const createLabelDocument = (input: {
  widthMm: number;
  heightMm: number;
  elements?: readonly unknown[];
  version?: number;
}): LabelDocument => {
  const widthMm = roundMm(clampNumber(input.widthMm, 1, LABEL_MAX_DIMENSION_MM));
  const heightMm = roundMm(clampNumber(input.heightMm, 1, LABEL_MAX_DIMENSION_MM));
  const { elements } = normalizeLabelElements(input.elements ?? []);

  return {
    version: input.version ?? LABEL_DOCUMENT_VERSION,
    unit: LABEL_UNIT,
    widthMm,
    heightMm,
    elements,
  };
};

/** Re-applies the deterministic constraints of one element. */
export const constrainElement = (element: LabelElement, bounds: { widthMm: number; heightMm: number }): LabelElement => {
  if (element.kind === "line") return constrainLine(element, bounds);

  const widthMm = roundMm(clampNumber(element.widthMm, LABEL_MIN_ELEMENT_MM, bounds.widthMm));
  const heightMm = roundMm(clampNumber(element.heightMm, LABEL_MIN_ELEMENT_MM, bounds.heightMm));
  const xMm = roundMm(clampNumber(element.xMm, 0, Math.max(0, bounds.widthMm - widthMm)));
  const yMm = roundMm(clampNumber(element.yMm, 0, Math.max(0, bounds.heightMm - heightMm)));

  if (xMm === element.xMm && yMm === element.yMm && widthMm === element.widthMm && heightMm === element.heightMm) {
    return element;
  }
  return { ...element, xMm, yMm, widthMm, heightMm };
};

/** A line may be thin in one axis, so it keeps its own minimum. */
const constrainLine = (element: LabelElement, bounds: { widthMm: number; heightMm: number }): LabelElement => {
  const horizontal = element.widthMm >= element.heightMm;
  const minThickness = 0.2;
  const widthMm = roundMm(horizontal
    ? clampNumber(element.widthMm, LABEL_MIN_ELEMENT_MM, bounds.widthMm)
    : clampNumber(element.widthMm, minThickness, bounds.widthMm));
  const heightMm = roundMm(horizontal
    ? clampNumber(element.heightMm, minThickness, bounds.heightMm)
    : clampNumber(element.heightMm, LABEL_MIN_ELEMENT_MM, bounds.heightMm));
  const xMm = roundMm(clampNumber(element.xMm, 0, Math.max(0, bounds.widthMm - widthMm)));
  const yMm = roundMm(clampNumber(element.yMm, 0, Math.max(0, bounds.heightMm - heightMm)));

  if (xMm === element.xMm && yMm === element.yMm && widthMm === element.widthMm && heightMm === element.heightMm) {
    return element;
  }
  return { ...element, xMm, yMm, widthMm, heightMm };
};

export const constrainDocument = (document: LabelDocument): LabelDocument => ({
  ...document,
  elements: document.elements.map(element => constrainElement(element, document)),
});

/** Deterministic, collision-free element id: `kind-1`, `kind-2`, ... */
export const nextElementId = (
  kind: LabelElementKind,
  existing: readonly LabelElement[],
): string => {
  let counter = 1;
  const used = new Set(existing.map(element => element.id));
  while (used.has(`${kind}-${counter}`)) counter += 1;
  return `${kind}-${counter}`;
};

/** Defaults per element kind. Used by the toolbox and by the editor commands. */
export const createLabelElement = (
  kind: LabelElementKind,
  existing: readonly LabelElement[] = [],
  overrides: Partial<Omit<LabelElement, "id">> = {},
): LabelElement => {
  const id = nextElementId(kind, existing);
  const zIndex = existing.reduce((highest, element) => Math.max(highest, element.zIndex + 1), 0);
  const base: LabelElement = {
    id,
    kind,
    xMm: 4,
    yMm: 4,
    widthMm: 24,
    heightMm: 10,
    rotation: 0,
    zIndex,
    visible: true,
    text: "",
    binding: null,
    style: DEFAULT_LABEL_STYLE,
    errorCorrection: "M",
    paddingMm: 0.5,
    showFrame: false,
    barcodeType: "code128",
    humanReadable: false,
    imagePath: null,
  };

  const defaultsByKind: Record<LabelElementKind, Partial<LabelElement>> = {
    text: { text: "متن جدید", widthMm: 24, heightMm: 6, style: { ...DEFAULT_LABEL_STYLE } },
    field: { text: "", binding: "product.name", widthMm: 26, heightMm: 6, style: { ...DEFAULT_LABEL_STYLE } },
    qr: { text: "", heightMm: 18, widthMm: 18, style: { ...DEFAULT_LABEL_STYLE } },
    barcode: { text: "", widthMm: 30, heightMm: 10, humanReadable: true, style: { ...DEFAULT_LABEL_STYLE } },
    line: { widthMm: 30, heightMm: 0.4, style: { ...DEFAULT_LABEL_STYLE } },
    frame: { widthMm: 20, heightMm: 12, style: { ...DEFAULT_LABEL_STYLE } },
    image: { text: "تصویر", widthMm: 12, heightMm: 12, style: { ...DEFAULT_LABEL_STYLE } },
  };

  const defaults = defaultsByKind[kind];
  return constrainElement({ ...base, ...defaults, ...overrides, id, kind }, { widthMm: 100, heightMm: 100 });
};

export const serializeLabelDocument = (document: LabelDocument): string =>
  JSON.stringify({
    version: document.version,
    unit: LABEL_UNIT,
    widthMm: document.widthMm,
    heightMm: document.heightMm,
    elements: document.elements,
  });

/**
 * Validates a persisted layout JSON string before the designer trusts it.
 * A malformed document is reported instead of being overwritten.
 */
export const parseLabelDocument = (
  layoutJson: string | null | undefined,
  fallback: { widthMm: number; heightMm: number },
): Readonly<{ document: LabelDocument | null; issues: readonly LabelDocumentIssue[] }> => {
  if (typeof layoutJson !== "string" || layoutJson.trim().length === 0) {
    return { document: null, issues: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(layoutJson);
  } catch {
    return {
      document: null,
      issues: [{ field: "elements", message: "محتوای قالب ذخیره‌شده قابل خواندن نیست" }],
    };
  }

  const record = asRecord(parsed) ?? (Array.isArray(parsed) ? { elements: parsed } : null);
  if (record === null) {
    return {
      document: null,
      issues: [{ field: "elements", message: "ساختار قالب ذخیره‌شده نامعتبر است" }],
    };
  }

  const issues: LabelDocumentIssue[] = [];
  const version = readNumber(record, ["version"]);
  if (version !== null && (!Number.isInteger(version) || version < 1)) {
    issues.push({ field: "version", message: "نسخه قالب پشتیبانی نمی‌شود" });
  }
  if (version !== null && version > LABEL_DOCUMENT_VERSION) {
    issues.push({
      field: "version",
      message: `این قالب با نسخه جدیدتر (${version}) ساخته شده است و باز نمی‌شود`,
    });
  }

  const elementsValue = record.elements;
  if (elementsValue !== undefined && !Array.isArray(elementsValue)) {
    issues.push({ field: "elements", message: "فهرست عناصر قالب نامعتبر است" });
  }
  if (issues.length > 0) return { document: null, issues };

  const widthMm = readNumber(record, ["widthMm"]) ?? fallback.widthMm;
  const heightMm = readNumber(record, ["heightMm"]) ?? fallback.heightMm;
  if (!(widthMm > 0) || !(heightMm > 0)) {
    return {
      document: null,
      issues: [{ field: "widthMm", message: "ابعاد قالب ذخیره‌شده نامعتبر است" }],
    };
  }

  const document = createLabelDocument({
    widthMm,
    heightMm,
    version: version ?? LABEL_DOCUMENT_VERSION,
    elements: Array.isArray(elementsValue) ? elementsValue : [],
  });

  return { document: constrainDocument(document), issues };
};

/** Duplicate of an element at a small offset, with a fresh id. */
export const duplicateLabelElement = (
  element: LabelElement,
  existing: readonly LabelElement[],
  offsetMm = 2,
): LabelElement => {
  const copy: LabelElement = {
    ...element,
    id: nextElementId(element.kind, existing),
    zIndex: existing.reduce((highest, item) => Math.max(highest, item.zIndex + 1), 0),
    xMm: roundMm(element.xMm + offsetMm),
    yMm: roundMm(element.yMm + offsetMm),
  };
  return copy;
};
