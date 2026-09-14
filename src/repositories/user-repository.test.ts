import { describe, expect, it } from "vitest";
import { UserRepository } from "./user-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";
import type { CreateUserInput } from "../types/persistence";

const userRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "user-1", displayName: "ادمین", username: "admin", role: "admin", isActive: 1,
  passwordHash: "pbkdf2-sha256$v1$600000$c2FsdA==$aGFzaA==", passwordAlgorithm: "pbkdf2-sha256", passwordVersion: 1,
  createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z", deletedAt: null,
  ...overrides,
});

describe("UserRepository", () => {
  it("accepts password hash metadata and never exposes a raw password field", async () => {
    const client = new RecordingSqlClient();

    const input: CreateUserInput = {
      id: "user-1" as CreateUserInput["id"], displayName: "Admin", username: "admin", role: "admin",
      passwordHash: "argon2id$hash", passwordAlgorithm: "argon2id", passwordVersion: 1,
      createdAt: "2026-09-10T00:00:00.000Z" as CreateUserInput["createdAt"],
    };

    await new UserRepository(client).create(input);

    expect(client.executeCalls[0]?.sql).not.toContain("password_plaintext");
    expect(client.executeCalls[0]?.bindValues).toContain("argon2id$hash");
  });

  it("maps snake_case rows into typed records with a real boolean active flag", async () => {
    const client = new RecordingSqlClient().returnsInOrder(
      [userRow()],
      [userRow({ id: "user-2", displayName: "امیر", username: "a.mohammadi", role: "operator", isActive: 0, passwordHash: null, passwordAlgorithm: null, passwordVersion: null })],
    );
    const repository = new UserRepository(client);

    const all = await repository.listAll();
    const active = await repository.listActive();

    expect(client.selectCalls[0]?.sql).toContain("deleted_at IS NULL");
    expect(client.selectCalls[1]?.sql).toContain("is_active = 1");
    expect(all[0]).toMatchObject({ id: "user-1", displayName: "ادمین", isActive: true, passwordAlgorithm: "pbkdf2-sha256" });
    expect(active[0]).toMatchObject({ isActive: false, passwordHash: null, deletedAt: null });
  });

  it("looks users up by username and id without returning soft-deleted rows", async () => {
    const client = new RecordingSqlClient().returns([userRow()]);
    const repository = new UserRepository(client);

    expect(await repository.findByUsername("admin")).toMatchObject({ id: "user-1", role: "admin" });
    expect(client.selectCalls[0]?.bindValues).toEqual(["admin"]);
    expect(client.selectCalls[0]?.sql).toContain("deleted_at IS NULL");

    expect(await repository.findById("user-1")).toMatchObject({ username: "admin" });
    expect(client.selectCalls[1]?.bindValues).toEqual(["user-1"]);
  });

  it("returns null when a user cannot be found", async () => {
    const repository = new UserRepository(new RecordingSqlClient().returns([]));

    expect(await repository.findByUsername("ghost")).toBeNull();
    expect(await repository.findById("ghost")).toBeNull();
  });

  it("updates profile fields, activation and password separately", async () => {
    const client = new RecordingSqlClient();
    const repository = new UserRepository(client);

    await repository.update({
      id: "user-1" as never, displayName: "مدیر", username: "manager", role: "admin",
      updatedAt: "2026-09-11T00:00:00.000Z" as never,
    });
    await repository.setActive("user-1", false, "2026-09-11T00:00:00.000Z");
    await repository.setPassword({
      id: "user-1" as never, passwordHash: "pbkdf2-sha256$v1$600000$c2FsdA==$aGFzaA==",
      passwordAlgorithm: "pbkdf2-sha256", passwordVersion: 1, updatedAt: "2026-09-11T00:00:00.000Z" as never,
    });

    expect(client.executeCalls[0]?.bindValues).toEqual(["مدیر", "manager", "admin", "2026-09-11T00:00:00.000Z", "user-1"]);
    expect(client.executeCalls[1]?.bindValues).toEqual([0, "2026-09-11T00:00:00.000Z", "user-1"]);
    expect(client.executeCalls[1]?.sql).toContain("is_active = ?");
    expect(client.executeCalls[2]?.bindValues).toEqual([
      "pbkdf2-sha256$v1$600000$c2FsdA==$aGFzaA==", "pbkdf2-sha256", 1, "2026-09-11T00:00:00.000Z", "user-1",
    ]);
    expect(client.executeCalls[2]?.sql).not.toContain("password_plaintext");
  });

  it("soft-deletes without issuing a destructive delete", async () => {
    const client = new RecordingSqlClient();

    await new UserRepository(client).softDelete("user-1", "2026-09-11T00:00:00.000Z");

    expect(client.executeCalls[0]?.sql).toContain("deleted_at = ?");
    expect(client.executeCalls[0]?.sql).not.toContain("DELETE FROM");
    expect(client.executeCalls[0]?.bindValues).toEqual([
      "2026-09-11T00:00:00.000Z", "2026-09-11T00:00:00.000Z", "user-1",
    ]);
  });
});
