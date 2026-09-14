import type { CreateUserInput, UpdateUserInput, UserPasswordInput, UserRecord, UserRole } from "../../types/persistence";

export type UserRoleLabel = "مدیر سیستم" | "اپراتور";
export type UserStatusLabel = "فعال" | "غیرفعال";

export type UserListItem = Readonly<{
  id: string;
  displayName: string;
  username: string;
  role: UserRole;
  roleLabel: UserRoleLabel;
  isActive: boolean;
  statusLabel: UserStatusLabel;
}>;

export type UserSnapshot = Readonly<{
  users: readonly UserListItem[];
  totalCount: number;
  activeCount: number;
}>;

export type CreateUserCommand = Readonly<{
  displayName: string;
  username: string;
  role: UserRole;
  password: string;
}>;

export type UpdateUserCommand = Readonly<{
  id: string;
  displayName: string;
  username: string;
  role: UserRole;
}>;

export type ChangePasswordCommand = Readonly<{
  id: string;
  password: string;
  confirmation: string;
}>;

export type UserGateway = Readonly<{
  list(): Promise<readonly UserRecord[]>;
  findByUsername(username: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<void>;
  update(input: UpdateUserInput): Promise<void>;
  setActive(id: string, isActive: boolean, updatedAt: string): Promise<void>;
  setPassword(input: UserPasswordInput): Promise<void>;
  softDelete(id: string, deletedAt: string): Promise<void>;
}>;

export const roleLabels: Readonly<Record<UserRole, UserRoleLabel>> = {
  admin: "مدیر سیستم",
  operator: "اپراتور",
};

export const statusLabel = (isActive: boolean): UserStatusLabel => (isActive ? "فعال" : "غیرفعال");

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

export const toPersianDigits = (value: number | string): string =>
  String(value).replace(/\d/g, digit => persianDigits[Number(digit)] ?? digit);

export const toUserListItem = (user: UserRecord): UserListItem => ({
  id: user.id,
  displayName: user.displayName,
  username: user.username,
  role: user.role,
  roleLabel: roleLabels[user.role],
  isActive: user.isActive,
  statusLabel: statusLabel(user.isActive),
});
