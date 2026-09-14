/** Persisted values behind the approved Settings page (hardware stays mocked). */
export type ScaleSettingsView = Readonly<{
  displayName: string;
  scaleModel: string;
  port: string;
  baudRate: string;
}>;

export type PrinterSettingsView = Readonly<{
  displayName: string;
  printerName: string;
  labelSize: string;
  printMode: string;
}>;

export type ScannerSettingsView = Readonly<{
  displayName: string;
  scannerType: string;
  scanMode: string;
  port: string;
}>;

export type BackupSettingsView = Readonly<{
  enabled: boolean;
  intervalLabel: string;
  destinationPath: string;
}>;

export type SettingsSnapshot = Readonly<{
  scale: ScaleSettingsView;
  printer: PrinterSettingsView;
  scanner: ScannerSettingsView;
  backup: BackupSettingsView;
}>;

export type SettingsGateway = Readonly<{
  loadSettings(): Promise<SettingsSnapshot>;
  saveSettings(snapshot: SettingsSnapshot): Promise<void>;
}>;

/** The approved default values shown when nothing is persisted yet. */
export const approvedSettingsSnapshot: SettingsSnapshot = {
  scale: { displayName: "تنظیمات ترازو", scaleModel: "A&D GX-3002A", port: "COM3", baudRate: "9600" },
  printer: { displayName: "تنظیمات پرینتر", printerName: "Zebra ZD421", labelSize: "50 × 30 mm", printMode: "حرارتی مستقیم" },
  scanner: { displayName: "تنظیمات اسکنر", scannerType: "QR / Barcode", scanMode: "افزودن خودکار", port: "USB HID" },
  backup: { enabled: true, intervalLabel: "هر روز ساعت ۲۳:۰۰", destinationPath: "D:\\GoldLabel\\Backups" },
};

/** Daily 23:00 schedule as used by the approved interval select. */
export const DAILY_INTERVAL_MINUTES = 1440;
export const DAILY_INTERVAL_LABEL = "هر روز ساعت ۲۳:۰۰";

/** Approved interval options mapped to their persisted interval_minutes. */
export const backupIntervalOptions: Readonly<Record<string, number>> = {
  "هر روز ساعت ۲۳:۰۰": DAILY_INTERVAL_MINUTES,
  "هر ۱۲ ساعت": 720,
  "هر ۶ ساعت": 360,
  "هر ساعت": 60,
};
