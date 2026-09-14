import type {
  ScaleAdapter,
  ScaleProbeResult,
  ScaleService,
  ScaleServiceConfig,
  ScaleTestResult,
} from "./scale-contract";
import { defaultScaleServiceConfig } from "./scale-contract";

/**
 * GoldBar-style stable-weight detection: the weight is stable once the same
 * value (to milligram precision) was observed `settleReadings` times in a row.
 * Any different frame resets the streak; overload/invalid frames count as
 * device frames but never produce a stable result.
 */
export class SerialScaleService implements ScaleService {
  private currentState: ScaleService["state"] = "disconnected";

  constructor(
    private readonly adapter: ScaleAdapter,
    private readonly config: ScaleServiceConfig = defaultScaleServiceConfig,
  ) {}

  get state(): ScaleService["state"] {
    return this.currentState;
  }

  async connect(): Promise<void> {
    this.currentState = "connecting";
    try {
      await this.adapter.connect();
      this.currentState = "connected";
    } catch (error) {
      this.currentState = "error";
      throw new Error(`اتصال به ترازو برقرار نشد (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.adapter.disconnect();
    } finally {
      this.currentState = "disconnected";
    }
  }

  async probeStableWeight(): Promise<ScaleProbeResult> {
    if (this.currentState !== "connected") {
      try {
        await this.connect();
      } catch (error) {
        return { ok: false, reason: "error", message: error instanceof Error ? error.message : String(error) };
      }
    }

    const deadline = this.config.now() + this.config.readTimeoutMs;
    let streak = 0;
    let lastGrams: number | null = null;
    let frames = 0;
    let reconnectAttemptsLeft = this.config.reconnectAttempts;

    while (this.config.now() < deadline) {
      let readout;
      try {
        readout = await this.adapter.readout();
      } catch (error) {
        this.currentState = "error";
        if (reconnectAttemptsLeft > 0) {
          reconnectAttemptsLeft -= 1;
          await this.config.wait(this.config.reconnectDelayMs);
          try {
            await this.adapter.connect();
            this.currentState = "connected";
          } catch {
            this.currentState = "error";
            return {
              ok: false,
              reason: "disconnected",
              message: "اتصال ترازو قطع شد و بازیابی ناموفق بود",
            };
          }
          continue;
        }
        return {
          ok: false,
          reason: "disconnected",
          message: error instanceof Error ? error.message : "اتصال ترازو قطع شد",
        };
      }

      if (readout !== null) {
        frames += 1;
        if (readout.weight === null) {
          streak = 0;
          lastGrams = null;
        } else {
          if (lastGrams === readout.weight.grams) {
            streak += 1;
          } else {
            streak = 1;
            lastGrams = readout.weight.grams;
          }

          if (streak >= this.config.settleReadings) {
            return { ok: true, grams: readout.weight.grams, frames };
          }
        }
      }

      await this.config.wait(this.config.pollIntervalMs);
    }

    return {
      ok: false,
      reason: "timeout",
      message: "وزن ترازو پایدار نشد (زمان انتظار به پایان رسید)",
    };
  }

  async testConnection(): Promise<ScaleTestResult> {
    try {
      await this.connect();
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "اتصال به ترازو ناموفق بود" };
    }
    try {
      const probe = await this.probeStableWeight();
      if (probe.ok) {
        return { ok: true, grams: probe.grams, message: "اتصال ترازو برقرار است" };
      }
      return { ok: false, message: probe.message };
    } finally {
      await this.disconnect();
    }
  }
}