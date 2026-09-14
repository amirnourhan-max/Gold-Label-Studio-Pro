import { describe, expect, it } from "vitest";
import { MockSettingsGateway } from "./mock-settings-gateway";
import { PersistenceSettingsGateway } from "./persistence-settings-gateway";
import { approvedSettingsSnapshot } from "./settings-contract";
import type { SettingsRepository } from "../../repositories/settings-repository";
import type { SettingsSnapshot } from "./settings-contract";

describe("MockSettingsGateway", () => {
  it("starts from the approved snapshot and round-trips saves", async () => {
    const gateway = new MockSettingsGateway();

    expect(await gateway.loadSettings()).toEqual(approvedSettingsSnapshot);

    const edited: SettingsSnapshot = {
      ...approvedSettingsSnapshot,
      scale: { ...approvedSettingsSnapshot.scale, port: "COM5" },
    };
    await gateway.saveSettings(edited);

    expect((await gateway.loadSettings()).scale.port).toBe("COM5");
  });
});

describe("PersistenceSettingsGateway", () => {
  const buildGateway = () => {
    const calls = {
      deviceUpserts: [] as Array<readonly unknown[]>,
      printerUpserts: [] as Array<readonly unknown[]>,
      scannerUpserts: [] as Array<readonly unknown[]>,
      scaleUpserts: [] as Array<readonly unknown[]>,
      backupUpserts: [] as Array<readonly unknown[]>,
      appUpserts: [] as Array<readonly unknown[]>,
    };
    const repository = {
      listDeviceSettings: async () => [
        {
          id: "device-scale", deviceType: "scale", displayName: "ترازوی آزمایشگاه",
          connectionStatus: "ready", connectionJson: "{}",
          createdAt: "2026-09-13T10:00:00.000Z", updatedAt: "2026-09-13T10:00:00.000Z",
        },
      ],
      getPrinterSetting: async () => ({
        deviceSettingsId: null, printerName: "Zebra ZD621", labelWidthMm: 40, labelHeightMm: 25,
        createdAt: "2026-09-13T10:00:00.000Z", updatedAt: "2026-09-13T10:00:00.000Z",
      }),
      getScannerSetting: async () => null,
      getScaleSetting: async () => ({
        deviceSettingsId: null, scaleModel: "A&D GX-A14", portName: "COM7", baudRate: 19200,
        createdAt: "2026-09-13T10:00:00.000Z", updatedAt: "2026-09-13T10:00:00.000Z",
      }),
      getBackupSetting: async () => ({
        isEnabled: false, intervalMinutes: 1440, destinationPath: "E:\\Backups", lastBackupAt: null,
        createdAt: "2026-09-13T10:00:00.000Z", updatedAt: "2026-09-13T10:00:00.000Z",
      }),
      getAppSetting: async (_key: string) => ({ "scanner.port": "COM4" }),
      upsertDeviceSetting: async (...args: readonly unknown[]) => { calls.deviceUpserts.push(args); },
      upsertPrinterSetting: async (input: unknown) => { calls.printerUpserts.push([input]); },
      upsertScannerSetting: async (input: unknown) => { calls.scannerUpserts.push([input]); },
      upsertScaleSetting: async (input: unknown) => { calls.scaleUpserts.push([input]); },
      upsertBackupSetting: async (input: unknown) => { calls.backupUpserts.push([input]); },
      upsertAppSetting: async (...args: readonly unknown[]) => { calls.appUpserts.push(args); },
    } as unknown as SettingsRepository;

    return { gateway: new PersistenceSettingsGateway(repository), calls };
  };

  it("merges persisted values with approved defaults and per-kind fallbacks", async () => {
    const { gateway } = buildGateway();

    const snapshot = await gateway.loadSettings();

    expect(snapshot.scale).toEqual({
      displayName: "ترازوی آزمایشگاه", scaleModel: "A&D GX-A14", port: "COM7", baudRate: "19200",
    });
    expect(snapshot.printer).toEqual({
      displayName: "تنظیمات پرینتر", printerName: "Zebra ZD621", labelSize: "40 × 25 mm", printMode: "حرارتی مستقیم",
    });
    expect(snapshot.scanner).toEqual({
      displayName: "تنظیمات اسکنر", scannerType: "QR / Barcode", scanMode: "افزودن خودکار", port: "COM4",
    });
    expect(snapshot.backup).toEqual({
      enabled: false, intervalLabel: "هر روز ساعت ۲۳:۰۰", destinationPath: "E:\\Backups",
    });
  });

  it("saves every settings section in parallel through the repository", async () => {
    const { gateway, calls } = buildGateway();

    await gateway.saveSettings(approvedSettingsSnapshot);

    expect(calls.deviceUpserts).toHaveLength(3);
    expect(calls.printerUpserts[0]?.[0]).toMatchObject({
      printerName: "Zebra ZD421", labelWidthMm: 50, labelHeightMm: 30,
    });
    expect(calls.scaleUpserts[0]?.[0]).toMatchObject({
      scaleModel: "A&D GX-3002A", portName: "COM3", baudRate: 9600,
    });
    expect(calls.backupUpserts[0]?.[0]).toMatchObject({
      isEnabled: true, intervalMinutes: 1440, destinationPath: "D:\\GoldLabel\\Backups",
    });
    expect(calls.appUpserts).toHaveLength(1);
    expect(calls.appUpserts[0]?.[0]).toBe("settings.ui");
    expect(calls.appUpserts[0]?.[1]).toEqual({
      "printer.printMode": "حرارتی مستقیم",
      "scanner.port": "USB HID",
      backupIntervalLabel: "هر روز ساعت ۲۳:۰۰",
    });
  });

  it("keeps null label dimensions when the size label cannot be parsed", async () => {
    const { gateway, calls } = buildGateway();

    await gateway.saveSettings({
      ...approvedSettingsSnapshot,
      printer: { ...approvedSettingsSnapshot.printer, labelSize: "بدون اندازه" },
    });

    expect(calls.printerUpserts[0]?.[0]).toMatchObject({ labelWidthMm: null, labelHeightMm: null });
  });
});
