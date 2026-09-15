import type { SerialPortHandle } from "../hardware/serial-port";
import type { ScanPayload, ScannerSource, ScannerTestResult } from "./scanner-contract";

export type Scheduler = (task: () => void, intervalMs: number) => () => void;

const defaultScheduler: Scheduler = (task, intervalMs) => {
  const timer = setInterval(task, intervalMs);
  return () => clearInterval(timer);
};

export type SerialScannerOptions = Readonly<{
  lineEnding?: string;
  pollIntervalMs?: number;
  minLength?: number;
  scheduler?: Scheduler;
  timestamp?: () => string;
  /** Maximum buffered bytes before the buffer is trimmed (runaway frames). */
  maxBufferBytes?: number;
}>;

/**
 * Serial scanner support (COM-port scanners that stream the code followed by a
 * CR/LF). Reads are polled on an interval; every complete frame is emitted.
 * Tests inject a manual scheduler and call the returned tick to stay
 * deterministic.
 */
export class SerialScannerAdapter implements ScannerSource {
  private readonly lineEnding: string;
  private readonly pollIntervalMs: number;
  private readonly minLength: number;
  private readonly scheduler: Scheduler;
  private readonly timestamp: () => string;
  private readonly maxBufferBytes: number;

  private buffer = "";
  private onScan: ((payload: ScanPayload) => void) | null = null;
  private cancelTick: (() => void) | null = null;

  constructor(private readonly port: SerialPortHandle, options: SerialScannerOptions = {}) {
    this.lineEnding = options.lineEnding ?? "\r\n";
    this.pollIntervalMs = options.pollIntervalMs ?? 150;
    this.minLength = options.minLength ?? 3;
    this.scheduler = options.scheduler ?? defaultScheduler;
    this.timestamp = options.timestamp ?? (() => new Date().toISOString());
    this.maxBufferBytes = options.maxBufferBytes ?? 512;
  }

  get isScanning(): boolean {
    return this.cancelTick !== null;
  }

  /** Reads whatever the port has buffered and emits every complete frame. */
  async drain(): Promise<readonly ScanPayload[]> {
    if (this.onScan === null) return [];

    const chunk = await this.port.read();
    if (chunk.length === 0) return [];
    this.buffer += chunk;

    const parts = this.buffer.split(this.lineEnding);
    this.buffer = parts.pop() ?? "";
    // Complete frames in the chunk are already emitted above; only an oversized
    // *partial* frame is dropped, so a device that never sends the line ending
    // cannot grow the buffer without bound or corrupt the next code.
    if (this.buffer.length > this.maxBufferBytes) this.buffer = "";

    const emitted: ScanPayload[] = [];
    for (const part of parts) {
      const raw = part.trim();
      if (raw.length < this.minLength) continue;
      const payload: ScanPayload = { code: raw, raw, scannedAt: this.timestamp() };
      emitted.push(payload);
      this.onScan(payload);
    }
    return emitted;
  }

  async start(onScan: (payload: ScanPayload) => void): Promise<void> {
    this.onScan = onScan;
    this.buffer = "";
    this.cancelTick?.();
    this.cancelTick = this.scheduler(() => {
      void this.drain().catch(() => {
        // A read failure keeps the scanner idle until the next successful poll.
      });
    }, this.pollIntervalMs);
  }

  async stop(): Promise<void> {
    this.cancelTick?.();
    this.cancelTick = null;
    this.onScan = null;
    this.buffer = "";
    await this.port.close();
  }

  async test(): Promise<ScannerTestResult> {
    try {
      await this.port.write("\r\n");
      return { ok: true, message: "پورت اسکنر باز شد" };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "پورت اسکنر پاسخ نداد" };
    }
  }
}