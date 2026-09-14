import type { SettingsRepository } from "../../repositories/settings-repository";
import { asUtcIsoString } from "../../types/persistence";
import {
  backupIntervalOptions,
  DAILY_INTERVAL_LABEL,
  DAILY_INTERVAL_MINUTES,
  type SettingsGateway,
  type SettingsSnapshot,
} from "./settings-contract";

type UiExtras = Readonly<{
  "printer.printMode"?: string;
  "scanner.port"?: string;
  backupIntervalLabel?: string;
}>;

const parseLabelSize = (labelSize: string): readonly [number, number] | null => {
  const match = /^(\d+)\s*×\s*(\d+)/.exec(labelSize.trim());
  return match ? [Number(match[1]), Number(match[2])] : null;
};

const asString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

/**
 * Persists the settings snapshot across device_settings (identity cards), the
 * three device-specific singletons, backup_settings, and app_settings for the
 * few approved fields the schema does not carry as dedicated columns.
 */
export class PersistenceSettingsGateway implements SettingsGateway {
  constructor(private readonly repository: SettingsRepository) {}

  async loadSettings(): Promise<SettingsSnapshot> {
    const [devices, printer, scanner, scale, backup, uiExtras] = await Promise.all([
      this.repository.listDeviceSettings(),
      this.repository.getPrinterSetting(),
      this.repository.getScannerSetting(),
      this.repository.getScaleSetting(),
      this.repository.getBackupSetting(),
      this.repository.getAppSetting<UiExtras>("settings.ui"),
    ]);

    const identity = new Map(devices.map(device => [device.deviceType, device.displayName]));
    const labelSize = printer?.labelWidthMm != null && printer?.labelHeightMm != null
      ? `${printer.labelWidthMm} × ${printer.labelHeightMm} mm`
      : "50 × 30 mm";

    return {
      scale: {
        displayName: identity.get("scale") ?? "تنظیمات ترازو",
        scaleModel: scale?.scaleModel ?? "A&D GX-3002A",
        port: scale?.portName ?? "COM3",
        baudRate: scale?.baudRate != null ? String(scale.baudRate) : "9600",
      },
      printer: {
        displayName: identity.get("printer") ?? "تنظیمات پرینتر",
        printerName: printer?.printerName ?? "Zebra ZD421",
        labelSize,
        printMode: asString(uiExtras?.["printer.printMode"], "حرارتی مستقیم"),
      },
      scanner: {
        displayName: identity.get("scanner") ?? "تنظیمات اسکنر",
        scannerType: scanner?.scannerType ?? "QR / Barcode",
        scanMode: scanner?.scanMode ?? "افزودن خودکار",
        port: asString(uiExtras?.["scanner.port"], "USB HID"),
      },
      backup: {
        enabled: backup?.isEnabled ?? true,
        intervalLabel: asString(uiExtras?.backupIntervalLabel, DAILY_INTERVAL_LABEL),
        destinationPath: backup?.destinationPath ?? "D:\\GoldLabel\\Backups",
      },
    };
  }

  async saveSettings(snapshot: SettingsSnapshot): Promise<void> {
    const now = asUtcIsoString(new Date().toISOString());
    const dimensions = parseLabelSize(snapshot.printer.labelSize);

    await Promise.all([
      this.repository.upsertDeviceSetting("scale", snapshot.scale.displayName, now),
      this.repository.upsertDeviceSetting("printer", snapshot.printer.displayName, now),
      this.repository.upsertDeviceSetting("scanner", snapshot.scanner.displayName, now),
      this.repository.upsertPrinterSetting({
        deviceSettingsId: null,
        printerName: snapshot.printer.printerName,
        labelWidthMm: dimensions?.[0] ?? null,
        labelHeightMm: dimensions?.[1] ?? null,
        updatedAt: now,
      }),
      this.repository.upsertScannerSetting({
        deviceSettingsId: null,
        scannerType: snapshot.scanner.scannerType,
        scanMode: snapshot.scanner.scanMode,
        updatedAt: now,
      }),
      this.repository.upsertScaleSetting({
        deviceSettingsId: null,
        scaleModel: snapshot.scale.scaleModel,
        portName: snapshot.scale.port,
        baudRate: Number.parseInt(snapshot.scale.baudRate, 10) || null,
        updatedAt: now,
      }),
      this.repository.upsertBackupSetting({
        isEnabled: snapshot.backup.enabled,
        intervalMinutes: backupIntervalOptions[snapshot.backup.intervalLabel] ?? DAILY_INTERVAL_MINUTES,
        destinationPath: snapshot.backup.destinationPath,
        updatedAt: now,
      }),
      this.repository.upsertAppSetting("settings.ui", {
        "printer.printMode": snapshot.printer.printMode,
        "scanner.port": snapshot.scanner.port,
        backupIntervalLabel: snapshot.backup.intervalLabel,
      }, now),
    ]);
  }
}
