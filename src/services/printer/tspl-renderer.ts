import type { LabelPrintElement, LabelPrintModel } from "./label-print-model";
import { createDefaultLabelModel, mmToDotsAtDpi } from "./label-print-model";
import { estimateTextOffsetMm } from "../label-designer/label-geometry";
import type { LabelRotation } from "../label-designer/label-document";

/** TSPL strings are double-quoted; embedded quotes and control chars are removed. */
const escapeTsplText = (value: string): string => value.replace(/["\r\n]+/g, " ");

type Options = Readonly<{ dpi?: number }>;

const rotationFor = (rotation: LabelRotation | undefined): 0 | 90 | 180 | 270 =>
  rotation === 90 || rotation === 180 || rotation === 270 ? rotation : 0;

const dots = (millimetres: number, options: Options): number => mmToDotsAtDpi(millimetres, options.dpi);

const textCommand = (
  element: Extract<LabelPrintElement, { kind: "text" }>,
  options: Options,
): string => {
  const height = Math.max(8, Math.floor(dots(element.heightMm ?? 3.2, options) / 2));
  const width = Math.max(8, Math.floor(dots(element.widthMm ?? 2.6, options) / 2));
  const box = element.boxWidthMm ?? element.widthMm ?? 0;
  const offset = element.align === "right" || element.align === "center"
    ? estimateTextOffsetMm(element.content, element.heightMm ?? 3.2, box, element.align, element.bold === true)
    : 0;
  const x = dots(element.xMm + offset, options);
  const y = dots(element.yMm, options);
  const rotation = rotationFor(element.rotation);
  const content = escapeTsplText(element.content);

  const commands = [`TEXT ${x},${y},"3",${rotation},${width},${height},"${content}"`];
  if (element.bold === true) commands.push(`TEXT ${x + 1},${y},"3",${rotation},${width},${height},"${content}"`);
  return commands.join("\n");
};

const qrCommand = (
  element: Extract<LabelPrintElement, { kind: "qr" }>,
  options: Options,
): string => {
  const cell = Math.max(2, Math.round((element.moduleMm ?? 0.75) / 0.25));
  const level = element.errorCorrection ?? "M";
  const rotation = rotationFor(element.rotation);
  return `QRCODE ${dots(element.xMm, options)},${dots(element.yMm, options)},${level},${cell},A,${rotation},"${escapeTsplText(element.content)}"`;
};

const imageCommand = (
  element: Extract<LabelPrintElement, { kind: "image" }>,
  options: Options,
): string => {
  const x = dots(element.xMm, options);
  const y = dots(element.yMm, options);
  const right = x + dots(element.widthMm, options);
  const bottom = y + dots(element.heightMm, options);
  return [
    `BOX ${x},${y},${right},${bottom},2`,
    `TEXT ${x + 4},${y + 4},"3",0,16,16,"${escapeTsplText(element.label)}"`,
  ].join("\n");
};

const boxCommand = (
  element: Extract<LabelPrintElement, { kind: "line" | "frame" }>,
  options: Options,
): string => {
  const x = dots(element.xMm, options);
  const y = dots(element.yMm, options);
  const width = Math.max(1, dots(element.widthMm, options));
  const height = Math.max(1, dots(element.heightMm, options));
  const right = x + width;
  const bottom = y + height;

  // A line is a filled bar; a frame is an outlined box.
  if (element.kind === "line") return `BAR ${x},${y},${width},${height}`;
  return `BOX ${x},${y},${right},${bottom},${Math.max(1, dots(element.thicknessMm, options))}`;
};

const barcodeCommand = (
  element: Extract<LabelPrintElement, { kind: "barcode" }>,
  options: Options,
): string => {
  const height = Math.max(2, dots(element.heightMm, options));
  const narrow = Math.max(1, Math.min(10, dots(element.narrowMm, options)));
  return `BARCODE ${dots(element.xMm, options)},${dots(element.yMm, options)},"128",${height},${element.humanReadable ? 1 : 0},${rotationFor(element.rotation)},${narrow},${narrow * 2},"${escapeTsplText(element.content)}"`;
};

/**
 * TSPL/TSPL2 rendering for TSC-style printers. Sizes stay in millimetres so the
 * driver keeps its own resolution handling.
 */
export const renderTspl = (model: LabelPrintModel, options: Options = {}): string => {
  const commands: string[] = [
    `SIZE ${model.widthMm} mm,${model.heightMm} mm`,
    "GAP 2 mm,0 mm",
    "DIRECTION 1",
    "CLS",
  ];

  for (const element of model.elements) {
    switch (element.kind) {
      case "text": commands.push(textCommand(element, options)); break;
      case "qr": commands.push(qrCommand(element, options)); break;
      case "image": commands.push(imageCommand(element, options)); break;
      case "line":
      case "frame": commands.push(boxCommand(element, options)); break;
      case "barcode": commands.push(barcodeCommand(element, options)); break;
      default: break;
    }
  }

  commands.push(`PRINT ${Math.max(1, model.copies)},1`);
  return commands.join("\n");
};

/** Deterministic test label used by the Settings printer test action. */
export const renderTsplTestLabel = (options: { printerName?: string; copies?: number } = {}): string =>
  renderTspl({
    ...createDefaultLabelModel({
      name: "چاپ تست",
      productName: "GOLD-LABEL-TEST",
      productCode: "GLSP-TEST",
      copies: options.copies ?? 1,
    }),
    elements: [
      { kind: "text", xMm: 2, yMm: 2, content: "GOLD LABEL STUDIO PRO", heightMm: 3.2, widthMm: 2.4 },
      { kind: "text", xMm: 2, yMm: 9, content: "چاپ تست چاپگر", heightMm: 2.8, widthMm: 2.2 },
      { kind: "qr", xMm: 34, yMm: 8, content: "GLSP-TEST", moduleMm: 0.75, errorCorrection: "M" },
      ...(options.printerName ? [{ kind: "text" as const, xMm: 2, yMm: 20, content: options.printerName, heightMm: 2.4, widthMm: 1.8 }] : []),
    ],
  });
