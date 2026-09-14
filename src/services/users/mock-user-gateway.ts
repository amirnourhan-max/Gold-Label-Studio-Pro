import type { CreateUserInput, UpdateUserInput, UserPasswordInput, UserRecord } from "../../types/persistence";
import type { AuthGateway } from "./auth-service";
import type { UserGateway } from "./user-contract";

const createdAt = "2026-09-10T00:00:00.000Z";

const seedUser = (
  id: string,
  displayName: string,
  username: string,
  role: UserRecord["role"],
  isActive: boolean,
): UserRecord => ({
  id: id as UserRecord["id"],
  displayName,
  username,
  role,
  isActive,
  passwordHash: null,
  passwordAlgorithm: null,
  passwordVersion: null,
  createdAt: createdAt as UserRecord["createdAt"],
  updatedAt: createdAt as UserRecord["updatedAt"],
  deletedAt: null,
});

/**
 * Controlled in-memory fallback so the approved user section keeps working in
 * browser previews and tests when SQLite is unavailable. No password is ever
 * stored here, so authentication always fails safely in preview mode.
 */
export class MockUserGateway implements UserGateway, AuthGateway {
  private users: UserRecord[] = [
    seedUser("user-admin", "ادمین", "admin", "admin", true),
    seedUser("user-operator-1", "مریم رضایی", "m.rezaei", "operator", true),
    seedUser("user-operator-2", "امیر محمدی", "a.mohammadi", "operator", false),
  ];

  async list(): Promise<readonly UserRecord[]> {
    return this.visible();
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const normalized = username.trim().toLowerCase();
    return this.visible().find(user => user.username.toLowerCase() === normalized) ?? null;
  }

  async create(input: CreateUserInput): Promise<void> {
    this.users = [
      ...this.users,
      {
        id: input.id,
        displayName: input.displayName,
        username: input.username,
        role: input.role,
        isActive: true,
        passwordHash: input.passwordHash,
        passwordAlgorithm: input.passwordAlgorithm,
        passwordVersion: input.passwordVersion,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
        deletedAt: null,
      },
    ];
  }

  async update(input: UpdateUserInput): Promise<void> {
    this.users = this.users.map(user =>
      user.id === input.id
        ? {
            ...user,
            displayName: input.displayName,
            username: input.username,
            role: input.role,
            updatedAt: input.updatedAt,
          }
        : user,
    );
  }

  async setActive(id: string, isActive: boolean, updatedAt: string): Promise<void> {
    this.users = this.users.map(user =>
      user.id === id ? { ...user, isActive, updatedAt: updatedAt as UserRecord["updatedAt"] } : user,
    );
  }

  async setPassword(input: UserPasswordInput): Promise<void> {
    this.users = this.users.map(user =>
      user.id === input.id
        ? {
            ...user,
            passwordHash: input.passwordHash,
            passwordAlgorithm: input.passwordAlgorithm,
            passwordVersion: input.passwordVersion,
            updatedAt: input.updatedAt,
          }
        : user,
    );
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    this.users = this.users.map(user =>
      user.id === id
        ? { ...user, deletedAt: deletedAt as UserRecord["deletedAt"], isActive: false, updatedAt: deletedAt as UserRecord["updatedAt"] }
        : user,
    );
  }

  private visible(): readonly UserRecord[] {
    return [...this.users]
      .filter(user => user.deletedAt === null)
      .sort((left, right) => left.displayName.localeCompare(right.displayName, "fa"));
  }
}
