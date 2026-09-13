import type { SqlClient, SqlStatementResult, SqlValue } from "../../services/database/sql-client";

export class RecordingSqlClient implements SqlClient {
  readonly selectCalls: Array<Readonly<{ sql: string; bindValues: readonly SqlValue[] }>> = [];
  readonly executeCalls: Array<Readonly<{ sql: string; bindValues: readonly SqlValue[] }>> = [];
  private selectedRows: readonly unknown[] = [];
  private queuedRows: Array<readonly unknown[]> | null = null;

  returns(rows: readonly unknown[]): this {
    this.selectedRows = rows;
    this.queuedRows = null;
    return this;
  }

  /** Returns queued row sets one per select call, then empty sets. */
  returnsInOrder(rowsPerCall: Array<readonly unknown[]>): this {
    this.queuedRows = [...rowsPerCall];
    this.selectedRows = [];
    return this;
  }

  async select<T>(sql: string, bindValues: readonly SqlValue[] = []): Promise<readonly T[]> {
    this.selectCalls.push({ sql, bindValues });
    if (this.queuedRows !== null) {
      return (this.queuedRows.shift() ?? []) as readonly T[];
    }
    return this.selectedRows as readonly T[];
  }

  async execute(sql: string, bindValues: readonly SqlValue[] = []): Promise<SqlStatementResult> {
    this.executeCalls.push({ sql, bindValues });
    return { rowsAffected: 1 };
  }

  async transaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T> {
    return work(this);
  }

  async close(): Promise<void> {}
}
