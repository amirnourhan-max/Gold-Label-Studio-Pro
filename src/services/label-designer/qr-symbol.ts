import qrcode from "qrcode-generator";
import type { LabelErrorCorrection } from "./label-document";

/**
 * QR generation is a service so neither the designer component nor the printer
 * renderers embed an encoder. `qrcode-generator` is pure JavaScript with no
 * runtime dependencies and its UTF-8 table is selected explicitly, which the
 * Persian product names need.
 */
qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];

/** Modules of white space the QR specification requires around the symbol. */
export const QR_QUIET_ZONE_MODULES = 4;

export type QrMatrix = Readonly<{
  moduleCount: number;
  isDark(row: number, column: number): boolean;
}>;

/**
 * Builds the module matrix for the given content. Empty or unencodable content
 * returns `null` instead of throwing, so a half-edited element cannot break the
 * canvas.
 */
export const buildQrMatrix = (
  content: string,
  errorCorrection: LabelErrorCorrection = "M",
): QrMatrix | null => {
  if (typeof content !== "string" || content.length === 0) return null;

  try {
    // Type 0 asks the encoder for the smallest version that fits.
    const symbol = qrcode(0, errorCorrection);
    symbol.addData(content);
    symbol.make();
    const moduleCount = symbol.getModuleCount();
    if (!Number.isInteger(moduleCount) || moduleCount <= 0) return null;
    return { moduleCount, isDark: (row, column) => symbol.isDark(row, column) };
  } catch {
    return null;
  }
};

const round = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * Converts a matrix into a single SVG path in a square `sizePx` box. Only
 * numbers reach the path data, so no user content is ever interpolated into
 * markup. Horizontal runs of dark modules are merged to keep the path short.
 */
export const qrSvgPath = (
  matrix: QrMatrix,
  sizePx: number,
  quietZoneModules = QR_QUIET_ZONE_MODULES,
): string => {
  const totalModules = matrix.moduleCount + quietZoneModules * 2;
  if (!Number.isFinite(sizePx) || sizePx <= 0 || totalModules <= 0) return "";

  const cell = sizePx / totalModules;
  const commands: string[] = [];

  for (let row = 0; row < matrix.moduleCount; row += 1) {
    let column = 0;
    while (column < matrix.moduleCount) {
      if (!matrix.isDark(row, column)) {
        column += 1;
        continue;
      }
      let run = 1;
      while (column + run < matrix.moduleCount && matrix.isDark(row, column + run)) run += 1;
      const x = round((column + quietZoneModules) * cell);
      const y = round((row + quietZoneModules) * cell);
      const width = round(run * cell);
      const height = round(cell);
      commands.push(`M${x} ${y}h${width}v${height}h-${width}z`);
      column += run;
    }
  }

  return commands.join("");
};
