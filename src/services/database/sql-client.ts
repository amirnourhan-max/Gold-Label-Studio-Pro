export type SqlValue = string | number | null;

export type SqlStatementResult = Readonly<{
  rowsAffected: number;
  lastInsertId?: number;
}>;

export interface SqlClient {
  select<T>(sql: string, bindValues?: readonly SqlValue[]): Promise<readonly T[]>;
  execute(sql: string, bindValues?: readonly SqlValue[]): Promise<SqlStatementResult>;
  transaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
