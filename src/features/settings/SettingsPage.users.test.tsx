import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MockUserGateway } from "../../services/users/mock-user-gateway";

const state = vi.hoisted(() => ({
  gateway: undefined as MockUserGateway | undefined,
  loadShouldFail: false,
}));

vi.mock("../../services/users/user-gateway", () => ({
  defaultUserService: async () => {
    const { UserService } = await import("../../services/users/user-service");
    const { createPasswordHasher } = await import("../../services/users/password-hashing");
    const { MockUserGateway } = await import("../../services/users/mock-user-gateway");
    state.gateway ??= new MockUserGateway();
    const gateway = state.gateway;

    // Explicit delegation keeps the real gateway instance (and its state) shared
    // with the assertions while letting a test force a read failure.
    const controlled = {
      list: async () => {
        if (state.loadShouldFail) throw new Error("users table unavailable");
        return gateway.list();
      },
      findByUsername: (username: string) => gateway.findByUsername(username),
      create: (input: Parameters<MockUserGateway["create"]>[0]) => gateway.create(input),
      update: (input: Parameters<MockUserGateway["update"]>[0]) => gateway.update(input),
      setActive: (id: string, isActive: boolean, updatedAt: string) => gateway.setActive(id, isActive, updatedAt),
      setPassword: (input: Parameters<MockUserGateway["setPassword"]>[0]) => gateway.setPassword(input),
      softDelete: (id: string, deletedAt: string) => gateway.softDelete(id, deletedAt),
    };

    return new UserService(controlled, createPasswordHasher({ iterations: 1_000 }), {
      now: () => "2026-09-14T09:00:00.000Z",
      newId: () => `user-new-${Math.floor(Math.random() * 1_000_000)}`,
    });
  },
}));

import { SettingsPage } from "./SettingsPage";

const usersRegion = () => screen.getByRole("region", { name: "مدیریت کاربران" });
const dialog = () => screen.getByRole("dialog");
const rowActions = (name: string) => within(usersRegion()).getByRole("button", { name: `ویرایش ${name}` });

afterEach(() => {
  cleanup();
  state.gateway = undefined;
  state.loadShouldFail = false;
});

const renderLoaded = async () => {
  render(<SettingsPage />);
  await waitFor(() => expect(within(usersRegion()).getByText("ادمین")).toBeInTheDocument());
};

const openCreateDialog = () => fireEvent.click(within(usersRegion()).getByRole("button", { name: "افزودن کاربر" }));

const fill = (label: string, value: string) => {
  const field = within(dialog()).getByLabelText(label);
  fireEvent.change(field, { target: { value } });
  return field;
};

const submit = () => fireEvent.click(within(dialog()).getByRole("button", { name: "ذخیره" }));

describe("settings user management persistence", () => {
  it("lists persisted users with real roles, usernames and statuses", async () => {
    await renderLoaded();

    const table = within(usersRegion()).getByRole("table", { name: "فهرست کاربران" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map(row => within(row).getAllByRole("cell").slice(1, 4).map(cell => cell.textContent))).toEqual([
      ["مدیر سیستم", "admin", "فعال"],
      ["اپراتور", "a.mohammadi", "غیرفعال"],
      ["اپراتور", "m.rezaei", "فعال"],
    ]);
    expect(within(table).getByText("ادمین")).toBeInTheDocument();
    expect(within(usersRegion()).getByText("۳ کاربر ثبت‌شده")).toBeInTheDocument();
  });

  it("creates a user from the approved add button and refreshes the table", async () => {
    await renderLoaded();

    openCreateDialog();
    fill("نام کاربر", "زهرا کریمی");
    fill("نام کاربری", "z.karimi");
    fill("رمز عبور", "GoldLabel1404");
    submit();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(usersRegion()).getByText("زهرا کریمی")).toBeInTheDocument();
    expect(within(usersRegion()).getByText("۴ کاربر ثبت‌شده")).toBeInTheDocument();
    expect(await state.gateway?.findByUsername("z.karimi")).toMatchObject({ role: "operator", passwordAlgorithm: "pbkdf2-sha256" });
  });

  it("reports validation problems inside the dialog and keeps it open", async () => {
    await renderLoaded();

    openCreateDialog();
    fill("نام کاربر", "زهرا کریمی");
    fill("نام کاربری", "z.karimi");
    fill("رمز عبور", "weak");
    submit();

    await waitFor(() => expect(within(dialog()).getByRole("alert")).toHaveTextContent("رمز عبور"));
    expect(within(usersRegion()).getByText("۳ کاربر ثبت‌شده")).toBeInTheDocument();

    fill("رمز عبور", "GoldLabel1404");
    submit();
    await waitFor(() => expect(within(usersRegion()).getByText("۴ کاربر ثبت‌شده")).toBeInTheDocument());
  });

  it("rejects a duplicate username taken by another user", async () => {
    await renderLoaded();

    openCreateDialog();
    fill("نام کاربر", "کاربر تکراری");
    fill("نام کاربری", "admin");
    fill("رمز عبور", "GoldLabel1404");
    submit();

    await waitFor(() => expect(within(dialog()).getByRole("alert")).toHaveTextContent("قبلاً استفاده شده است"));
  });

  it("edits a user and deactivates them through the persisted flag", async () => {
    await renderLoaded();

    fireEvent.click(rowActions("ادمین"));
    fill("نام کاربر", "مدیر ارشد");
    fireEvent.change(within(dialog()).getByLabelText("نقش"), { target: { value: "operator" } });
    fireEvent.change(within(dialog()).getByLabelText("وضعیت"), { target: { value: "inactive" } });
    submit();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const stored = await state.gateway?.findByUsername("admin");
    expect(stored).toMatchObject({ displayName: "مدیر ارشد", role: "operator", isActive: false });

    const row = within(usersRegion()).getByText("مدیر ارشد").closest("tr");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("غیرفعال")).toBeInTheDocument();
    expect(within(usersRegion()).getByText("۳ کاربر ثبت‌شده")).toBeInTheDocument();
  });

  it("activates a deactivated user again", async () => {
    await renderLoaded();

    fireEvent.click(rowActions("امیر محمدی"));
    fireEvent.change(within(dialog()).getByLabelText("وضعیت"), { target: { value: "active" } });
    submit();

    await waitFor(() => expect(within(usersRegion()).getByText("۳ کاربر ثبت‌شده")).toBeInTheDocument());
    expect(await state.gateway?.findByUsername("a.mohammadi")).toMatchObject({ isActive: true });
  });

  it("changes a password with confirmation", async () => {
    await renderLoaded();

    fireEvent.click(within(usersRegion()).getByRole("button", { name: "تعویض رمز مریم رضایی" }));
    fill("رمز عبور", "NewLabel1405");
    fill("تکرار رمز عبور", "NewLabel1405");
    submit();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const stored = await state.gateway?.findByUsername("m.rezaei");
    expect(stored?.passwordHash).not.toContain("NewLabel1405");
    expect(stored?.passwordHash?.startsWith("pbkdf2-sha256$v1$1000$")).toBe(true);
  });

  it("blocks a password change when the confirmation does not match", async () => {
    await renderLoaded();

    fireEvent.click(within(usersRegion()).getByRole("button", { name: "تعویض رمز مریم رضایی" }));
    fill("رمز عبور", "NewLabel1405");
    fill("تکرار رمز عبور", "NewLabel1406");
    submit();

    await waitFor(() => expect(within(dialog()).getByRole("alert")).toHaveTextContent("تکرار رمز عبور مطابقت ندارد"));
    expect(await state.gateway?.findByUsername("m.rezaei")).toMatchObject({ passwordHash: null });
  });

  it("soft-deletes a user so the row disappears from the active list", async () => {
    await renderLoaded();

    fireEvent.click(within(usersRegion()).getByRole("button", { name: "حذف امیر محمدی" }));

    await waitFor(() => expect(within(usersRegion()).queryByText("امیر محمدی")).not.toBeInTheDocument());
    expect(within(usersRegion()).getByText("۲ کاربر ثبت‌شده")).toBeInTheDocument();
    expect(await state.gateway?.findByUsername("a.mohammadi")).toBeNull();
  });

  it("reports a load failure and an empty account list", async () => {
    state.loadShouldFail = true;
    render(<SettingsPage />);

    await waitFor(() => expect(within(usersRegion()).getByRole("alert")).toHaveTextContent("بارگذاری فهرست کاربران ناموفق بود"));
    expect(within(usersRegion()).getByText("۰ کاربر ثبت‌شده")).toBeInTheDocument();

    cleanup();
    state.loadShouldFail = false;
    state.gateway = new MockUserGateway();
    for (const username of ["admin", "m.rezaei", "a.mohammadi"]) {
      const stored = await state.gateway.findByUsername(username);
      if (stored) await state.gateway.softDelete(stored.id, "2026-09-14T09:00:00.000Z");
    }


    render(<SettingsPage />);
    await waitFor(() => expect(within(usersRegion()).getByText("هیچ کاربری ثبت نشده است")).toBeInTheDocument());
    expect(within(usersRegion()).getByText("۰ کاربر ثبت‌شده")).toBeInTheDocument();
  });
});
