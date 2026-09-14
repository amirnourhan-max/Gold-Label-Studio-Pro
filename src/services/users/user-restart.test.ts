import { describe, expect, it } from "vitest";
import { InMemoryUserClient } from "../../repositories/test-support/in-memory-user-client";
import { UserRepository } from "../../repositories/user-repository";
import { AuthService, SessionStore } from "./auth-service";
import { createPasswordHasher } from "./password-hashing";
import { PersistenceUserGateway } from "./persistence-user-gateway";
import { UserService, type UserMutationResult } from "./user-service";

const hasher = createPasswordHasher({ iterations: 1_000 });

const newUser = {
  displayName: "زهرا کریمی", username: "z.karimi", role: "operator" as const, password: "GoldLabel1404",
};

/** Reusing the same client models the same SQLite file reopened after a restart. */
const openApp = (client: InMemoryUserClient, idSeed: string) => {
  const gateway = new PersistenceUserGateway(new UserRepository(client));
  const users = new UserService(gateway, hasher, { now: () => "2026-09-14T09:00:00.000Z", newId: () => idSeed });
  const session = new SessionStore();
  return { gateway, users, session, auth: new AuthService(gateway, hasher, session) };
};

const saved = (result: UserMutationResult) => {
  if (result.status !== "saved") throw new Error(`expected saved, received ${result.status}`);
  return result.snapshot;
};

describe("users restart persistence", () => {
  it("keeps a created user and authenticates after a restart", async () => {
    const client = new InMemoryUserClient();

    saved(await openApp(client, "user-zahra").users.createUser(newUser));

    // Restart: brand-new repository, gateway and services over the same rows.
    const restarted = openApp(client, "user-other");
    const snapshot = await restarted.users.load();

    expect(snapshot.totalCount).toBe(1);
    expect(snapshot.activeCount).toBe(1);
    expect(snapshot.users[0]).toMatchObject({
      displayName: "زهرا کریمی", username: "z.karimi", roleLabel: "اپراتور", statusLabel: "فعال",
    });

    const stored = client.rowsOf()[0];
    expect(stored.passwordHash).not.toContain("GoldLabel1404");
    expect(stored.passwordAlgorithm).toBe("pbkdf2-sha256");
    expect(stored.passwordVersion).toBe(1);

    expect(await restarted.auth.authenticate("z.karimi", "GoldLabel1404")).toEqual({
      status: "authenticated",
      user: { id: "user-zahra", displayName: "زهرا کریمی", username: "z.karimi", role: "operator" },
    });
    expect(restarted.session.isAuthenticated()).toBe(true);
  });

  it("keeps a changed password and retires the previous one", async () => {
    const client = new InMemoryUserClient();
    const first = openApp(client, "user-zahra");
    saved(await first.users.createUser(newUser));
    saved(await first.users.changePassword({ id: "user-zahra", password: "NewLabel1405", confirmation: "NewLabel1405" }));

    const restarted = openApp(client, "user-other");

    expect(await restarted.auth.authenticate("z.karimi", "GoldLabel1404")).toEqual({ status: "invalid-credentials" });
    expect((await restarted.auth.authenticate("z.karimi", "NewLabel1405")).status).toBe("authenticated");
  });

  it("keeps edits and refuses sign-in for a deactivated user after a restart", async () => {
    const client = new InMemoryUserClient();
    const first = openApp(client, "user-zahra");
    saved(await first.users.createUser(newUser));
    saved(await first.users.updateUser({ id: "user-zahra", displayName: "زهرا کریمی‌پور", username: "z.karimi", role: "admin" }));
    saved(await first.users.setUserActive("user-zahra", false));

    const restarted = openApp(client, "user-other");
    const snapshot = await restarted.users.load();

    expect(snapshot.users[0]).toMatchObject({
      displayName: "زهرا کریمی‌پور", roleLabel: "مدیر سیستم", statusLabel: "غیرفعال",
    });
    expect(snapshot.activeCount).toBe(0);
    expect(await restarted.auth.authenticate("z.karimi", "GoldLabel1404")).toEqual({ status: "inactive" });
    expect(restarted.session.isAuthenticated()).toBe(false);
  });

  it("keeps a soft-deleted user out of the list and out of authentication", async () => {
    const client = new InMemoryUserClient();
    const first = openApp(client, "user-zahra");
    saved(await first.users.createUser(newUser));
    saved(await first.users.removeUser("user-zahra"));

    const restarted = openApp(client, "user-other");

    expect((await restarted.users.load()).totalCount).toBe(0);
    expect(client.rowsOf()).toHaveLength(1);
    expect(client.rowsOf()[0]?.deletedAt).toBe("2026-09-14T09:00:00.000Z");
    expect(await restarted.auth.authenticate("z.karimi", "GoldLabel1404")).toEqual({ status: "invalid-credentials" });
  });

  it("surfaces the SQLite unique index as a username conflict", async () => {
    const client = new InMemoryUserClient();
    const app = openApp(client, "user-zahra");
    saved(await app.users.createUser(newUser));

    const duplicate = await openApp(client, "user-other").users.createUser({ ...newUser, displayName: "کاربر دوم" });

    expect(duplicate).toEqual({
      status: "invalid",
      issues: [{ field: "username", message: "این نام کاربری قبلاً استفاده شده است" }],
    });
    expect(client.rowsOf()).toHaveLength(1);
  });
});
