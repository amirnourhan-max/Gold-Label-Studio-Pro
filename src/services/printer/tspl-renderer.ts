import type { LabelPrintElement, LabelPrintModel } from "./label-print-model";
import { createDefaultLabelModel, mmToDots } from "./label-print-model";

/** TSPL strings are double-quoted; embedded quotes and control chars are removed. */
const escapeTsplText = (value: string): string => value.replace(/["\r\n]+/g, " ");

const textCommand = (element: Extract<LabelPrintElement, { kind: "text" }>): string => {
  const height = Math.max(8, Math.floor(mmToDots(element.heightMm ?? 3.2) / 2));
  const width = Math.max(8, Math.floor(mmToDots(element.widthMm ?? 2.6) / 2));
  return `TEXT ${mmToDots(element.xMm)},${mmToDots(element.yMm)},"3",0,${width},${height},"${escapeTsplText(element.content)}"`;
};

const qrCommand = (element: Extract<LabelPrintElement, { kind: "qr" }>): string => {
  const cell = Math.max(2, Math.round((element.moduleMm ?? 0.75) / 0.25));
  const level = element.errorCorrection ?? "M";
  return `QRCODE ${mmToDots(element.xMm)},${mmToDots(element.yMm)},${level},${cell},A,0,"${escapeTsplText(element.content)}"`;
};

const imageCommand = (element: Extract<LabelPrintElement, { kind: "image" }>): string => {
  const x = mmToDots(element.xMm);
  const y = mmToDots(element.yMm);
  const right = x + mmToDots(element.widthMm);
  const bottom = y + mmToDots(element.heightMm);
  return [
    `BOX ${x},${y},${right},${bottom},2`,
    `TEXT ${x + 4},${y + 4},"3",0,16,16,"${escapeTsplText(element.label)}"`,
  ].join("\n");
};

/**
 * TSPL/TSPL2 rendering for TSC-style printers. Sizes stay in millimetres so the
 * driver keeps its own resolution handling.
 */
export const renderTspl = (model: LabelPrintModel): string => {
  const commands: string[] = [
    `SIZE ${model.widthMm} mm,${model.heightMm} mm`,
    "GAP 2 mm,0 mm",
    "DIRECTION 1",
    "CLS",
  ];

  for (const element of model.elements) {
    if (element.kind === "text") commands.push(textCommand(element));
    else if (element.kind === "qr") commands.push(qrCommand(element));
    else commands.push(imageCommand(element));
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