import type { SerialPortHandle } from "../hardware/serial-port";
import type { ScaleAdapter, ScaleReading, ScaleReadout } from "./scale-contract";

/**
 * Parses one A&D continuous-output frame.
 *
 * Supported shapes (the behaviour ported from the GoldBar scale driver):
 *   - "ST,GS,+0004.385 kg" / "US,GS,+0004.385 kg"  (status prefix, kg or g)
 *   - "  4.385 g" / "+12.345"                       (bare mass output)
 *   - "OL" / "OVER" / "ERR..." → overload/error, not a mass
 *
 * Frames with a stable prefix "ST" (or no prefix at all) are reported as
 * stable by the device; the service additionally confirms stability with
 * repeated equal readings. Returns null when the frame is not a valid mass.
 */
export const parseAandGFrame = (
  frame: string,
): Readonly<{ grams: number; unit: "g" | "kg"; stable: boolean }> | null => {
  const normalized = frame.trim();
  if (normalized.length === 0) return null;
  if (/^(OL|OVER|UNDER|ERR)/i.test(normalized)) return null;

  const massMatch = /([+-]?\d+\.\d{2,3})(?:\s*(kg|g))?\b/i.exec(normalized);
  if (!massMatch) return null;

  const unit = (massMatch[2]?.toLowerCase() ?? "g") as "g" | "kg";
  const grams = unit === "kg" ? Number(massMatch[1]) * 1000 : Number(massMatch[1]);
  if (!Number.isFinite(grams) || grams < 0) return null;

  const prefix = normalized.slice(0, massMatch.index).trim();
  const stable = prefix === "" || /^ST[,\s]?/.test(prefix);

  return { grams, unit, stable };
};

export type AandScaleAdapterOptions = Readonly<{
  /** Maximum buffered bytes before the buffer is dropped (runaway frames). */
  maxBufferBytes?: number;
  lineEnding?: string;
}>;

/**
 * Streams serial bytes from an A&D scale, splits them into frames on the
 * device line ending, and reports the latest complete frame. Calling readout()
 * only consumes data that arrived since the previous call.
 */
export class AandScaleAdapter implements ScaleAdapter {
  private buffer = "";
  private lastReadout: ScaleReadout | null = null;

  constructor(
    private readonly port: SerialPortHandle,
    private readonly options: AandScaleAdapterOptions = {},
  ) {}

  async connect(): Promise<void> {
    this.buffer = "";
    this.lastReadout = null;
  }

  async disconnect(): Promise<void> {
    this.buffer = "";
    await this.port.close();
  }

  async readout(): Promise<ScaleReadout | null> {
    const chunk = await this.port.read();
    if (chunk.length === 0) return null;

    const lineEnding = this.options.lineEnding ?? "\r\n";
    const maxBufferBytes = this.options.maxBufferBytes ?? 512;
    this.buffer += chunk;
    if (this.buffer.length > maxBufferBytes) {
      this.buffer = this.buffer.slice(-maxBufferBytes);
    }

    if (!this.buffer.includes(lineEnding)) return null;

    const rawLines = this.buffer.split(lineEnding);
    this.buffer = rawLines.pop() ?? "";
    const rawFrame = rawLines[rawLines.length - 1]?.trim() ?? "";

    const parsed = rawFrame.length > 0 ? parseAandGFrame(rawFrame) : null;
    this.lastReadout = {
      weight: parsed ? ({ grams: parsed.grams, rawFrame, unit: parsed.unit } satisfies ScaleReading) : null,
      stable: parsed?.stable ?? false,
      rawFrame,
    };
    return this.lastReadout;
  }
}