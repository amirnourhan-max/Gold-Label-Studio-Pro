/**
 * Code 128 (subset B) encoding. Code 128 is the symbology both the ZPL `^BC`
 * and the TSPL `BARCODE "128"` commands default to, so one encoder drives the
 * designer preview and the printer alike.
 *
 * Each entry is the six element widths (bar, space, bar, space, bar, space) that
 * make up an 11-module symbol; the last entry is the 13-module stop pattern.
 */
export const CODE128_PATTERNS: readonly string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
  "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
  "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
  "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
  "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
  "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
  "211214", "211232", "2331112",
];

export const CODE128_START_B = 104;
export const CODE128_STOP = 106;
export const CODE128_CHECKSUM_MODULO = 103;

export type BarcodeEncoding = Readonly<{
  value: string;
  modules: readonly boolean[];
  /** Module count, used to derive the narrow-bar width for the printer. */
  moduleCount: number;
  /** Widths string handed to renderers that want the raw pattern. */
  pattern: string;
}>;

export const isCode128Encodable = (value: string): boolean =>
  typeof value === "string" && value.length > 0 && [...value].every(character => {
    const code = character.charCodeAt(0);
    return code >= 32 && code <= 126;
  });

export const code128Checksum = (values: readonly number[]): number => {
  const sum = values.reduce((total, value, index) => total + value * (index === 0 ? 1 : index), 0);
  return sum % CODE128_CHECKSUM_MODULO;
};

/**
 * Encodes `value` as Code 128 subset B. Values outside printable ASCII return
 * `null` so the caller can render a truthful placeholder instead of a symbol
 * that would scan as different data.
 */
export const encodeCode128B = (value: string): BarcodeEncoding | null => {
  if (!isCode128Encodable(value)) return null;

  const dataValues = [...value].map(character => character.charCodeAt(0) - 32);
  const values = [CODE128_START_B, ...dataValues, code128Checksum([CODE128_START_B, ...dataValues]), CODE128_STOP];

  const pattern = values.map(entry => CODE128_PATTERNS[entry]).join("");
  const modules: boolean[] = [];
  let isBar = true;

  for (const width of pattern) {
    const count = Number(width);
    for (let index = 0; index < count; index += 1) modules.push(isBar);
    isBar = !isBar;
  }

  return { value, modules, moduleCount: modules.length, pattern };
};

/** Single SVG path of `1 × heightPx` bars spread over `widthPx`. */
export const barcodeSvgPath = (
  encoding: BarcodeEncoding,
  widthPx: number,
  heightPx: number,
): string => {
  if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0) return "";

  const moduleWidth = widthPx / encoding.moduleCount;
  const commands: string[] = [];

  for (let index = 0; index < encoding.moduleCount; index += 1) {
    if (!encoding.modules[index]) continue;
    let run = 1;
    while (index + run < encoding.moduleCount && encoding.modules[index + run]) run += 1;
    const x = Math.round(index * moduleWidth * 1000) / 1000;
    const width = Math.round(run * moduleWidth * 1000) / 1000;
    commands.push(`M${x} 0h${width}v${Math.round(heightPx * 1000) / 1000}h-${width}z`);
    index += run - 1;
  }

  return commands.join("");
};
