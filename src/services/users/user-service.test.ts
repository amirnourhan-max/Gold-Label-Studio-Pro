import { describe, expect, it } from "vitest";
import { MockUserGateway } from "./mock-user-gateway";
import { createPasswordHasher } from "./password-hashing";
import { UserService, type UserMutationResult } from "./user-service";

const hasher = createPasswordHasher({ iterations: 1_000 });

const setup = () => {
  const gateway = new MockUserGateway();
  let sequence = 0;
  const service = new UserService(gateway, hasher, {
    now: () => "2026-09-14T09:00:00.000Z",
    newId: () => `user-new-${++sequence}`,
  });
  return { gateway, service };
};

const saved = (result: UserMutationResult) => {
  if (result.status !== "saved") throw new Error(`expected saved, received ${result.status}`);
  return result.snapshot;
};

const issuesOf = (result: UserMutationResult) => {
  if (result.status !== "invalid") throw new Error(`expected invalid, received ${result.status}`);
  return result.issues;
};

class FailingCreateGateway extends MockUserGateway {
  override async create(): Promise<void> {
    throw new Error("UNIQUE constraint failed: users.username");
  }
}

class FailingListGateway extends MockUserGateway {
  override async list(): Promise<never> {
    throw new Error("database is locked");
  }
}

describe("UserService", () => {
  it("loads the starter users with Persian labels and accurate counts", async () => {
    const { service } = setup();

    const snapshot = await service.load();

    expect(snapshot.totalCount).toBe(3);
    expect(snapshot.activeCount).toBe(2);
    expect(snapshot.users.map(user => [user.displayName, user.roleLabel, user.username, user.statusLabel]).sort())
      .toEqual([
        ["ادمین", "مدیر سیستم", "admin", "فعال"],
        ["امیر محمدی", "اپراتور", "a.mohammadi", "غیرفعال"],
        ["مریم رضایی", "اپراتور", "m.rezaei", "فعال"],
      ].sort());
  });

  it("creates a user with a hashed password and refreshes the list", async () => {
    const { gateway, service } = setup();

    const snapshot = saved(await service.createUser({
      displayName: "زهرا کریمی", username: "z.karimi", role: "operator", password: "GoldLabel1404",
    }));

    expect(snapshot.totalCount).toBe(4);
    const stored = await gateway.findByUsername("z.karimi");
    expect(stored?.passwordHash).not.toContain("GoldLabel1404");
    expect(stored?.passwordAlgorithm).toBe("pbkdf2-sha256");
    expect(stored?.passwordVersion).toBe(1);
    expect(stored?.passwordHash?.startsWith("pbkdf2-sha256$v1$1000$")).toBe(true);
    expect(snapshot.users.some(user => user.username === "z.karimi" && user.statusLabel === "فعال")).toBe(true);
  });

  it("rejects invalid input and duplicate usernames without persisting", async () => {
    const { service } = setup();

    expect(issuesOf(await service.createUser({
      displayName: "", username: "x", role: "operator", password: "weak",
    })).map(issue => issue.field)).toEqual(["displayName", "username", "password"]);

    const duplicate = issuesOf(await service.createUser({
      displayName: "کاربر تکراری", username: "ADMIN", role: "operator", password: "GoldLabel1404",
    }));
    expect(duplicate).toEqual([{ field: "username", message: "این نام کاربری قبلاً استفاده شده است" }]);
    expect((await service.load()).totalCount).toBe(3);
  });

  it("maps a unique-index violation from SQLite into a username conflict", async () => {
    const failing = new UserService(
      new FailingCreateGateway(),
      hasher,
      { now: () => "2026-09-14T09:00:00.000Z", newId: () => "user-x" },
    );

    const result = await failing.createUser({
      displayName: "کاربر", username: "new.user", role: "admin", password: "GoldLabel1404",
    });

    expect(issuesOf(result)).toEqual([{ field: "username", message: "این نام کاربری قبلاً استفاده شده است" }]);
  });

  it("edits a user and blocks taking another user's username", async () => {
    const { gateway, service } = setup();
    const admin = await gateway.findByUsername("admin");

    const snapshot = saved(await service.updateUser({
      id: admin!.id, displayName: "مدیر ارشد", username: "admin", role: "admin",
    }));
    expect(snapshot.users.find(user => user.id === admin!.id)).toMatchObject({
      displayName: "مدیر ارشد", username: "admin", roleLabel: "مدیر سیستم",
    });

    expect(issuesOf(await service.updateUser({
      id: admin!.id, displayName: "مدیر ارشد", username: "m.rezaei", role: "admin",
    }))).toHaveLength(1);
  });

  it("changes a password so only the new one verifies", async () => {
    const { gateway, service } = setup();
    const operator = await gateway.findByUsername("m.rezaei");

    saved(await service.changePassword({ id: operator!.id, password: "Gold1404x", confirmation: "Gold1404x" }));

    const stored = await gateway.findByUsername("m.rezaei");
    expect(await hasher.verify("Gold1404x", { hash: stored?.passwordHash ?? null, algorithm: stored?.passwordAlgorithm ?? null, version: stored?.passwordVersion ?? null })).toBe(true);
    expect(await hasher.verify("GoldLabel1404", { hash: stored?.passwordHash ?? null, algorithm: stored?.passwordAlgorithm ?? null, version: stored?.passwordVersion ?? null })).toBe(false);

    expect(issuesOf(await service.changePassword({ id: operator!.id, password: "Gold1404x", confirmation: "mismatch1" }))).toEqual([
      { field: "confirmation", message: "تکرار رمز عبور مطابقت ندارد" },
    ]);
  });

  it("activates and deactivates users through the persisted flag", async () => {
    const { gateway, service } = setup();
    const inactive = await gateway.findByUsername("a.mohammadi");

    const activated = saved(await service.setUserActive(inactive!.id, true));
    expect(activated.activeCount).toBe(3);
    expect(activated.users.find(user => user.id === inactive!.id)?.statusLabel).toBe("فعال");

    const deactivated = saved(await service.setUserActive(inactive!.id, false));
    expect(deactivated.activeCount).toBe(2);
    expect(deactivated.users.find(user => user.id === inactive!.id)?.statusLabel).toBe("غیرفعال");
  });

  it("soft-deletes a user instead of removing the row", async () => {
    const { gateway, service } = setup();
    const operator = await gateway.findByUsername("a.mohammadi");

    const snapshot = saved(await service.removeUser(operator!.id));

    expect(snapshot.totalCount).toBe(2);
    expect(snapshot.users.some(user => user.id === operator!.id)).toBe(false);
    expect(await gateway.findByUsername("a.mohammadi")).toBeNull();
  });

  it("reports a failed write without throwing", async () => {
    const failing = new UserService(
      new FailingListGateway(),
      hasher,
      { now: () => "2026-09-14T09:00:00.000Z", newId: () => "user-x" },
    );

    const result = await failing.setUserActive("user-1", false);

    expect(result).toEqual({ status: "failed", message: "ذخیره تغییرات کاربر ناموفق بود" });
  });
});
