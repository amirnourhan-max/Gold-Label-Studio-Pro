import { describe, expect, it, vi } from "vitest";
import { createDeviceProbeService, type DeviceProbeConfig } from "./device-probe";
import type { ScaleServiceFactory } from "../scale/scale-gateway";
import type { ScannerServiceFactory } from "../scanner/scanner-gateway";
import type { DeviceScannerService } from "../scanner/scanner-service";
import type { PrinterTransport } from "../printer/printer-transport";

const config: DeviceProbeConfig = {
  printerName: "Zebra ZD220",
  scalePort: "COM3",
  scaleBaudRate: 9600,
  scannerPort: "USB HID",
  scannerBaudRate: 9600,
};

describe("device probe service", () => {
  it("reports a stable scale weight from a responsive scale", async () => {
    const factory: ScaleServiceFactory = {
      createAdapter: vi.fn(),
      createService: vi.fn(async () => ({
        state: "connected" as const,
        connect: vi.fn(),
        disconnect: vi.fn(),
        probeStableWeight: vi.fn(),
        testConnection: vi.fn(async () => ({ ok: true as const, grams: 8.34, message: "اتصال ترازو برقرار است" })),
      })),
    };

    const outcome = await createDeviceProbeService({ scaleFactory: factory }).probe("scale", config);

    expect(outcome.ok).toBe(true);
    expect(outcome.message).toContain("8.34");
  });

  it("surfaces a scale failure instead of a fake success", async () => {
    const factory: ScaleServiceFactory = {
      createAdapter: vi.fn(),
      createService: vi.fn(async () => ({
        state: "error" as const,
        connect: vi.fn(),
        disconnect: vi.fn(),
        probeStableWeight: vi.fn(),
        testConnection: vi.fn(async () => ({ ok: false as const, message: "پورت COM3 پیدا نشد" })),
      })),
    };

    const outcome = await createDeviceProbeService({ scaleFactory: factory }).probe("scale", config);

    expect(outcome).toMatchObject({ ok: false, message: "پورت COM3 پیدا نشد" });
  });

  it("sends a ZPL test label for a Zebra printer", async () => {
    const jobs: Array<{ printerName: string; payload: string }> = [];
    const transport: PrinterTransport = {
      print: async (printerName, payload) => {
        jobs.push({ printerName, payload });
      },
    };

    const outcome = await createDeviceProbeService({ printerTransport: transport }).probe("printer", config);

    expect(outcome.ok).toBe(true);
    expect(jobs[0]?.printerName).toBe("Zebra ZD220");
    expect(jobs[0]?.payload).toContain("^XA");
    expect(outcome.message).toContain("ZPL");
  });

  it("sends a TSPL test label for a TSC printer", async () => {
    const jobs: string[] = [];
    const transport: PrinterTransport = {
      print: async (_printerName, payload) => {
        jobs.push(payload);
      },
    };

    const outcome = await createDeviceProbeService({ printerTransport: transport }).probe("printer", {
      ...config,
      printerName: "TSC TE200",
    });

    expect(outcome.message).toContain("TSPL");
    expect(jobs[0]).toContain("SIZE 50 mm,30 mm");
  });

  it("reports a printer transport failure truthfully", async () => {
    const transport: PrinterTransport = {
      print: async () => {
        throw new Error("printer offline");
      },
    };

    const outcome = await createDeviceProbeService({ printerTransport: transport }).probe("printer", config);

    expect(outcome).toMatchObject({ ok: false, message: "printer offline" });
  });

  it("tests a keyboard-wedge scanner through its adapter", async () => {
    const factory: ScannerServiceFactory = {
      isAvailable: () => true,
      forConfig: vi.fn(async () => ({
        state: "idle" as const,
        start: vi.fn(),
        stop: vi.fn(),
        test: vi.fn(async () => ({ ok: true, message: "اسکنر کیبوردی فعال است" })),
      }) as unknown as DeviceScannerService),
    };

    const outcome = await createDeviceProbeService({ scannerFactory: factory }).probe("scanner", config);

    expect(outcome).toMatchObject({ ok: true, message: "اسکنر کیبوردی فعال است" });
  });

  it("refuses a serial scanner outside the desktop shell", async () => {
    const factory: ScannerServiceFactory = {
      isAvailable: () => false,
      forConfig: vi.fn(),
    };

    const outcome = await createDeviceProbeService({ scannerFactory: factory }).probe("scanner", {
      ...config,
      scannerPort: "COM5",
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.message).toContain("دسکتاپ");
  });
});
