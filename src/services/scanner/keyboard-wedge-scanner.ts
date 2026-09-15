import type { ScanPayload, ScannerSource, ScannerTestResult } from "./scanner-contract";

export type KeyboardWedgeOptions = Readonly<{
  /** Event target the wedge listens on (window in the app, injected in tests). */
  target?: EventTarget;
  /** Key that terminates a scanned code. */
  terminator?: "Enter" | "Tab";
  /** Codes shorter than this are ignored (stray keystrokes). */
  minLength?: number;
  /** Gap in milliseconds after which the buffer is treated as human typing. */
  maxGapMs?: number;
  now?: () => number;
  timestamp?: () => string;
  /** How long the Settings test action waits for a real scanned code. */
  testTimeoutMs?: number;
}>;

/** `test()` has to see an actual scan, so it waits for one instead of guessing. */
export const DEFAULT_SCANNER_TEST_TIMEOUT_MS = 5_000;

/**
 * Keyboard-wedge support: hardware scanners type the code and press a
 * terminator key. The buffer resets on a slow gap so a human typing does not
 * produce phantom scans.
 */
export class KeyboardWedgeScanner implements ScannerSource {
  private readonly target: EventTarget;
  private readonly terminator: string;
  private readonly minLength: number;
  private readonly maxGapMs: number;
  private readonly now: () => number;
  private readonly timestamp: () => string;
  private readonly testTimeoutMs: number;

  private buffer = "";
  private lastKeyAt = 0;
  private listening = false;
  private onScan: ((payload: ScanPayload) => void) | null = null;
  private settleTest: ((result: ScannerTestResult) => void) | null = null;
  private testTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: KeyboardWedgeOptions = {}) {
    this.target = options.target ?? (typeof window === "undefined" ? new EventTarget() : window);
    this.terminator = options.terminator ?? "Enter";
    this.minLength = options.minLength ?? 3;
    this.maxGapMs = options.maxGapMs ?? 120;
    this.now = options.now ?? (() => Date.now());
    this.timestamp = options.timestamp ?? (() => new Date().toISOString());
    this.testTimeoutMs = options.testTimeoutMs ?? DEFAULT_SCANNER_TEST_TIMEOUT_MS;
  }

  private readonly handleKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    const at = this.now();
    if (at - this.lastKeyAt > this.maxGapMs) this.buffer = "";
    this.lastKeyAt = at;

    if (keyboardEvent.key === this.terminator) {
      const raw = this.buffer;
      this.buffer = "";
      if (raw.length >= this.minLength) {
        this.onScan?.({ code: raw.trim(), raw, scannedAt: this.timestamp() });
      }
      return;
    }

    if (keyboardEvent.key.length === 1) this.buffer += keyboardEvent.key;
  };

  async start(onScan: (payload: ScanPayload) => void): Promise<void> {
    this.onScan = onScan;
    this.buffer = "";
    if (!this.listening) {
      this.target.addEventListener("keydown", this.handleKeyDown);
      this.listening = true;
    }
  }

  async stop(): Promise<void> {
    this.clearTestTimer();
    if (this.listening) {
      this.target.removeEventListener("keydown", this.handleKeyDown);
      this.listening = false;
    }
    this.onScan = null;
    this.buffer = "";
  }

  /**
   * A keyboard-wedge scanner has no connection to probe: it *is* the keyboard.
   * The only honest test is to listen and wait for a real code, so this resolves
   * with the scanned code or reports that nothing arrived before the timeout.
   */
  async test(): Promise<ScannerTestResult> {
    if (this.settleTest !== null) {
      return { ok: false, message: "آزمایش اسکنر در حال اجراست" };
    }

    const result = new Promise<ScannerTestResult>(resolve => {
      this.settleTest = resolve;
      this.testTimer = setTimeout(() => {
        this.finishTest({
          ok: false,
          message: `کدی در مدت ${Math.round(this.testTimeoutMs / 1000)} ثانیه اسکن نشد`,
        });
      }, this.testTimeoutMs);
    });

    await this.start(payload => this.finishTest({ ok: true, message: `کد اسکن شد: ${payload.code}` }));
    return result;
  }

  private finishTest(result: ScannerTestResult): void {
    const resolve = this.settleTest;
    if (resolve === null) return;
    this.settleTest = null;
    this.clearTestTimer();
    void this.stop().then(() => resolve(result));
  }

  private clearTestTimer(): void {
    if (this.testTimer !== null) {
      clearTimeout(this.testTimer);
      this.testTimer = null;
    }
  }

  get isListening(): boolean {
    return this.listening;
  }
}
