import type { LabelPrintElement, LabelPrintModel } from "./label-print-model";
import { createDefaultLabelModel, mmToDots } from "./label-print-model";

/** Field data cannot carry ZPL control characters; they are neutralised. */
const escapeZplText = (value: string): string => value.replace(/[\^~]/g, " ").replace(/[\r\n]+/g, " ");

const textCommand = (element: Extract<LabelPrintElement, { kind: "text" }>): string => {
  const height = mmToDots(element.heightMm ?? 3.2);
  const width = mmToDots(element.widthMm ?? 2.6);
  return `^FO${mmToDots(element.xMm)},${mmToDots(element.yMm)}^A0N,${height},${width}^FD${escapeZplText(element.content)}^FS`;
};

const qrCommand = (element: Extract<LabelPrintElement, { kind: "qr" }>): string => {
  const magnification = Math.max(1, Math.round((element.moduleMm ?? 0.75) / 0.25));
  const level = element.errorCorrection ?? "M";
  return `^FO${mmToDots(element.xMm)},${mmToDots(element.yMm)}^BQN,2,${magnification}^FD${level}A,${escapeZplText(element.content)}^FS`;
};

const imageCommand = (element: Extract<LabelPrintElement, { kind: "image" }>): string => {
  const width = mmToDots(element.widthMm);
  const height = mmToDots(element.heightMm);
  const x = mmToDots(element.xMm);
  const y = mmToDots(element.yMm);
  return [
    `^FO${x},${y}^GB${width},${height},1^FS`,
    `^FO${x + 4},${y + 4}^A0N,${Math.min(24, Math.max(12, Math.floor(height / 3)))},${Math.min(24, Math.max(12, Math.floor(height / 3)))}^FD${escapeZplText(element.label)}^FS`,
  ].join("\n");
};

/**
 * ZPL II rendering. Dimensions are converted from millimetres to 203dpi dots so
 * the label size does not depend on the printer's configured defaults.
 */
export const renderZpl = (model: LabelPrintModel): string => {
  const commands: string[] = [
    "^XA",
    "^CI28",
    "^LH0,0",
    `^PW${mmToDots(model.widthMm)}`,
    `^LL${mmToDots(model.heightMm)}`,
  ];

  for (const element of model.elements) {
    if (element.kind === "text") commands.push(textCommand(element));
    else if (element.kind === "qr") commands.push(qrCommand(element));
    else commands.push(imageCommand(element));
  }

  commands.push(`^PQ${Math.max(1, model.copies)}`);
  commands.push("^XZ");
  return commands.join("\n");
};

/** Deterministic test label used by the Settings printer test action. */
export const renderZplTestLabel = (options: { printerName?: string; copies?: number } = {}): string =>
  renderZpl({
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