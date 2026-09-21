import type { LabelPrintElement, LabelPrintModel } from "./label-print-model";
import { createDefaultLabelModel, mmToDotsAtDpi } from "./label-print-model";
import { estimateTextOffsetMm } from "../label-designer/label-geometry";
import type { LabelRotation } from "../label-designer/label-document";

/** Field data cannot carry ZPL control characters; they are neutralised. */
const escapeZplText = (value: string): string => value.replace(/[\^~]/g, " ").replace(/[\r\n]+/g, " ");

type Options = Readonly<{ dpi?: number }>;

/** ZPL field orientation: N normal, R 90°, I 180°, B 270°. */
const orientationFor = (rotation: LabelRotation | undefined): "N" | "R" | "I" | "B" =>
  rotation === 90 ? "R" : rotation === 180 ? "I" : rotation === 270 ? "B" : "N";

const dots = (millimetres: number, options: Options): number => mmToDotsAtDpi(millimetres, options.dpi);

const textCommand = (
  element: Extract<LabelPrintElement, { kind: "text" }>,
  options: Options,
): string => {
  const height = dots(element.heightMm ?? 3.2, options);
  const width = dots(element.widthMm ?? 2.6, options);
  const orientation = orientationFor(element.rotation);
  const x = dots(element.xMm, options);
  const y = dots(element.yMm, options);
  const commands: string[] = [];

  if (orientation !== "N") commands.push(`^FW${orientation}`);
  if (element.align === "right" || element.align === "center") {
    const box = element.boxWidthMm ?? element.widthMm ?? 0;
    commands.push(`^FB${dots(box, options)},1,0,${element.align === "right" ? "R" : "C"}`);
  }

  const content = escapeZplText(element.content);
  commands.push(`^FO${x},${y}^A0N,${height},${width}^FD${content}^FS`);
  // ZPL has no bold attribute for scalable font A0; a one-dot double strike is
  // the standard way to thicken it deterministically.
  if (element.bold === true) commands.push(`^FO${x + 1},${y}^A0N,${height},${width}^FD${content}^FS`);
  if (orientation !== "N") commands.push("^FWN");

  return commands.join("\n");
};

const qrCommand = (
  element: Extract<LabelPrintElement, { kind: "qr" }>,
  options: Options,
): string => {
  const magnification = Math.max(1, Math.round((element.moduleMm ?? 0.75) / 0.25));
  const level = element.errorCorrection ?? "M";
  const orientation = orientationFor(element.rotation);
  const commands: string[] = [];

  if (orientation !== "N") commands.push(`^FW${orientation}`);
  commands.push(
    `^FO${dots(element.xMm, options)},${dots(element.yMm, options)}^BQN,2,${magnification}^FD${level}A,${escapeZplText(element.content)}^FS`,
  );
  if (orientation !== "N") commands.push("^FWN");

  return commands.join("\n");
};

const imageCommand = (
  element: Extract<LabelPrintElement, { kind: "image" }>,
  options: Options,
): string => {
  const width = dots(element.widthMm, options);
  const height = dots(element.heightMm, options);
  const x = dots(element.xMm, options);
  const y = dots(element.yMm, options);
  const font = Math.min(24, Math.max(12, Math.floor(height / 3)));
  return [
    `^FO${x},${y}^GB${width},${height},1^FS`,
    `^FO${x + 4},${y + 4}^A0N,${font},${font}^FD${escapeZplText(element.label)}^FS`,
  ].join("\n");
};

const boxCommand = (
  element: Extract<LabelPrintElement, { kind: "line" | "frame" }>,
  options: Options,
): string => {
  const width = Math.max(1, dots(element.widthMm, options));
  const height = Math.max(1, dots(element.heightMm, options));
  const thickness = Math.max(1, dots(element.thicknessMm, options));
  return `^FO${dots(element.xMm, options)},${dots(element.yMm, options)}^GB${width},${height},${thickness}^FS`;
};

const barcodeCommand = (
  element: Extract<LabelPrintElement, { kind: "barcode" }>,
  options: Options,
): string => {
  const height = Math.max(2, dots(element.heightMm, options));
  const narrow = Math.max(1, dots(element.narrowMm, options));
  const orientation = orientationFor(element.rotation);
  const commands: string[] = [];

  if (orientation !== "N") commands.push(`^FW${orientation}`);
  commands.push(`^BY${narrow},2,${height}`);
  commands.push(
    `^FO${dots(element.xMm, options)},${dots(element.yMm, options)}^BCN,${height},${element.humanReadable ? "Y" : "N"},N,N^FD${escapeZplText(element.content)}^FS`,
  );
  if (orientation !== "N") commands.push("^FWN");

  return commands.join("\n");
};

/**
 * ZPL II rendering. Millimetres are converted to printer dots at the print
 * head resolution (203 dpi by default, 8 dots per millimetre) so the label size
 * never depends on the printer's configured defaults.
 */
export const renderZpl = (model: LabelPrintModel, options: Options = {}): string => {
  const commands: string[] = [
    "^XA",
    "^CI28",
    "^LH0,0",
    `^PW${dots(model.widthMm, options)}`,
    `^LL${dots(model.heightMm, options)}`,
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
