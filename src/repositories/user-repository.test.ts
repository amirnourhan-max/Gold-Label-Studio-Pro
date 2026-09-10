import { describe, expect, it } from "vitest";
import { UserRepository } from "./user-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";
import type { CreateUserInput } from "../types/persistence";

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
});
