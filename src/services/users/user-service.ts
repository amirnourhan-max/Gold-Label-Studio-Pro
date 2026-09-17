import type { UserId, UtcIsoString, UserRole } from "../../types/persistence";
import type { PasswordHasher } from "./password-hashing";
import { PersistenceFailure, persistenceFailureMessage, type PersistenceFailureCode } from "../database/persistence-failure";
import {
  toUserListItem,
  type ChangePasswordCommand,
  type CreateUserCommand,
  type UpdateUserCommand,
  type UserGateway,
  type UserSnapshot,
} from "./user-contract";
import {
  validateCreateUser,
  validatePasswordChange,
  validateUserUpdate,
  type UserValidationIssue,
} from "./user-validation";

export type UserMutationResult =
  | Readonly<{ status: "saved"; snapshot: UserSnapshot }>
  | Readonly<{ status: "invalid"; issues: readonly UserValidationIssue[] }>
  | Readonly<{
      status: "failed";
      message: string;
      code?: PersistenceFailureCode;
      technicalDetail?: string;
    }>;

export type UserServiceEnvironment = Readonly<{
  now(): string;
  newId(): string;
}>;

const DUPLICATE_USERNAME_MESSAGE = "این نام کاربری قبلاً استفاده شده است";
const SAVE_FAILURE_MESSAGE = "ذخیره تغییرات کاربر ناموفق بود";

const isDuplicateError = (error: unknown): boolean => {
  if (error instanceof PersistenceFailure) return /UNIQUE|unique/i.test(error.detail);
  return error instanceof Error && /UNIQUE|unique/i.test(error.message);
};

export class UserService {
  constructor(
    private readonly gateway: UserGateway,
    private readonly hasher: PasswordHasher,
    private readonly environment: UserServiceEnvironment,
  ) {}

  async load(): Promise<UserSnapshot> {
    return this.buildSnapshot(await this.gateway.list());
  }

  async createUser(command: CreateUserCommand): Promise<UserMutationResult> {
    const issues = validateCreateUser(command);
    if (issues.length > 0) return { status: "invalid", issues };

    const username = command.username.trim();
    if (await this.isUsernameTaken(username)) {
      return { status: "invalid", issues: [{ field: "username", message: DUPLICATE_USERNAME_MESSAGE }] };
    }

    const password = await this.hasher.hash(command.password);
    const now = this.environment.now();

    return this.mutate(
      () => this.gateway.create({
        id: this.environment.newId() as UserId,
        displayName: command.displayName.trim(),
        username,
        role: command.role,
        passwordHash: password.hash,
        passwordAlgorithm: password.algorithm,
        passwordVersion: password.version,
        createdAt: now as UtcIsoString,
      }),
      { field: "username", message: DUPLICATE_USERNAME_MESSAGE },
    );
  }

  async updateUser(command: UpdateUserCommand): Promise<UserMutationResult> {
    const issues = validateUserUpdate(command);
    if (issues.length > 0) return { status: "invalid", issues };

    const username = command.username.trim();
    if (await this.isUsernameTaken(username, command.id)) {
      return { status: "invalid", issues: [{ field: "username", message: DUPLICATE_USERNAME_MESSAGE }] };
    }

    return this.mutate(
      () => this.gateway.update({
        id: command.id as UserId,
        displayName: command.displayName.trim(),
        username,
        role: command.role,
        updatedAt: this.environment.now() as UtcIsoString,
      }),
      { field: "username", message: DUPLICATE_USERNAME_MESSAGE },
    );
  }

  async changePassword(command: ChangePasswordCommand): Promise<UserMutationResult> {
    const issues = validatePasswordChange(command);
    if (issues.length > 0) return { status: "invalid", issues };

    const password = await this.hasher.hash(command.password);

    return this.mutate(() => this.gateway.setPassword({
      id: command.id as UserId,
      passwordHash: password.hash,
      passwordAlgorithm: password.algorithm,
      passwordVersion: password.version,
      updatedAt: this.environment.now() as UtcIsoString,
    }));
  }

  async setUserActive(id: string, isActive: boolean): Promise<UserMutationResult> {
    return this.mutate(() => this.gateway.setActive(id, isActive, this.environment.now()));
  }

  async removeUser(id: string): Promise<UserMutationResult> {
    return this.mutate(() => this.gateway.softDelete(id, this.environment.now()));
  }

  /** Runs a write plus the follow-up refresh so a failure never escapes to the UI. */
  private async mutate(
    work: () => Promise<unknown>,
    conflict?: Readonly<{ field: string; message: string }>,
  ): Promise<UserMutationResult> {
    try {
      await work();
      return { status: "saved", snapshot: await this.load() };
    } catch (error) {
      return this.failure(error, conflict);
    }
  }

  private failure(error: unknown, conflict?: Readonly<{ field: string; message: string }>): UserMutationResult {
    if (conflict && isDuplicateError(error)) {
      return { status: "invalid", issues: [conflict] };
    }
    if (error instanceof PersistenceFailure) {
      return {
        status: "failed",
        message: persistenceFailureMessage(error.code),
        code: error.code,
        technicalDetail: error.detail,
      };
    }
    return { status: "failed", message: SAVE_FAILURE_MESSAGE };
  }

  /** The unique index still protects us if the pre-check cannot read the table. */
  private async isUsernameTaken(username: string, exceptId?: string): Promise<boolean> {
    try {
      const users = await this.gateway.list();
      const normalized = username.toLowerCase();
      return users.some(user => user.id !== exceptId && user.username.trim().toLowerCase() === normalized);
    } catch {
      return false;
    }
  }

  private buildSnapshot(users: readonly Parameters<typeof toUserListItem>[0][]): UserSnapshot {
    const items = users.map(toUserListItem);
    return {
      users: items,
      totalCount: items.length,
      activeCount: items.filter(user => user.isActive).length,
    };
  }
}

export const hasRole = (role: UserRole, allowed: readonly UserRole[]): boolean => allowed.includes(role);
