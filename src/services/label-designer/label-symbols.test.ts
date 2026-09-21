import { describe, expect, it } from "vitest";
import {
  CODE128_CHECKSUM_MODULO,
  CODE128_PATTERNS,
  CODE128_START_B,
  CODE128_STOP,
  barcodeSvgPath,
  code128Checksum,
  encodeCode128B,
  isCode128Encodable,
} from "./barcode-symbol";
import { QR_QUIET_ZONE_MODULES, buildQrMatrix, qrSvgPath } from "./qr-symbol";

describe("QR symbol service", () => {
  it("builds a deterministic module matrix for the given content", () => {
    const first = buildQrMatrix("R-250904-00125", "M");
    const second = buildQrMatrix("R-250904-00125", "M");

    expect(first).not.toBeNull();
    expect(first!.moduleCount).toBeGreaterThanOrEqual(21);
    for (let row = 0; row < first!.moduleCount; row += 1) {
      for (let column = 0; column < first!.moduleCount; column += 1) {
        expect(first!.isDark(row, column)).toBe(second!.isDark(row, column));
      }
    }
  });

  it("finds the QR finder pattern in the top-left corner", () => {
    const matrix = buildQrMatrix("GLSP", "M")!;

    expect(matrix.isDark(0, 0)).toBe(true);
    expect(matrix.isDark(1, 1)).toBe(false);
    expect(matrix.isDark(2, 2)).toBe(true);
  });

  it("encodes non-Latin content through the UTF-8 byte table", () => {
    expect(buildQrMatrix("انگشتر طرح گل", "Q")).not.toBeNull();
  });

  it("grows the symbol when the payload grows", () => {
    const short = buildQrMatrix("A", "L")!;
    const long = buildQrMatrix("A".repeat(200), "L")!;
    expect(long.moduleCount).toBeGreaterThan(short.moduleCount);
  });

  it("returns no matrix for empty content instead of throwing", () => {
    expect(buildQrMatrix("", "M")).toBeNull();
    expect(buildQrMatrix(undefined as unknown as string, "M")).toBeNull();
  });

  it("renders an SVG path made of numbers only, inside the requested box", () => {
    const matrix = buildQrMatrix("R-1", "M")!;
    const path = qrSvgPath(matrix, 200);

    expect(path.startsWith("M")).toBe(true);
    expect(path).toMatch(/^[MmHhVvZz0-9.\- ]+$/);
    expect(qrSvgPath(matrix, 0)).toBe("");
    expect(path).not.toBe(qrSvgPath(matrix, 400));
  });

  it("leaves the specification quiet zone around the symbol", () => {
    const matrix = buildQrMatrix("R-1", "M")!;
    const cell = 200 / (matrix.moduleCount + QR_QUIET_ZONE_MODULES * 2);
    const firstCommand = qrSvgPath(matrix, 200).split("z")[0]!;
    const x = Number(/^M([0-9.]+)/.exec(firstCommand)![1]);

    expect(x).toBeCloseTo(QR_QUIET_ZONE_MODULES * cell, 0);
  });
});

describe("Code 128 barcode service", () => {
  it("keeps a structurally valid symbol table", () => {
    expect(CODE128_PATTERNS).toHaveLength(107);
    expect(new Set(CODE128_PATTERNS).size).toBe(107);

    for (let value = 0; value < CODE128_STOP; value += 1) {
      const widths = [...CODE128_PATTERNS[value]!].map(Number);
      expect(widths).toHaveLength(6);
      expect(widths.reduce((total, width) => total + width, 0)).toBe(11);
    }
    expect([...CODE128_PATTERNS[CODE128_STOP]!].map(Number).reduce((total, width) => total + width, 0)).toBe(13);
  });

  it("computes the modulo-103 check character", () => {
    expect(code128Checksum([CODE128_START_B])).toBe(CODE128_START_B % CODE128_CHECKSUM_MODULO);
    // START B (104) + 'A' (33) * 1 = 137 -> 34
    expect(code128Checksum([104, 33])).toBe(34);
  });

  it("encodes a value as start, data, checksum and stop", () => {
    const encoding = encodeCode128B("A")!;

    expect(encoding.value).toBe("A");
    expect(encoding.pattern).toBe(
      CODE128_PATTERNS[CODE128_START_B] + CODE128_PATTERNS[33] + CODE128_PATTERNS[34] + CODE128_PATTERNS[CODE128_STOP],
    );
    // 11 modules for start, one data symbol and the check character, plus the 13-module stop.
    expect(encoding.moduleCount).toBe(11 * 3 + 13);
    expect(encoding.modules).toHaveLength(encoding.moduleCount);
    expect(encoding.modules[0]).toBe(true);
  });

  it("starts and ends the symbol with a bar", () => {
    const encoding = encodeCode128B("R-250904-00125")!;
    expect(encoding.modules[0]).toBe(true);
    expect(encoding.modules[encoding.moduleCount - 1]).toBe(true);
  });

  it("rejects content that would scan as different data", () => {
    expect(isCode128Encodable("R-1")).toBe(true);
    expect(isCode128Encodable("انگشتر")).toBe(false);
    expect(encodeCode128B("انگشتر")).toBeNull();
    expect(encodeCode128B("")).toBeNull();
  });

  it("renders bars that fill the requested box", () => {
    const encoding = encodeCode128B("R-250904-00125")!;
    const path = barcodeSvgPath(encoding, 300, 60);

    expect(path.startsWith("M")).toBe(true);
    expect(path).toMatch(/^[MmHhVvZz0-9.\- ]+$/);
    expect(barcodeSvgPath(encoding, 0, 60)).toBe("");
    expect(path).toContain("v60");
  });
});
