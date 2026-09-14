import type { SqlClient, SqlStatementResult, SqlValue } from "../../services/database/sql-client";

type Row = Record<string, unknown>;

const tableOf = (sql: string): string => /(?:INSERT INTO|FROM)\s+([a-z_]+)/i.exec(sql)?.[1] ?? "";
const isSingleRowSelect = (sql: string): boolean => /WHERE[\s\S]*\bid\s*=\s*1\b/i.test(sql);
const isOrderedByDeviceType = (sql: string): boolean => /ORDER BY\s+device_type/i.test(sql);

/**
 * Minimal in-memory stand-in for the SQLite settings tables. It answers only the
 * statements SettingsRepository issues, with real upsert semantics, so tests can
 * round-trip a snapshot through the production SQL + row mapping without a
 * database driver (and prove values survive a fresh repository/gateway pair).
 */
export class InMemorySettingsClient implements SqlClient {
  private readonly tables = new Map<string, Row[]>();

  rowsOf(table: string): readonly Row[] {
    return this.tables.get(table) ?? [];
  }

  private table(name: string): Row[] {
    const existing = this.tables.get(name);
    if (existing) return existing;
    const created: Row[] = [];
    this.tables.set(name, created);
    return created;
  }

  private upsert(table: string, key: string, value: unknown, row: Row): void {
    const rows = this.table(table);
    const index = rows.findIndex(existing => existing[key] === value);
    if (index >= 0) rows[index] = row;
    else rows.push(row);
  }

  async select<T>(sql: string, bindValues: readonly SqlValue[] = []): Promise<readonly T[]> {
    const rows = this.rowsOf(tableOf(sql));
    if (bindValues.length > 0) {
      return rows.filter(row => row.setting_key === bindValues[0]) as readonly T[];
    }
    if (isSingleRowSelect(sql)) {
      return rows.filter(row => row.id === 1) as readonly T[];
    }
    if (isOrderedByDeviceType(sql)) {
      return [...rows].sort((a, b) => String(a.device_type).localeCompare(String(b.device_type))) as readonly T[];
    }
    return rows as readonly T[];
  }

  async execute(sql: string, bindValues: readonly SqlValue[] = []): Promise<SqlStatementResult> {
    const table = tableOf(sql);

    switch (table) {
      case "app_settings": {
        const [settingKey, valueJson, createdAt, updatedAt] = bindValues;
        this.upsert(table, "setting_key", settingKey, {
          setting_key: settingKey, value_json: valueJson, created_at: createdAt, updated_at: updatedAt,
        });
        break;
      }
      case "device_settings": {
        const [idSuffix, deviceType, displayName, createdAt, updatedAt] = bindValues;
        this.upsert(table, "device_type", deviceType, {
          id: `device-${String(idSuffix)}`, device_type: deviceType, display_name: displayName,
          connection_status: "ready", connection_json: "{}", created_at: createdAt, updated_at: updatedAt,
        });
        break;
      }
      case "printer_settings": {
        const [deviceSettingsId, printerName, labelWidthMm, labelHeightMm, createdAt, updatedAt] = bindValues;
        this.upsert(table, "id", 1, {
          id: 1, device_settings_id: deviceSettingsId, printer_name: printerName,
          label_width_mm: labelWidthMm, label_height_mm: labelHeightMm,
          created_at: createdAt, updated_at: updatedAt,
        });
        break;
      }
      case "scanner_settings": {
        const [deviceSettingsId, scannerType, scanMode, createdAt, updatedAt] = bindValues;
        this.upsert(table, "id", 1, {
          id: 1, device_settings_id: deviceSettingsId, scanner_type: scannerType, scan_mode: scanMode,
          created_at: createdAt, updated_at: updatedAt,
        });
        break;
      }
      case "scale_settings": {
        const [deviceSettingsId, scaleModel, portName, baudRate, createdAt, updatedAt] = bindValues;
        this.upsert(table, "id", 1, {
          id: 1, device_settings_id: deviceSettingsId, scale_model: scaleModel, port_name: portName,
          baud_rate: baudRate, created_at: createdAt, updated_at: updatedAt,
        });
        break;
      }
      case "backup_settings": {
        const [isEnabled, intervalMinutes, destinationPath, createdAt, updatedAt] = bindValues;
        this.upsert(table, "id", 1, {
          id: 1, is_enabled: isEnabled, interval_minutes: intervalMinutes, destination_path: destinationPath,
          last_backup_at: null, created_at: createdAt, updated_at: updatedAt,
        });
        break;
      }
      default:
        break;
    }

    return { rowsAffected: 1 };
  }

  async transaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T> {
    return work(this);
  }

  async close(): Promise<void> {}
}
