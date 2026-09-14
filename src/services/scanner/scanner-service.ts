import type { ScanPayload, ScannerSource, ScannerState, ScannerTestResult } from "./scanner-contract";

/**
 * Device-agnostic scanner orchestration. The UI talks to this service; the
 * adapter underneath decides whether scans arrive from a keyboard wedge or a
 * serial frame stream.
 */
export class DeviceScannerService {
  private currentState: ScannerState = "idle";

  constructor(private readonly source: ScannerSource) {}

  get state(): ScannerState {
    return this.currentState;
  }

  async start(onScan: (payload: ScanPayload) => void): Promise<void> {
    try {
      await this.source.start(onScan);
      this.currentState = "scanning";
    } catch (error) {
      this.currentState = "error";
      throw new Error(`راه‌اندازی اسکنر ناموفق بود (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  async stop(): Promise<void> {
    try {
      await this.source.stop();
    } finally {
      this.currentState = "idle";
    }
  }

  async test(): Promise<ScannerTestResult> {
    try {
      const result = await this.source.test();
      if (!result.ok) this.currentState = "error";
      return result;
    } catch (error) {
      this.currentState = "error";
      return { ok: false, message: error instanceof Error ? error.message : "آزمایش اسکنر ناموفق بود" };
    }
  }
}