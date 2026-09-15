import { formatWeightMg } from "../database/weight";
import { createDefaultSettingsGateway } from "../settings/settings-gateway";
import type { SettingsGateway } from "../settings/settings-contract";
import { createDefaultScaleFactory, type ScaleServiceFactory } from "./scale-gateway";

/** A settled scale reading converted to the exact milligram form the app stores. */
export type StableWeightOutcome =
  | Readonly<{ ok: true; grams: number; gramsText: string; milligrams: number }>
  | Readonly<{ ok: false; message: string }>;

/**
 * Application-facing scale boundary. React asks for a stable weight; the COM
 * port, baud rate, A&D frame parsing, settling, reconnect and disconnect all
 * stay behind this interface.
 */
export interface ScaleWorkflow {
  /** Reads a stable weight using the persisted scale settings. */
  readStableWeight(): Promise<StableWeightOutcome>;
}

export type ScaleWorkflowDependencies = Readonly<{
  settingsGateway?: SettingsGateway;
  scaleFactory?: ScaleServiceFactory;
}>;

const messageFor = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;

export const createScaleWorkflow = (dependencies: ScaleWorkflowDependencies = {}): ScaleWorkflow => {
  const factory = dependencies.scaleFactory ?? createDefaultScaleFactory();
  const settingsGateway = (): SettingsGateway | Promise<SettingsGateway> =>
    dependencies.settingsGateway ?? createDefaultSettingsGateway();

  return {
    async readStableWeight(): Promise<StableWeightOutcome> {
      try {
        const settings = await settingsGateway();
        const loaded = await settings.loadSettings();
        const port = loaded.scale.port.trim();
        if (port.length === 0) {
          return { ok: false, message: "پورت ترازو در تنظیمات انتخاب نشده است" };
        }

        const baudRate = Number.parseInt(loaded.scale.baudRate, 10);
        const service = await factory.createService({
          port,
          baudRate: Number.isFinite(baudRate) && baudRate > 0 ? baudRate : 9600,
        });

        // testConnection() connects, waits for a settled reading and disconnects
        // again, so a probe never leaves the port open.
        const result = await service.testConnection();
        if (!result.ok) {
          return { ok: false, message: result.message };
        }
        if (result.grams === null) {
          return { ok: false, message: "ترازو وزن پایداری ارسال نکرد" };
        }

        // Weights are stored as integer milligrams: 4.385 g -> 4385 mg.
        const milligrams = Math.round(result.grams * 1000);
        return { ok: true, grams: result.grams, gramsText: formatWeightMg(milligrams), milligrams };
      } catch (error) {
        return { ok: false, message: messageFor(error, "خواندن وزن از ترازو ناموفق بود") };
      }
    },
  };
};

export const scaleWorkflow: ScaleWorkflow = createScaleWorkflow();
