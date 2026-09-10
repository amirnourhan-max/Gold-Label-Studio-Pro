import type { SqlClient } from "../services/database/sql-client";

export class SettingsRepository {
  constructor(private readonly client: SqlClient) {}

  async getAppSetting<T>(key: string): Promise<T | null> {
    const rows = await this.client.select<Readonly<{ value_json: string }>>(
      "SELECT value_json FROM app_settings WHERE setting_key = ?",
      [key],
    );
    return rows[0] ? (JSON.parse(rows[0].value_json) as T) : null;
  }

  upsertAppSetting(key: string, value: unknown, updatedAt: string): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO app_settings (setting_key, value_json, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(setting_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
      [key, JSON.stringify(value), updatedAt, updatedAt],
    );
  }
}
