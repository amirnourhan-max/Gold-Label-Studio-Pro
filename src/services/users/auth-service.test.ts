import { describe, expect, it } from "vitest";
import { AuthService, SessionStore, canManageUsers } from "./auth-service";
import { MockUserGateway } from "./mock-user-gateway";
import { createPasswordHasher } from "./password-hashing";
import { UserService } from "./user-service";

const hasher = createPasswordHasher({ iterations: 1_000 });

const setup = async () => {
  const gateway = new MockUserGateway();
  const users = new UserService(gateway, hasher, { now: () => "2026-09-14T09:00:00.000Z", newId: () => "user-new" });
  const session = new SessionStore();
  const auth = new AuthService(gateway, hasher, session);

  await users.createUser({ displayName: "زهرا کریمی", username: "z.karimi", role: "operator", password: "GoldLabel1404" });
  return { gateway, users, session, auth };
};

describe("AuthService", () => {
  it("authenticates a persisted user and exposes the session state", async () => {
    const { auth } = await setup();

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.currentUser()).toBeNull();

    const result = await auth.authenticate("z.karimi", "GoldLabel1404");

    expect(result).toEqual({
      status: "authenticated",
      user: { id: "user-new", displayName: "زهرا کریمی", username: "z.karimi", role: "operator" },
    });
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.currentUser()).toMatchObject({ username: "z.karimi" });
    expect(canManageUsers(auth.currentUser())).toBe(false);

    auth.signOut();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.currentUser()).toBeNull();
  });

  it("rejects wrong credentials without starting a session", async () => {
    const { auth, session } = await setup();

    expect(await auth.authenticate("z.karimi", "Wrong1404")).toEqual({ status: "invalid-credentials" });
    expect(await auth.authenticate("ghost.user", "GoldLabel1404")).toEqual({ status: "invalid-credentials" });
    expect(await auth.authenticate("", "")).toEqual({ status: "invalid-credentials" });
    expect(await auth.authenticate("  ", "GoldLabel1404")).toEqual({ status: "invalid-credentials" });
    expect(session.isAuthenticated()).toBe(false);
  });

  it("refuses users without a stored password", async () => {
    const { auth } = await setup();

    expect(await auth.authenticate("admin", "GoldLabel1404")).toEqual({ status: "invalid-credentials" });
    expect(auth.isAuthenticated()).toBe(false);
  });

  it("refuses deactivated users even with the correct password", async () => {
    const { auth, gateway, users } = await setup();
    const created = await gateway.findByUsername("z.karimi");
    await users.setUserActive(created!.id, false);

    expect(await auth.authenticate("z.karimi", "GoldLabel1404")).toEqual({ status: "inactive" });
    expect(auth.isAuthenticated()).toBe(false);
  });

  it("refuses soft-deleted users", async () => {
    const { auth, gateway, users } = await setup();
    const created = await gateway.findByUsername("z.karimi");
    await users.removeUser(created!.id);

    expect(await auth.authenticate("z.karimi", "GoldLabel1404")).toEqual({ status: "invalid-credentials" });
    expect(auth.isAuthenticated()).toBe(false);
  });

  it("honours a password change for subsequent sign-ins", async () => {
    const { auth, gateway, users } = await setup();
    const created = await gateway.findByUsername("z.karimi");

    await users.changePassword({ id: created!.id, password: "NewLabel1405", confirmation: "NewLabel1405" });

    expect(await auth.authenticate("z.karimi", "GoldLabel1404")).toEqual({ status: "invalid-credentials" });
    expect((await auth.authenticate("z.karimi", "NewLabel1405")).status).toBe("authenticated");
  });

  it("grants administration to admin accounts only", async () => {
    const { auth } = await setup();

    expect(canManageUsers(null)).toBe(false);
    expect(canManageUsers({ id: "user-1", displayName: "ادمین", username: "admin", role: "admin" })).toBe(true);
  });
});
