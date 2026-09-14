import type {
  BackupSettingRecord,
  DeviceSettingRecord,
  DeviceSettingType,
  PrinterSettingRecord,
  ScannerSettingRecord,
  ScaleSettingRecord,
} from "../types/persistence";
import type { SqlClient } from "../services/database/sql-client";

type DeviceSettingsRow = Readonly<{
  id: string;
  device_type: DeviceSettingType;
  display_name: string;
  connection_status: DeviceSettingRecord["connectionStatus"];
  connection_json: string;
  created_at: string;
  updated_at: string;
}>;

type DeviceSpecificRow = Readonly<{
  device_settings_id: string | null;
  printer_name: string | null;
  scanner_type: string | null;
  scan_mode: string | null;
  scale_model: string | null;
  port_name: string | null;
  baud_rate: number | null;
  label_width_mm: number | null;
  label_height_mm: number | null;
  created_at: string;
  updated_at: string;
}>;

type BackupSettingsRow = Readonly<{
  is_enabled: number;
  interval_minutes: number;
  destination_path: string | null;
  last_backup_at: string | null;
  created_at: string;
  updated_at: string;
}>;

const mapBoolean = (value: number | null): boolean => value === 1;

const mapDeviceRow = (row: DeviceSettingsRow): DeviceSettingRecord => ({
  id: row.id as DeviceSettingRecord["id"],
  deviceType: row.device_type,
  displayName: row.display_name,
  connectionStatus: row.connection_status,
  connectionJson: row.connection_json,
  createdAt: row.created_at as DeviceSettingRecord["createdAt"],
  updatedAt: row.updated_at as DeviceSettingRecord["updatedAt"],
});

const mapPrinterRow = (row: DeviceSpecificRow): PrinterSettingRecord => ({
  deviceSettingsId: row.device_settings_id,
  printerName: row.printer_name,
  labelWidthMm: row.label_width_mm,
  labelHeightMm: row.label_height_mm,
  createdAt: row.created_at as PrinterSettingRecord["createdAt"],
  updatedAt: row.updated_at as PrinterSettingRecord["updatedAt"],
});

const mapScannerRow = (row: DeviceSpecificRow): ScannerSettingRecord => ({
  deviceSettingsId: row.device_settings_id,
  scannerType: row.scanner_type,
  scanMode: row.scan_mode,
  createdAt: row.created_at as ScannerSettingRecord["createdAt"],
  updatedAt: row.updated_at as ScannerSettingRecord["updatedAt"],
});

const mapScaleRow = (row: DeviceSpecificRow): ScaleSettingRecord => ({
  deviceSettingsId: row.device_settings_id,
  scaleModel: row.scale_model,
  portName: row.port_name,
  baudRate: row.baud_rate,
  createdAt: row.created_at as ScaleSettingRecord["createdAt"],
  updatedAt: row.updated_at as ScaleSettingRecord["updatedAt"],
});

const mapBackupRow = (row: BackupSettingsRow): BackupSettingRecord => ({
  isEnabled: mapBoolean(row.is_enabled),
  intervalMinutes: row.interval_minutes,
  destinationPath: row.destination_path,
  lastBackupAt: (row.last_backup_at ?? null) as BackupSettingRecord["lastBackupAt"],
  createdAt: row.created_at as BackupSettingRecord["createdAt"],
  updatedAt: row.updated_at as BackupSettingRecord["updatedAt"],
});

export class SettingsRepository {
  constructor(private readonly client: SqlClient) {}

  async getAppSetting<T>(key: string): Promise<T | null> {
    const rows = await this.client.select<Readonly<{ value_json: string }>>(
      "SELECT value_json FROM app_settings WHERE setting_key = ?",
      [key],
    );
    return rows[0] ? (JSON.parse(rows[0].value_json) as T) : null;
  }

  async upsertAppSetting(key: string, value: unknown, updatedAt: string): Promise<void> {
    await this.client.execute(
      `INSERT INTO app_settings (setting_key, value_json, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(setting_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
      [key, JSON.stringify(value), updatedAt, updatedAt],
    );
  }

  async listDeviceSettings(): Promise<readonly DeviceSettingRecord[]> {
    const rows = await this.client.select<DeviceSettingsRow>(
      "SELECT * FROM device_settings ORDER BY device_type",
    );
    return rows.map(mapDeviceRow);
  }

  async upsertDeviceSetting(
    deviceType: DeviceSettingType,
    displayName: string,
    updatedAt: string,
  ): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO device_settings (id, device_type, display_name, connection_status, connection_json, created_at, updated_at)
       VALUES ('device-' || ?, ?, ?, 'ready', '{}', ?, ?)
       ON CONFLICT(device_type) DO UPDATE SET display_name = excluded.display_name, updated_at = excluded.updated_at`,
      [deviceType, deviceType, displayName, updatedAt, updatedAt],
    );
  }

  async getPrinterSetting(): Promise<PrinterSettingRecord | null> {
    const rows = await this.client.select<DeviceSpecificRow>(
      `SELECT s.device_settings_id, s.printer_name, NULL AS scanner_type, NULL AS scan_mode,
              NULL AS scale_model, NULL AS port_name, NULL AS baud_rate,
              s.label_width_mm, s.label_height_mm, s.created_at, s.updated_at
       FROM printer_settings s WHERE s.id = 1`,
    );
    return rows[0] ? mapPrinterRow(rows[0]) : null;
  }

  async getScannerSetting(): Promise<ScannerSettingRecord | null> {
    const rows = await this.client.select<DeviceSpecificRow>(
      `SELECT s.device_settings_id, NULL AS printer_name, s.scanner_type, s.scan_mode,
              NULL AS scale_model, NULL AS port_name, NULL AS baud_rate,
              NULL AS label_width_mm, NULL AS label_height_mm, s.created_at, s.updated_at
       FROM scanner_settings s WHERE s.id = 1`,
    );
    return rows[0] ? mapScannerRow(rows[0]) : null;
  }

  async getScaleSetting(): Promise<ScaleSettingRecord | null> {
    const rows = await this.client.select<DeviceSpecificRow>(
      `SELECT s.device_settings_id, NULL AS printer_name, NULL AS scanner_type, NULL AS scan_mode,
              s.scale_model, s.port_name, s.baud_rate,
              NULL AS label_width_mm, NULL AS label_height_mm, s.created_at, s.updated_at
       FROM scale_settings s WHERE s.id = 1`,
    );
    return rows[0] ? mapScaleRow(rows[0]) : null;
  }

  async upsertPrinterSetting(input: Readonly<{
    deviceSettingsId: string | null;
    printerName: string | null;
    labelWidthMm: number | null;
    labelHeightMm: number | null;
    updatedAt: string;
  }>): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO printer_settings (id, device_settings_id, printer_name, label_width_mm, label_height_mm, created_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET device_settings_id = excluded.device_settings_id,
         printer_name = excluded.printer_name, label_width_mm = excluded.label_width_mm,
         label_height_mm = excluded.label_height_mm, updated_at = excluded.updated_at`,
      [input.deviceSettingsId, input.printerName, input.labelWidthMm, input.labelHeightMm, input.updatedAt, input.updatedAt],
    );
  }

  async upsertScannerSetting(input: Readonly<{
    deviceSettingsId: string | null;
    scannerType: string | null;
    scanMode: string | null;
    updatedAt: string;
  }>): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO scanner_settings (id, device_settings_id, scanner_type, scan_mode, created_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET device_settings_id = excluded.device_settings_id,
         scanner_type = excluded.scanner_type, scan_mode = excluded.scan_mode, updated_at = excluded.updated_at`,
      [input.deviceSettingsId, input.scannerType, input.scanMode, input.updatedAt, input.updatedAt],
    );
  }

  async upsertScaleSetting(input: Readonly<{
    deviceSettingsId: string | null;
    scaleModel: string | null;
    portName: string | null;
    baudRate: number | null;
    updatedAt: string;
  }>): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO scale_settings (id, device_settings_id, scale_model, port_name, baud_rate, created_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET device_settings_id = excluded.device_settings_id,
         scale_model = excluded.scale_model, port_name = excluded.port_name, baud_rate = excluded.baud_rate,
         updated_at = excluded.updated_at`,
      [input.deviceSettingsId, input.scaleModel, input.portName, input.baudRate, input.updatedAt, input.updatedAt],
    );
  }

  async getBackupSetting(): Promise<BackupSettingRecord | null> {
    const rows = await this.client.select<BackupSettingsRow>(
      "SELECT * FROM backup_settings WHERE id = 1",
    );
    return rows[0] ? mapBackupRow(rows[0]) : null;
  }

  async upsertBackupSetting(input: Readonly<{
    isEnabled: boolean;
    intervalMinutes: number;
    destinationPath: string | null;
    updatedAt: string;
  }>): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO backup_settings (id, is_enabled, interval_minutes, destination_path, created_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET is_enabled = excluded.is_enabled,
         interval_minutes = excluded.interval_minutes, destination_path = excluded.destination_path,
         updated_at = excluded.updated_at`,
      [input.isEnabled ? 1 : 0, input.intervalMinutes, input.destinationPath, input.updatedAt, input.updatedAt],
    );
  }
}
