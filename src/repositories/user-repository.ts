import type { CreateUserInput, UserRecord, UtcIsoString } from "../types/persistence";
import type { SqlClient } from "../services/database/sql-client";

export class UserRepository {
  constructor(private readonly client: SqlClient) {}

  listActive(): Promise<readonly UserRecord[]> {
    return this.client.select<UserRecord>(
      "SELECT * FROM users WHERE is_active = 1 AND deleted_at IS NULL ORDER BY display_name",
    );
  }

  create(input: CreateUserInput): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO users (
        id, display_name, username, role, password_hash, password_algorithm, password_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id, input.displayName, input.username, input.role, input.passwordHash, input.passwordAlgorithm,
        input.passwordVersion, input.createdAt, input.createdAt,
      ],
    );
  }

  softDelete(id: string, deletedAt: UtcIsoString | string): Promise<unknown> {
    return this.client.execute(
      "UPDATE users SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      [deletedAt, deletedAt, id],
    );
  }
}
