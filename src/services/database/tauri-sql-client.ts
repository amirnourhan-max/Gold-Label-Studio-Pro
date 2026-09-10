import type Database from "@tauri-apps/plugin-sql";
import type { SqlClient, SqlStatementResult, SqlValue } from "./sql-client";

type TauriDatabase = Database;

export class TauriSqlClient implements SqlClient {
  private constructor(private readonly database: TauriDatabase) {}

  static async open(databaseUrl: string): Promise<TauriSqlClient> {
    const { default: DatabaseClient } = await import("@tauri-apps/plugin-sql");
    return new TauriSqlClient(await DatabaseClient.load(databaseUrl));
  }

  async select<T>(sql: string, bindValues: readonly SqlValue[] = []): Promise<readonly T[]> {
    return this.database.select<T[]>(sql, [...bindValues]);
  }

  async execute(sql: string, bindValues: readonly SqlValue[] = []): Promise<SqlStatementResult> {
    return this.database.execute(sql, [...bindValues]);
  }

  async transaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T> {
    await this.execute("BEGIN IMMEDIATE");

    try {
      const result = await work(this);
      await this.execute("COMMIT");
      return result;
    } catch (error) {
      await this.execute("ROLLBACK");
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.database.close();
  }
}
