import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthSessionValue } from "./auth-session";
import { AuthSessionContext } from "./auth-session";
import { LoginPage } from "./LoginPage";

afterEach(cleanup);

const session = (overrides: Partial<AuthSessionValue> = {}): AuthSessionValue => ({
  status: "ready",
  user: null,
  hasCredentials: true,
  preview: false,
  databaseError: null,
  retryBootstrap: vi.fn(),
  signIn: vi.fn(async () => ({ ok: true as const })),
  signOut: vi.fn(),
  createFirstAdmin: vi.fn(async () => ({ ok: true as const })),
  ...overrides,
});

const renderLogin = (value: AuthSessionValue, mode?: "sign-in" | "first-run", initialError?: string) => {
  const wrap = (children: ReactNode) => (
    <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
  );
  return render(wrap(<LoginPage mode={mode} initialError={initialError} />));
};

const submit = (label: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name: label }));

describe("login screen", () => {
  it("signs in with the entered credentials", async () => {
    const value = session();
    renderLogin(value);

    fireEvent.change(screen.getByLabelText("نام کاربری"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("رمز عبور"), { target: { value: "secret123" } });
    submit("ورود");

    await waitFor(() => expect(value.signIn).toHaveBeenCalledWith("admin", "secret123"));
  });

  it("shows the failure message and clears the password on a wrong password", async () => {
    const value = session({
      signIn: vi.fn(async () => ({
        ok: false as const,
        reason: "invalid-credentials" as const,
        message: "نام کاربری یا رمز عبور نادرست است",
      })),
    });
    renderLogin(value);

    fireEvent.change(screen.getByLabelText("نام کاربری"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("رمز عبور"), { target: { value: "wrong" } });
    submit("ورود");

    expect(await screen.findByTestId("login-error")).toHaveTextContent("نام کاربری یا رمز عبور نادرست است");
    expect(screen.getByLabelText("رمز عبور")).toHaveValue("");
  });

  it("reports an inactive account explicitly", async () => {
    const value = session({
      signIn: vi.fn(async () => ({
        ok: false as const,
        reason: "inactive" as const,
        message: "این حساب غیرفعال شده است",
      })),
    });
    renderLogin(value);

    fireEvent.change(screen.getByLabelText("نام کاربری"), { target: { value: "a.mohammadi" } });
    fireEvent.change(screen.getByLabelText("رمز عبور"), { target: { value: "secret123" } });
    submit("ورود");

    expect(await screen.findByTestId("login-error")).toHaveTextContent("این حساب غیرفعال شده است");
  });

  it("does not expose a session when authentication is rejected", async () => {
    const signIn = vi.fn(async () => ({
      ok: false as const,
      reason: "invalid-credentials" as const,
      message: "نام کاربری یا رمز عبور نادرست است",
    }));
    const value = session({ signIn });
    renderLogin(value);

    fireEvent.change(screen.getByLabelText("نام کاربری"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("رمز عبور"), { target: { value: "wrong" } });
    submit("ورود");

    await screen.findByTestId("login-error");
    expect(value.user).toBeNull();
  });

  it("creates the first administrator on a fresh database instead of locking the app out", async () => {
    const createFirstAdmin = vi.fn(async () => ({ ok: true as const }));
    const value = session({ hasCredentials: false, createFirstAdmin });
    renderLogin(value, "first-run");

    fireEvent.change(screen.getByLabelText("نام و نام خانوادگی"), { target: { value: "ادمین" } });
    fireEvent.change(screen.getByLabelText("نام کاربری"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("رمز عبور"), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText("تکرار رمز عبور"), { target: { value: "secret123" } });
    submit("ایجاد مدیر سیستم و ورود");

    await waitFor(() =>
      expect(createFirstAdmin).toHaveBeenCalledWith({
        displayName: "ادمین",
        username: "admin",
        password: "secret123",
        confirmation: "secret123",
      }),
    );
  });

  it("shows the unusable-database reason from the session before anything is submitted", () => {
    renderLogin(session({ hasCredentials: false }), "first-run", "فایل پایگاه داده معتبر نیست");

    expect(screen.getByTestId("login-error")).toHaveTextContent("فایل پایگاه داده معتبر نیست");
  });

  it("shows first-run validation feedback without creating a session", async () => {
    const value = session({
      hasCredentials: false,
      createFirstAdmin: vi.fn(async () => ({
        ok: false as const,
        reason: "error" as const,
        message: "رمز عبور باید حداقل ۸ کاراکتر باشد",
      })),
    });
    renderLogin(value, "first-run");

    fireEvent.change(screen.getByLabelText("نام کاربری"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("رمز عبور"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("تکرار رمز عبور"), { target: { value: "x" } });
    submit("ایجاد مدیر سیستم و ورود");

    expect(await screen.findByTestId("login-error")).toHaveTextContent("رمز عبور باید حداقل ۸ کاراکتر باشد");
  });
});
