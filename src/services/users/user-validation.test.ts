import { describe, expect, it } from "vitest";
import { validateCreateUser, validatePasswordChange, validateUserUpdate } from "./user-validation";

const command = {
  displayName: "مریم رضایی",
  username: "m.rezaei",
  role: "operator" as const,
  password: "GoldLabel1404",
};

const fields = (issues: readonly { field: string }[]) => issues.map(issue => issue.field);

describe("user validation", () => {
  it("accepts a complete new user", () => {
    expect(validateCreateUser(command)).toEqual([]);
  });

  it("requires a display name and a well-formed username", () => {
    expect(fields(validateCreateUser({ ...command, displayName: "   " }))).toEqual(["displayName"]);
    expect(fields(validateCreateUser({ ...command, username: "ab" }))).toEqual(["username"]);
    expect(fields(validateCreateUser({ ...command, username: "نام کاربری" }))).toEqual(["username"]);
  });

  it("enforces a strong enough password", () => {
    expect(fields(validateCreateUser({ ...command, password: "" }))).toEqual(["password"]);
    expect(fields(validateCreateUser({ ...command, password: "short1" }))).toEqual(["password"]);
    expect(fields(validateCreateUser({ ...command, password: "onlyletters" }))).toEqual(["password"]);
    expect(fields(validateCreateUser({ ...command, password: "12345678" }))).toEqual(["password"]);
    expect(validateCreateUser({ ...command, password: "Gold1404x" })).toEqual([]);
  });

  it("validates profile updates without requiring a password", () => {
    expect(validateUserUpdate({ id: "user-1", displayName: "امیر محمدی", username: "a.mohammadi", role: "admin" })).toEqual([]);
    expect(fields(validateUserUpdate({ id: "user-1", displayName: "", username: "a.mohammadi", role: "admin" }))).toEqual(["displayName"]);
  });

  it("requires a matching confirmation for password changes", () => {
    expect(fields(validatePasswordChange({ id: "user-1", password: "Gold1404x", confirmation: "Gold1404y" }))).toEqual(["confirmation"]);
    expect(validatePasswordChange({ id: "user-1", password: "Gold1404x", confirmation: "Gold1404x" })).toEqual([]);
  });
});
