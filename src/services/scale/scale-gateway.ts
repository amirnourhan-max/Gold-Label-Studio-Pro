import { isTauriEnvironment } from "../hardware/hardware-environment";
import type { SerialPortProvider } from "../hardware/serial-port";
import { TauriSerialPortProvider } from "../hardware/tauri-serial-port";
import { AandScaleAdapter } from "./aand-scale-adapter";
import type { ScaleAdapter, ScaleService, ScaleServiceConfig } from "./scale-contract";
import { defaultScaleServiceConfig } from "./scale-contract";
import { SerialScaleService } from "./scale-service";

export type ScaleConnectionConfig = Readonly<{
  port: string;
  baudRate: number;
}>;

export type ScaleServiceFactory = Readonly<{
  createService(config: ScaleConnectionConfig): Promise<ScaleService>;
  createAdapter(config: ScaleConnectionConfig): Promise<ScaleAdapter>;
}>;

const defaultPortProvider = (): SerialPortProvider => new TauriSerialPortProvider();

/**
 * Wires the persisted scale settings (COM port + baud) to the A&D adapter.
 * The transport is the Tauri serial command surface; on non-Tauri
 * environments any probe surfaces a truthful connection error instead of a
 * fake success.
 */
export const createDefaultScaleFactory = (options: {
  portProvider?: () => SerialPortProvider;
  serviceConfig?: ScaleServiceConfig;
} = {}): ScaleServiceFactory => {
  const portProvider = options.portProvider ?? defaultPortProvider;
  const serviceConfig = options.serviceConfig ?? defaultScaleServiceConfig;

  return {
    async createAdapter(config: ScaleConnectionConfig): Promise<ScaleAdapter> {
      if (!isTauriEnvironment()) {
        // Deterministic refusal: preview has no serial transport.
        return new RefusingScaleAdapter("ترازو در پیش‌نمایش در دسترس نیست (دسکتاپ مورد نیاز است)");
      }
      const provider = portProvider();
      const port = await provider.open(config.port, config.baudRate);
      // The adapter reopens the port itself on reconnect, so a dropped device
      // recovers on a live session instead of retrying a dead handle.
      return new AandScaleAdapter(port, { reopen: () => provider.open(config.port, config.baudRate) });
    },
    async createService(config: ScaleConnectionConfig): Promise<ScaleService> {
      return new SerialScaleService(await this.createAdapter(config), serviceConfig);
    },
  };
};

class RefusingScaleAdapter implements ScaleAdapter {
  constructor(private readonly message: string) {}

  async connect(): Promise<void> {
    throw new Error(this.message);
  }

  async disconnect(): Promise<void> {}

  async readout() {
    return null;
  }
}