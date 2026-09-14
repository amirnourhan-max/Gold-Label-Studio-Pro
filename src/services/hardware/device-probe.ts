import { createDefaultPrinterTransport, type PrinterTransport } from "../printer/printer-transport";
import type { PrinterFormat } from "../printer/printer-service";
import { inferPrinterFormat } from "../printer/printer-service";
import { renderTsplTestLabel } from "../printer/tspl-renderer";
import { renderZplTestLabel } from "../printer/zpl-renderer";
import { createDefaultScaleFactory, type ScaleServiceFactory } from "../scale/scale-gateway";
import { createDefaultScannerFactory, type ScannerServiceFactory } from "../scanner/scanner-gateway";

export type DeviceProbeKind = "scale" | "printer" | "scanner";

export type DeviceProbeOutcome = Readonly<{ ok: boolean; message: string }>;

export type DeviceProbeConfig = Readonly<{
  printerName: string;
  scalePort: string;
  scaleBaudRate: number;
  scannerPort: string;
  scannerBaudRate: number;
}>;

export type DeviceProbeDependencies = Readonly<{
  scaleFactory?: ScaleServiceFactory;
  scannerFactory?: ScannerServiceFactory;
  printerTransport?: PrinterTransport;
}>;

export interface DeviceProbeService {
  probe(kind: DeviceProbeKind, config: DeviceProbeConfig): Promise<DeviceProbeOutcome>;
}

const failure = (error: unknown, fallback: string): DeviceProbeOutcome => ({
  ok: false,
  message: error instanceof Error && error.message.length > 0 ? error.message : fallback,
});

/**
 * Runs the Settings device test actions through the real hardware services.
 * Every probe reports a truthful failure when the desktop transport is
 * unavailable instead of simulating a successful connection.
 */
export const createDeviceProbeService = (
  dependencies: DeviceProbeDependencies = {},
): DeviceProbeService => {
  const scaleFactory = dependencies.scaleFactory ?? createDefaultScaleFactory();
  const scannerFactory = dependencies.scannerFactory ?? createDefaultScannerFactory();
  const transport = dependencies.printerTransport ?? createDefaultPrinterTransport();

  const probePrinter = async (printerName: string): Promise<DeviceProbeOutcome> => {
    try {
      const format: PrinterFormat = inferPrinterFormat(printerName);
      const payload = format === "tspl"
        ? renderTsplTestLabel({ printerName })
        : renderZplTestLabel({ printerName });
      await transport.print(printerName, payload);
      return { ok: true, message: `دستور تست (${format.toUpperCase()}) به ${printerName} ارسال شد` };
    } catch (error) {
      return failure(error, "ارسال دستور تست به پرینتر ناموفق بود");
    }
  };

  const probeScale = async (config: DeviceProbeConfig): Promise<DeviceProbeOutcome> => {
    try {
      const service = await scaleFactory.createService({
        port: config.scalePort,
        baudRate: config.scaleBaudRate,
      });
      const result = await service.testConnection();
      return result.ok
        ? { ok: true, message: `ترازو پاسخ داد${result.grams === null ? "" : ` (${result.grams} گرم)`}` }
        : { ok: false, message: result.message };
    } catch (error) {
      return failure(error, "اتصال به ترازو ناموفق بود");
    }
  };

  const probeScanner = async (config: DeviceProbeConfig): Promise<DeviceProbeOutcome> => {
    if (!scannerFactory.isAvailable({ port: config.scannerPort })) {
      return { ok: false, message: "اسکنر سریال فقط در نسخه دسکتاپ در دسترس است" };
    }
    try {
      const service = await scannerFactory.forConfig({
        port: config.scannerPort,
        baudRate: config.scannerBaudRate,
      });
      const result = await service.test();
      return { ok: result.ok, message: result.message };
    } catch (error) {
      return failure(error, "آزمایش اسکنر ناموفق بود");
    }
  };

  return {
    async probe(kind: DeviceProbeKind, config: DeviceProbeConfig): Promise<DeviceProbeOutcome> {
      if (kind === "printer") return probePrinter(config.printerName);
      if (kind === "scale") return probeScale(config);
      return probeScanner(config);
    },
  };
};
