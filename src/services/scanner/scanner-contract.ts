/** One decoded scan coming from any scanner source. */
export type ScanPayload = Readonly<{
  code: string;
  raw: string;
  scannedAt: string;
}>;

export type ScannerTestResult = Readonly<{ ok: boolean; message: string }>;

/**
 * Push-based scanner source. Keyboard-wedge scanners emit on key events;
 * serial scanners emit when a complete frame arrives on the serial port.
 */
export interface ScannerSource {
  start(onScan: (payload: ScanPayload) => void): Promise<void>;
  stop(): Promise<void>;
  test(): Promise<ScannerTestResult>;
}

export type ScannerState = "idle" | "scanning" | "error";