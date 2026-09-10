import { describe, expect, it } from "vitest";
import { configureDatabaseConnection } from "./database-bootstrap";
import type { SqlClient, SqlStatementResult, SqlValue } from "./sql-client";

class RecordingSqlClient implements SqlClient {
  readonly executeCalls: Array<readonly [string, readonly SqlValue[]]> = [];

  async select<T>(): Promise<readonly T[]> {
    return [];
  }

  async execute(sql: string, bindValues: readonly SqlValue[] = []): Promise<SqlStatementResult> {
    this.executeCalls.push([sql, bindValues]);
    return { rowsAffected: 0 };
  }

  async transaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T> {
    return work(this);
  }

  async close(): Promise<void> {}
}

describe("database connection bootstrap", () => {
  it("enables FK enforcement and WAL-safe runtime settings before repositories use a connection", async () => {
    const client = new RecordingSqlClient();

    await configureDatabaseConnection(client);

    expect(client.executeCalls).toEqual([
      ["PRAGMA foreign_keys = ON", []],
      ["PRAGMA journal_mode = WAL", []],
      ["PRAGMA busy_timeout = 5000", []],
    ]);
  });
});
