import { describe, expect, it } from "vitest";
import { SettingsRepository } from "./settings-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";

describe("SettingsRepository", () => {
  it("upserts JSON app settings through parameter binding", async () => {
    const client = new RecordingSqlClient();

    await new SettingsRepository(client).upsertAppSetting("ui.locale", { locale: "fa-IR" }, "2026-09-10T00:00:00.000Z");

    expect(client.executeCalls[0]).toMatchObject({
      sql: expect.stringContaining("ON CONFLICT(setting_key) DO UPDATE"),
      bindValues: ["ui.locale", '{"locale":"fa-IR"}', "2026-09-10T00:00:00.000Z", "2026-09-10T00:00:00.000Z"],
    });
  });

  it("upserts a device card by its unique device_type", async () => {
    const client = new RecordingSqlClient();

    await new SettingsRepository(client).upsertDeviceSetting("scale", "ترازوی A&D", "2026-09-10T00:00:00.000Z");

    expect(client.executeCalls[0]).toMatchObject({
      sql: expect.stringContaining("ON CONFLICT(device_type) DO UPDATE"),
      bindValues: ["scale", "scale", "ترازوی A&D", "2026-09-10T00:00:00.000Z", "2026-09-10T00:00:00.000Z"],
    });
  });

  it("upserts the single printer row with name and label dimensions", async () => {
    const client = new RecordingSqlClient();

    await new SettingsRepository(client).upsertPrinterSetting({
      deviceSettingsId: null, printerName: "Zebra ZD421", labelWidthMm: 50, labelHeightMm: 30,
      updatedAt: "2026-09-10T00:00:00.000Z",
    });

    expect(client.executeCalls[0]).toMatchObject({
      sql: expect.stringContaining("INSERT INTO printer_settings"),
      bindValues: [null, "Zebra ZD421", 50, 30, "2026-09-10T00:00:00.000Z", "2026-09-10T00:00:00.000Z"],
    });
  });

  it("upserts the single scanner row with type and mode", async () => {
    const client = new RecordingSqlClient();

    await new SettingsRepository(client).upsertScannerSetting({
      deviceSettingsId: null, scannerType: "QR / Barcode", scanMode: "افزودن خودکار",
      updatedAt: "2026-09-10T00:00:00.000Z",
    });

    expect(client.executeCalls[0]).toMatchObject({
      sql: expect.stringContaining("INSERT INTO scanner_settings"),
      bindValues: [null, "QR / Barcode", "افزودن خودکار", "2026-09-10T00:00:00.000Z", "2026-09-10T00:00:00.000Z"],
    });
  });

  it("upserts the single scale row with model, port and baud rate", async () => {
    const client = new RecordingSqlClient();

    await new SettingsRepository(client).upsertScaleSetting({
      deviceSettingsId: null, scaleModel: "A&D GX-3002A", portName: "COM3", baudRate: 9600,
      updatedAt: "2026-09-10T00:00:00.000Z",
    });

    expect(client.executeCalls[0]).toMatchObject({
      sql: expect.stringContaining("INSERT INTO scale_settings"),
      bindValues: [null, "A&D GX-3002A", "COM3", 9600, "2026-09-10T00:00:00.000Z", "2026-09-10T00:00:00.000Z"],
    });
  });

  it("upserts the single backup row with enabled flag, interval and path", async () => {
    const client = new RecordingSqlClient();

    await new SettingsRepository(client).upsertBackupSetting({
      isEnabled: true, intervalMinutes: 1440, destinationPath: "D:\\GoldLabel\\Backups",
      updatedAt: "2026-09-10T00:00:00.000Z",
    });

    expect(client.executeCalls[0]).toMatchObject({
      sql: expect.stringContaining("INSERT INTO backup_settings"),
      bindValues: [1, 1440, "D:\\GoldLabel\\Backups", "2026-09-10T00:00:00.000Z", "2026-09-10T00:00:00.000Z"],
    });
  });

  it("records the last backup timestamp without changing the configured schedule", async () => {
    const client = new RecordingSqlClient();

    await new SettingsRepository(client).recordBackupAt("2026-09-14T23:00:00.000Z");

    expect(client.executeCalls[0]).toMatchObject({
      sql: expect.stringContaining("last_backup_at = excluded.last_backup_at"),
      bindValues: ["2026-09-14T23:00:00.000Z", "2026-09-14T23:00:00.000Z", "2026-09-14T23:00:00.000Z"],
    });
    expect(client.executeCalls[0]?.sql).not.toContain("interval_minutes = excluded.interval_minutes");
  });

  it("maps snake_case device and backup rows to camelCase records", async () => {
    const client = new RecordingSqlClient();
    client.returnsInOrder(
      [{
        id: "device-scale", device_type: "scale", display_name: "ترازو",
        connection_status: "ready", connection_json: "{}",
        created_at: "2026-09-10T00:00:00.000Z", updated_at: "2026-09-10T00:00:00.000Z",
      }],
      [{
        device_settings_id: null, printer_name: "Zebra ZD421", scanner_type: null, scan_mode: null,
        scale_model: null, port_name: null, baud_rate: null,
        label_width_mm: 50, label_height_mm: 30,
        created_at: "2026-09-10T00:00:00.000Z", updated_at: "2026-09-10T00:00:00.000Z",
      }],
      [{
        is_enabled: 0, interval_minutes: 720, destination_path: "D:\\Backups", last_backup_at: null,
        created_at: "2026-09-10T00:00:00.000Z", updated_at: "2026-09-10T00:00:00.000Z",
      }],
    );
    const repository = new SettingsRepository(client);

    const devices = await repository.listDeviceSettings();
    const printer = await repository.getPrinterSetting();
    const backup = await repository.getBackupSetting();

    expect(devices).toEqual([{
      id: "device-scale", deviceType: "scale", displayName: "ترازو",
      connectionStatus: "ready", connectionJson: "{}",
      createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z",
    }]);
    expect(printer).toEqual({
      deviceSettingsId: null, printerName: "Zebra ZD421", labelWidthMm: 50, labelHeightMm: 30,
      createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z",
    });
    expect(backup).toEqual({
      isEnabled: false, intervalMinutes: 720, destinationPath: "D:\\Backups", lastBackupAt: null,
      createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z",
    });
  });

  it("returns null when a singleton settings row does not exist yet", async () => {
    const client = new RecordingSqlClient().returns([]);
    const repository = new SettingsRepository(client);

    expect(await repository.getPrinterSetting()).toBeNull();
    expect(await repository.getScannerSetting()).toBeNull();
    expect(await repository.getScaleSetting()).toBeNull();
    expect(await repository.getBackupSetting()).toBeNull();
  });
});
