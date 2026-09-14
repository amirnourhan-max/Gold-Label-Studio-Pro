/** A decoded weight reading in grams together with its raw device frame. */
export type ScaleReading = Readonly<{
  grams: number;
  rawFrame: string;
  unit: "g" | "kg";
}>;

/**
 * One decoded readout from the scale. `weight` is null for frames the scale
 * sent but that could not be interpreted as a mass (overload, garbage),
 * which resets stability tracking but does not disconnect the device.
 */
export type ScaleReadout = Readonly<{
  weight: ScaleReading | null;
  stable: boolean;
  rawFrame: string;
}>;

export type ScaleConnectionState = "disconnected" | "connecting" | "connected" | "error";

/**
 * Device-facing scale boundary. Adapters know the scale protocol; the service
 * owns connection lifecycle, stable-weight detection, timeouts and reconnects.
 * readout() returns null when the adapter has no new frame to report.
 */
export interface ScaleAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  readout(): Promise<ScaleReadout | null>;
}

export type ScaleProbeReason = "timeout" | "disconnected" | "error";

export type ScaleProbeResult =
  | Readonly<{ ok: true; grams: number; frames: number }>
  | Readonly<{ ok: false; reason: ScaleProbeReason; message: string }>;

export type ScaleTestResult =
  | Readonly<{ ok: true; grams: number | null; message: string }>
  | Readonly<{ ok: false; message: string }>;

export interface ScaleService {
  readonly state: ScaleConnectionState;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Reads until the weight settles or the timeout expires. */
  probeStableWeight(): Promise<ScaleProbeResult>;
  /** One-shot connection + probe used by the Settings test action. */
  testConnection(): Promise<ScaleTestResult>;
}

export type ScaleServiceConfig = Readonly<{
  /** Consecutive equal readings required to declare the weight stable. */
  settleReadings: number;
  /** Overall deadline for probeStableWeight in milliseconds. */
  readTimeoutMs: number;
  /** How many times a dropped connection is reopened during one probe. */
  reconnectAttempts: number;
  /** Pause before each reconnect attempt in milliseconds. */
  reconnectDelayMs: number;
  /** Poll interval between serial reads in milliseconds. */
  pollIntervalMs: number;
  /** Injectable clock for deterministic tests. */
  now: () => number;
  /** Injectable wait for deterministic tests. */
  wait: (ms: number) => Promise<void>;
}>;

export const defaultScaleServiceConfig: ScaleServiceConfig = {
  settleReadings: 3,
  readTimeoutMs: 10_000,
  reconnectAttempts: 2,
  reconnectDelayMs: 400,
  pollIntervalMs: 50,
  now: () => Date.now(),
  wait: ms => new Promise(resolve => setTimeout(resolve, ms)),
};