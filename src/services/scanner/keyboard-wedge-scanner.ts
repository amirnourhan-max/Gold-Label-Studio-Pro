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
}>;

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

  private buffer = "";
  private lastKeyAt = 0;
  private listening = false;
  private onScan: ((payload: ScanPayload) => void) | null = null;

  constructor(options: KeyboardWedgeOptions = {}) {
    this.target = options.target ?? (typeof window === "undefined" ? new EventTarget() : window);
    this.terminator = options.terminator ?? "Enter";
    this.minLength = options.minLength ?? 3;
    this.maxGapMs = options.maxGapMs ?? 120;
    this.now = options.now ?? (() => Date.now());
    this.timestamp = options.timestamp ?? (() => new Date().toISOString());
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
    if (this.listening) {
      this.target.removeEventListener("keydown", this.handleKeyDown);
      this.listening = false;
    }
    this.onScan = null;
    this.buffer = "";
  }

  async test(): Promise<ScannerTestResult> {
    return {
      ok: this.listening,
      message: this.listening ? "اسکنر کیبوردی فعال است" : "اسکنر کیبوردی فعال نیست",
    };
  }

  get isListening(): boolean {
    return this.listening;
  }
}