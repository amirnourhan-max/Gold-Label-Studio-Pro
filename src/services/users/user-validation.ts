import type { UserRole } from "../../types/persistence";
import type { ChangePasswordCommand, CreateUserCommand, UpdateUserCommand } from "./user-contract";

export type UserValidationIssue = Readonly<{
  field: string;
  message: string;
}>;

export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_DISPLAY_NAME_LENGTH = 60;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const roles: readonly UserRole[] = ["admin", "operator"];

const profileIssues = (input: Readonly<{ displayName: string; username: string; role: UserRole }>): UserValidationIssue[] => {
  const issues: UserValidationIssue[] = [];
  const displayName = input.displayName.trim();
  const username = input.username.trim();

  if (displayName === "") {
    issues.push({ field: "displayName", message: "نام کاربر نمی‌تواند خالی باشد" });
  } else if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    issues.push({ field: "displayName", message: `نام کاربر حداکثر ${MAX_DISPLAY_NAME_LENGTH} کاراکتر است` });
  }

  if (username === "") {
    issues.push({ field: "username", message: "نام کاربری نمی‌تواند خالی باشد" });
  } else if (username.length < 3 || username.length > 32) {
    issues.push({ field: "username", message: "نام کاربری باید بین ۳ تا ۳۲ کاراکتر باشد" });
  } else if (!USERNAME_PATTERN.test(username)) {
    issues.push({ field: "username", message: "نام کاربری فقط می‌تواند شامل حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط باشد" });
  }

  if (!roles.includes(input.role)) {
    issues.push({ field: "role", message: "نقش انتخاب‌شده معتبر نیست" });
  }

  return issues;
};

const passwordIssues = (password: string): UserValidationIssue[] => {
  if (password === "") return [{ field: "password", message: "رمز عبور نمی‌تواند خالی باشد" }];
  if (password.length < MIN_PASSWORD_LENGTH) {
    return [{ field: "password", message: `رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد` }];
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return [{ field: "password", message: `رمز عبور حداکثر ${MAX_PASSWORD_LENGTH} کاراکتر است` }];
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return [{ field: "password", message: "رمز عبور باید شامل حرف و عدد باشد" }];
  }
  return [];
};

export const validateCreateUser = (command: CreateUserCommand): readonly UserValidationIssue[] => [
  ...profileIssues(command),
  ...passwordIssues(command.password),
];

export const validateUserUpdate = (command: UpdateUserCommand): readonly UserValidationIssue[] => profileIssues(command);

export const validatePasswordChange = (command: ChangePasswordCommand): readonly UserValidationIssue[] => {
  const issues = passwordIssues(command.password);
  if (issues.length > 0) return issues;
  if (command.password !== command.confirmation) {
    return [{ field: "confirmation", message: "تکرار رمز عبور مطابقت ندارد" }];
  }
  return [];
};
