import type {
  CreateUserInput,
  UpdateUserInput,
  UserPasswordInput,
  UserRecord,
  UserRole,
  UtcIsoString,
} from "../types/persistence";
import type { SqlClient } from "../services/database/sql-client";

type UserRow = Readonly<{
  id: string;
  displayName: string;
  username: string;
  role: UserRole;
  isActive: number;
  passwordHash: string | null;
  passwordAlgorithm: string | null;
  passwordVersion: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}>;

const userColumns = `
  u.id, u.display_name AS displayName, u.username, u.role, u.is_active AS isActive,
  u.password_hash AS passwordHash, u.password_algorithm AS passwordAlgorithm,
  u.password_version AS passwordVersion, u.created_at AS createdAt, u.updated_at AS updatedAt,
  u.deleted_at AS deletedAt`;

const mapUserRow = (row: UserRow): UserRecord => ({
  id: row.id as UserRecord["id"],
  displayName: row.displayName,
  username: row.username,
  role: row.role,
  isActive: row.isActive === 1,
  passwordHash: row.passwordHash,
  passwordAlgorithm: row.passwordAlgorithm,
  passwordVersion: row.passwordVersion,
  createdAt: row.createdAt as UserRecord["createdAt"],
  updatedAt: row.updatedAt as UserRecord["updatedAt"],
  deletedAt: (row.deletedAt ?? null) as UserRecord["deletedAt"],
});

export class UserRepository {
  constructor(private readonly client: SqlClient) {}

  async listAll(): Promise<readonly UserRecord[]> {
    const rows = await this.client.select<UserRow>(
      `SELECT ${userColumns} FROM users u WHERE u.deleted_at IS NULL ORDER BY u.display_name`,
    );
    return rows.map(mapUserRow);
  }

  async listActive(): Promise<readonly UserRecord[]> {
    const rows = await this.client.select<UserRow>(
      `SELECT ${userColumns} FROM users u
       WHERE u.is_active = 1 AND u.deleted_at IS NULL ORDER BY u.display_name`,
    );
    return rows.map(mapUserRow);
  }

  /** Active or deactivated, but never a soft-deleted user. */
  async findByUsername(username: string): Promise<UserRecord | null> {
    const rows = await this.client.select<UserRow>(
      `SELECT ${userColumns} FROM users u WHERE u.username = ? AND u.deleted_at IS NULL LIMIT 1`,
      [username],
    );
    return rows[0] ? mapUserRow(rows[0]) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const rows = await this.client.select<UserRow>(
      `SELECT ${userColumns} FROM users u WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`,
      [id],
    );
    return rows[0] ? mapUserRow(rows[0]) : null;
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

  update(input: UpdateUserInput): Promise<unknown> {
    return this.client.execute(
      "UPDATE users SET display_name = ?, username = ?, role = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      [input.displayName, input.username, input.role, input.updatedAt, input.id],
    );
  }

  setActive(id: string, isActive: boolean, updatedAt: UtcIsoString | string): Promise<unknown> {
    return this.client.execute(
      "UPDATE users SET is_active = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      [isActive ? 1 : 0, updatedAt, id],
    );
  }

  setPassword(input: UserPasswordInput): Promise<unknown> {
    return this.client.execute(
      `UPDATE users SET password_hash = ?, password_algorithm = ?, password_version = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [input.passwordHash, input.passwordAlgorithm, input.passwordVersion, input.updatedAt, input.id],
    );
  }

  softDelete(id: string, deletedAt: UtcIsoString | string): Promise<unknown> {
    return this.client.execute(
      "UPDATE users SET deleted_at = ?, is_active = 0, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      [deletedAt, deletedAt, id],
    );
  }
}
