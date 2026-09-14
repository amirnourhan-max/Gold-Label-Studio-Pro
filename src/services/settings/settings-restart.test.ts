import { describe, expect, it } from "vitest";
import { InMemorySettingsClient } from "../../repositories/test-support/in-memory-settings-client";
import { SettingsRepository } from "../../repositories/settings-repository";
import { PersistenceSettingsGateway } from "./persistence-settings-gateway";
import { approvedSettingsSnapshot, type SettingsSnapshot } from "./settings-contract";

/** Reusing the same client models the same SQLite file reopened after a restart. */
const openApp = (client: InMemorySettingsClient) =>
  new PersistenceSettingsGateway(new SettingsRepository(client));

const editedSnapshot: SettingsSnapshot = {
  scale: { displayName: "تنظیمات ترازو", scaleModel: "A&D GX-A14", port: "COM7", baudRate: "19200" },
  printer: { displayName: "تنظیمات پرینتر", printerName: "Zebra ZD621", labelSize: "40 × 25 mm", printMode: "چاپ معکوس" },
  scanner: { displayName: "تنظیمات اسکنر", scannerType: "بارکد صنعتی", scanMode: "تأیید دستی", port: "COM4" },
  backup: { enabled: false, intervalLabel: "هر ۱۲ ساعت", destinationPath: "E:\\GoldLabel\\Backups" },
};

describe("settings restart persistence", () => {
  it("shows the approved defaults on an empty database", async () => {
    expect(await openApp(new InMemorySettingsClient()).loadSettings()).toEqual(approvedSettingsSnapshot);
  });

  it("reloads every edited field through a fresh repository and gateway", async () => {
    const client = new InMemorySettingsClient();

    await openApp(client).saveSettings(editedSnapshot);

    const reloaded = await openApp(client).loadSettings();

    expect(reloaded).toEqual(editedSnapshot);
  });

  it("keeps exactly one row per settings record across repeated saves", async () => {
    const client = new InMemorySettingsClient();
    const app = openApp(client);

    await app.saveSettings(editedSnapshot);
    await app.saveSettings({ ...editedSnapshot, scale: { ...editedSnapshot.scale, port: "COM8" } });

    expect(client.rowsOf("device_settings")).toHaveLength(3);
    expect(client.rowsOf("printer_settings")).toHaveLength(1);
    expect(client.rowsOf("scanner_settings")).toHaveLength(1);
    expect(client.rowsOf("scale_settings")).toHaveLength(1);
    expect(client.rowsOf("backup_settings")).toHaveLength(1);
    expect(client.rowsOf("app_settings")).toHaveLength(1);
    expect((await openApp(client).loadSettings()).scale.port).toBe("COM8");
  });

  it("persists the fields the schema has no dedicated column for", async () => {
    const client = new InMemorySettingsClient();

    await openApp(client).saveSettings(editedSnapshot);

    const reloaded = await openApp(client).loadSettings();
    expect(reloaded.printer.printMode).toBe("چاپ معکوس");
    expect(reloaded.scanner.port).toBe("COM4");
    expect(reloaded.backup.intervalLabel).toBe("هر ۱۲ ساعت");
    expect(client.rowsOf("app_settings")[0]?.setting_key).toBe("settings.ui");
  });
});
