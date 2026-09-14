import type { SqlClient, SqlStatementResult, SqlValue } from "../../services/database/sql-client";

export class RecordingSqlClient implements SqlClient {
  readonly selectCalls: Array<Readonly<{ sql: string; bindValues: readonly SqlValue[] }>> = [];
  readonly executeCalls: Array<Readonly<{ sql: string; bindValues: readonly SqlValue[] }>> = [];
  private selectedRows: readonly unknown[] = [];
  private rowQueue: Array<readonly unknown[]> = [];

  returns(rows: readonly unknown[]): this {
    this.selectedRows = rows;
    return this;
  }

  /** Answers each select from the next queue entry; empty arrays after exhaustion. */
  returnsInOrder(queue: Array<readonly unknown[]>): this {
    this.rowQueue = [...queue];
    return this;
  }

  async select<T>(sql: string, bindValues: readonly SqlValue[] = []): Promise<readonly T[]> {
    this.selectCalls.push({ sql, bindValues });
    if (this.rowQueue.length > 0) {
      return this.rowQueue.shift() as readonly T[];
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
