import { encodeCode128B } from "../label-designer/barcode-symbol";
import {
  LABEL_MIN_ELEMENT_MM,
  parseLabelDocument,
  type LabelDocument,
  type LabelElement,
  type LabelRotation,
  type LabelTextAlign,
} from "../label-designer/label-document";
import {
  EMPTY_LABEL_DATA_CONTEXT,
  resolveLabelText,
  type LabelDataContext,
} from "../label-designer/label-bindings";
import { buildQrMatrix, QR_QUIET_ZONE_MODULES } from "../label-designer/qr-symbol";

/**
 * Printer-neutral label model. It is the single normalised form between the
 * persisted designer document and the ZPL/TSPL renderers, and it is expressed
 * entirely in millimetres.
 */
export type LabelTextElement = Readonly<{
  kind: "text";
  xMm: number;
  yMm: number;
  content: string;
  /** Font cell height in millimetres. */
  heightMm?: number;
  /** Font cell width in millimetres. */
  widthMm?: number;
  rotation?: LabelRotation;
  align?: LabelTextAlign;
  bold?: boolean;
  /** Box used for ZPL alignment; the element width in millimetres. */
  boxWidthMm?: number;
}>;

export type LabelQrElement = Readonly<{
  kind: "qr";
  xMm: number;
  yMm: number;
  content: string;
  /** Module size in millimetres (magnification). */
  moduleMm?: number;
  errorCorrection?: "L" | "M" | "Q" | "H";
  rotation?: LabelRotation;
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

export type LabelLineElement = Readonly<{
  kind: "line";
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
}>;

export type LabelFrameElement = Readonly<{
  kind: "frame";
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
}>;

export type LabelBarcodeElement = Readonly<{
  kind: "barcode";
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  content: string;
  rotation: LabelRotation;
  humanReadable: boolean;
  /** Narrow bar width in millimetres; derived from the encoded module count. */
  narrowMm: number;
}>;

export type LabelPrintElement =
  | LabelTextElement
  | LabelQrElement
  | LabelImageElement
  | LabelLineElement
  | LabelFrameElement
  | LabelBarcodeElement;

export type LabelPrintModel = Readonly<{
  name: string;
  widthMm: number;
  heightMm: number;
  copies: number;
  elements: readonly LabelPrintElement[];
}>;

/** 203 dpi print heads: 8 dots per millimetre. */
export const DEFAULT_PRINTER_DPI = 203;
export const DOTS_PER_MM = 8;
/** ZPL/TSPL font cell width relative to the font height. */
const FONT_WIDTH_RATIO = 0.8;
const BOLD_FONT_WIDTH_RATIO = 0.86;
const FALLBACK_QR_MODULES = 21;

export const dotsPerMmForDpi = (dpi: number): number =>
  Number.isFinite(dpi) && dpi > 0 ? dpi / 25.4 : DEFAULT_PRINTER_DPI / 25.4;

/** Deterministic millimetre -> printer dot conversion at the configured dpi. */
export const mmToDotsAtDpi = (millimetres: number, dpi = DEFAULT_PRINTER_DPI): number =>
  Math.max(1, Math.round(millimetres * dotsPerMmForDpi(dpi)));

export const mmToDots = (millimetres: number): number => mmToDotsAtDpi(millimetres, DEFAULT_PRINTER_DPI);

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

const round = (value: number): number => Math.round(value * 1000) / 1000;

const moduleMmFor = (element: LabelElement, moduleCount: number): number => {
  // The element padding is a real quiet zone, so it shrinks the symbol exactly
  // the way the designer preview shows it.
  const side = Math.max(1, Math.min(element.widthMm, element.heightMm) - element.paddingMm * 2);
  const totalModules = moduleCount + QR_QUIET_ZONE_MODULES * 2;
  return round(Math.max(0.25, side / totalModules));
};

/** Kinds whose "show frame" option draws a real box on the printed label. */
const FRAMEABLE_KINDS: readonly LabelElement["kind"][] = ["text", "field", "qr", "barcode"];

const toPrintElement = (element: LabelElement, context: LabelDataContext): LabelPrintElement | null => {
  const content = resolveLabelText(element, context);
  const thicknessMm = Math.max(0.2, element.style.borderWidthMm);

  switch (element.kind) {
    case "text":
    case "field":
      return {
        kind: "text",
        xMm: element.xMm,
        yMm: element.yMm,
        content,
        heightMm: round(element.style.fontSizeMm),
        widthMm: round(element.style.fontSizeMm * (element.style.fontWeight === "bold" ? BOLD_FONT_WIDTH_RATIO : FONT_WIDTH_RATIO)),
        rotation: element.rotation,
        align: element.style.align,
        bold: element.style.fontWeight === "bold",
        boxWidthMm: element.widthMm,
      };

    case "qr": {
      const matrix = buildQrMatrix(content, element.errorCorrection);
      return {
        kind: "qr",
        xMm: element.xMm,
        yMm: element.yMm,
        content,
        moduleMm: moduleMmFor(element, matrix?.moduleCount ?? FALLBACK_QR_MODULES),
        errorCorrection: element.errorCorrection,
        rotation: element.rotation,
      };
    }

    case "barcode": {
      const encoding = encodeCode128B(content);
      if (encoding === null) return null;
      return {
        kind: "barcode",
        xMm: element.xMm,
        yMm: element.yMm,
        widthMm: element.widthMm,
        heightMm: element.heightMm,
        content,
        rotation: element.rotation,
        humanReadable: element.humanReadable,
        narrowMm: round(Math.max(0.1, element.widthMm / encoding.moduleCount)),
      };
    }

    case "line":
      return {
        kind: "line",
        xMm: element.xMm,
        yMm: element.yMm,
        widthMm: Math.max(LABEL_MIN_ELEMENT_MM, element.widthMm),
        heightMm: Math.max(0.2, element.heightMm),
        thicknessMm,
      };

    case "frame":
      return {
        kind: "frame",
        xMm: element.xMm,
        yMm: element.yMm,
        widthMm: element.widthMm,
        heightMm: element.heightMm,
        thicknessMm,
      };

    case "image":
      return {
        kind: "image",
        xMm: element.xMm,
        yMm: element.yMm,
        widthMm: element.widthMm,
        heightMm: element.heightMm,
        label: content.trim().length > 0 ? content : "تصویر",
      };

    default:
      return null;
  }
};

/** Builds the normalised print model from the canonical designer document. */
export const buildLabelPrintModel = (input: {
  document: LabelDocument;
  context?: LabelDataContext;
  name?: string;
  copies?: number;
}): LabelPrintModel => {
  const context = input.context ?? EMPTY_LABEL_DATA_CONTEXT;
  const elements: LabelPrintElement[] = [];

  for (const element of [...input.document.elements].filter(item => item.visible).sort((left, right) => left.zIndex - right.zIndex)) {
    const mapped = toPrintElement(element, context);
    if (mapped === null) continue;

    if (element.showFrame && FRAMEABLE_KINDS.includes(element.kind)) {
      elements.push({
        kind: "frame",
        xMm: element.xMm,
        yMm: element.yMm,
        widthMm: element.widthMm,
        heightMm: element.heightMm,
        thicknessMm: Math.max(0.2, element.style.borderWidthMm),
      });
    }
    elements.push(mapped);
  }

  return {
    name: input.name ?? "قالب لیبل",
    widthMm: input.document.widthMm,
    heightMm: input.document.heightMm,
    copies: input.copies ?? 1,
    elements,
  };
};

export type LabelPrintResolution = Readonly<{
  model: LabelPrintModel;
  /** True when the stored document had nothing printable and the approved default was used. */
  usedFallback: boolean;
}>;

const defaultResolution = (input: {
  name?: string;
  widthMm?: number;
  heightMm?: number;
  copies?: number;
  productName?: string;
  productCode?: string;
}): LabelPrintResolution => ({
  model: createDefaultLabelModel(input),
  usedFallback: true,
});

/**
 * Resolves an already-canonical document without serialising it back through a
 * legacy element-array format. This is the production path for the designer
 * and for templates loaded by the persistence gateway.
 */
export const resolveLabelDocumentPrintModel = (input: {
  document: LabelDocument;
  name: string;
  copies?: number;
  context?: LabelDataContext;
  productName?: string;
  productCode?: string;
}): LabelPrintResolution => {
  const fallbackOptions = {
    name: input.name,
    widthMm: input.document.widthMm,
    heightMm: input.document.heightMm,
    copies: input.copies ?? 1,
    productName: input.productName,
    productCode: input.productCode,
  };
  if (input.document.elements.length === 0) return defaultResolution(fallbackOptions);

  const model = buildLabelPrintModel({
    document: input.document,
    context: input.context,
    name: input.name,
    copies: input.copies ?? 1,
  });
  return model.elements.length === 0 ? defaultResolution(fallbackOptions) : { model, usedFallback: false };
};

/**
 * Resolves the persisted layout JSON of a saved template into the print model.
 * A malformed or empty document falls back to the approved default layout so a
 * print never produces a blank label, and the fallback is reported.
 */
export const resolveLabelPrintModel = (input: {
  name: string;
  widthMm: number;
  heightMm: number;
  layoutJson?: string | null;
  copies?: number;
  context?: LabelDataContext;
  productName?: string;
  productCode?: string;
}): LabelPrintResolution => {
  const fallbackOptions = {
    name: input.name,
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    copies: input.copies ?? 1,
    productName: input.productName,
    productCode: input.productCode,
  };

  const { document } = parseLabelDocument(input.layoutJson, {
    widthMm: input.widthMm,
    heightMm: input.heightMm,
  });
  if (document === null || document.elements.length === 0) return defaultResolution(fallbackOptions);

  return resolveLabelDocumentPrintModel({
    document,
    context: input.context,
    name: input.name,
    copies: input.copies ?? 1,
    productName: input.productName,
    productCode: input.productCode,
  });
};
