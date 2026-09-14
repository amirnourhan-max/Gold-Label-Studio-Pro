import type { SqlClient, SqlStatementResult, SqlValue } from "../../services/database/sql-client";

export class RecordingSqlClient implements SqlClient {
  readonly selectCalls: Array<Readonly<{ sql: string; bindValues: readonly SqlValue[] }>> = [];
  readonly executeCalls: Array<Readonly<{ sql: string; bindValues: readonly SqlValue[] }>> = [];
  private selectedRows: readonly unknown[] = [];
  private queuedRowSets: ReadonlyArray<readonly unknown[]> | null = null;
  private queueIndex = 0;

  returns(rows: readonly unknown[]): this {
    this.selectedRows = rows;
    this.queuedRowSets = null;
    this.queueIndex = 0;
    return this;
  }

  /** Returns each queued row set once, in call order, then empty results. */
  returnsInOrder(...rowSets: ReadonlyArray<readonly unknown[]>): this {
    this.queuedRowSets = rowSets.map((rows) => [...rows]);
    this.queueIndex = 0;
    return this;
  }

  async select<T>(sql: string, bindValues: readonly SqlValue[] = []): Promise<readonly T[]> {
    this.selectCalls.push({ sql, bindValues });

    if (this.queuedRowSets) {
      const rows = this.queuedRowSets[this.queueIndex] ?? [];
      this.queueIndex += 1;
      return rows as readonly T[];
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
