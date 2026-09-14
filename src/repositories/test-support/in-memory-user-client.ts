import type { SqlClient, SqlStatementResult, SqlValue } from "../../services/database/sql-client";

type UserRow = Record<string, SqlValue> & Readonly<{ id: string; deletedAt: string | null }>;

/**
 * Minimal in-memory stand-in for the users table. It answers only the statements
 * UserRepository issues, mirrors the partial unique index on active usernames,
 * and keeps data between calls so tests can reopen a fresh repository over the
 * same rows (an application restart) without a database driver.
 */
export class InMemoryUserClient implements SqlClient {
  private rows: UserRow[] = [];

  rowsOf(): readonly UserRow[] {
    return this.rows;
  }

  async select<T>(sql: string, bindValues: readonly SqlValue[] = []): Promise<readonly T[]> {
    const visible = this.rows.filter(row => row.deletedAt === null);

    if (bindValues.length > 0 && /username = \?/.test(sql)) {
      return visible.filter(row => row.username === bindValues[0]) as unknown as readonly T[];
    }
    if (bindValues.length > 0 && /\bid = \?/.test(sql)) {
      return visible.filter(row => row.id === bindValues[0]) as unknown as readonly T[];
    }

    const active = /is_active = 1/.test(sql) ? visible.filter(row => row.isActive === 1) : visible;
    return [...active].sort((left, right) => String(left.displayName).localeCompare(String(right.displayName))) as unknown as readonly T[];
  }

  async execute(sql: string, bindValues: readonly SqlValue[] = []): Promise<SqlStatementResult> {
    if (sql.includes("INSERT INTO users")) {
      const [id, displayName, username, role, passwordHash, passwordAlgorithm, passwordVersion, createdAt, updatedAt] = bindValues;
      const duplicate = this.rows.some(row => row.deletedAt === null && row.username === username);
      if (duplicate) throw new Error("UNIQUE constraint failed: users.username");
      this.rows.push({
        id: String(id), displayName, username, role: String(role), isActive: 1,
        passwordHash, passwordAlgorithm, passwordVersion, createdAt, updatedAt, deletedAt: null,
      });
      return { rowsAffected: 1 };
    }

    if (sql.includes("deleted_at = ?") && sql.includes("is_active = 0")) {
      const [deletedAt, , id] = bindValues;
      this.rows = this.rows.map(row =>
        row.id === id ? { ...row, deletedAt: deletedAt as string, isActive: 0, updatedAt: deletedAt } : row,
      );
      return { rowsAffected: 1 };
    }

    if (sql.includes("display_name = ?")) {
      const [displayName, username, role, updatedAt, id] = bindValues;
      const duplicate = this.rows.some(row => row.deletedAt === null && row.username === username && row.id !== id);
      if (duplicate) throw new Error("UNIQUE constraint failed: users.username");
      this.rows = this.rows.map(row => (row.id === id ? { ...row, displayName, username, role, updatedAt } : row));
      return { rowsAffected: 1 };
    }

    if (sql.includes("password_hash = ?")) {
      const [passwordHash, passwordAlgorithm, passwordVersion, updatedAt, id] = bindValues;
      this.rows = this.rows.map(row =>
        row.id === id ? { ...row, passwordHash, passwordAlgorithm, passwordVersion, updatedAt } : row,
      );
      return { rowsAffected: 1 };
    }

    if (sql.includes("is_active = ?")) {
      const [isActive, updatedAt, id] = bindValues;
      this.rows = this.rows.map(row => (row.id === id ? { ...row, isActive, updatedAt } : row));
      return { rowsAffected: 1 };
    }

    return { rowsAffected: 0 };
  }

  async transaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T> {
    return work(this);
  }

  async close(): Promise<void> {}
}
