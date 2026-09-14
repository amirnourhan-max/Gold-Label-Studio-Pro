import { isTauriEnvironment } from "../hardware/hardware-environment";
import type { SerialPortProvider } from "../hardware/serial-port";
import { TauriSerialPortProvider } from "../hardware/tauri-serial-port";
import { KeyboardWedgeScanner } from "./keyboard-wedge-scanner";
import { DeviceScannerService } from "./scanner-service";
import { SerialScannerAdapter } from "./serial-scanner";

export type ScannerConnectionConfig = Readonly<{
  /** Persisted "port" value: "USB HID" (kernel wedge) or a COM port. */
  port: string;
  baudRate?: number;
}>;

export type ScannerServiceFactory = Readonly<{
  forConfig(config: ScannerConnectionConfig): Promise<DeviceScannerService>;
  isAvailable(config: ScannerConnectionConfig): boolean;
}>;

export const isSerialScannerPort = (port: string): boolean => /^COM\d+$/i.test(port.trim());

/**
 * Chooses the scanner transport from the persisted settings: a keyboard-wedge
 * scanner when the port is a USB HID device, a serial scanner when a COM port
 * is configured. Serial is only reachable inside the desktop shell.
 */
export const createDefaultScannerFactory = (options: {
  portProvider?: () => SerialPortProvider;
  target?: EventTarget;
} = {}): ScannerServiceFactory => ({
  async forConfig(config: ScannerConnectionConfig): Promise<DeviceScannerService> {
    if (isSerialScannerPort(config.port)) {
      const provider = (options.portProvider ?? (() => new TauriSerialPortProvider()))();
      const port = await provider.open(config.port, config.baudRate ?? 9600);
      return new DeviceScannerService(new SerialScannerAdapter(port));
    }
    return new DeviceScannerService(new KeyboardWedgeScanner({ target: options.target }));
  },
  isAvailable: (config: ScannerConnectionConfig): boolean =>
    !isSerialScannerPort(config.port) || isTauriEnvironment(),
});