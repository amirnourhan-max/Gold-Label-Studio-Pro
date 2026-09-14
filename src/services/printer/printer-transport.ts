import { invoke } from "@tauri-apps/api/core";
import { isTauriEnvironment } from "../hardware/hardware-environment";

export interface PrinterTransport {
  /** Sends already-rendered device commands to the named Windows printer. */
  print(printerName: string, payload: string): Promise<void>;
}

/** Raw (pass-through) printing through the Rust `print_raw` command. */
export class TauriRawPrinterTransport implements PrinterTransport {
  async print(printerName: string, payload: string): Promise<void> {
    await invoke<void>("print_raw", { printer: printerName, payload });
  }
}

/** Test double that records every job instead of touching hardware. */
export class RecordingPrinterTransport implements PrinterTransport {
  readonly jobs: Array<{ printerName: string; payload: string }> = [];

  async print(printerName: string, payload: string): Promise<void> {
    this.jobs.push({ printerName, payload });
  }
}

/**
 * Preview fallback: there is no raw print transport outside the desktop shell,
 * so the service reports a truthful failure instead of pretending to print.
 */
export class UnavailablePrinterTransport implements PrinterTransport {
  async print(): Promise<void> {
    throw new Error("چاپ فقط در نسخه دسکتاپ در دسترس است (پیش‌نمایش مرورگر پشتیبانی نمی‌شود)");
  }
}

export const createDefaultPrinterTransport = (): PrinterTransport =>
  isTauriEnvironment() ? new TauriRawPrinterTransport() : new UnavailablePrinterTransport();