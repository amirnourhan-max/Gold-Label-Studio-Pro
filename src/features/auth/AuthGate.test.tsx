import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "./AuthGate";
import { AuthSessionContext, type AuthSessionValue } from "./auth-session";

afterEach(cleanup);

const session = (overrides: Partial<AuthSessionValue> = {}): AuthSessionValue => ({
  status: "ready",
  user: null,
  hasCredentials: true,
  preview: false,
  signIn: vi.fn(async () => ({ ok: true as const })),
  signOut: vi.fn(),
  createFirstAdmin: vi.fn(async () => ({ ok: true as const })),
  ...overrides,
});

const renderGate = (value: AuthSessionValue) => {
  const wrap = (children: ReactNode) => (
    <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
  );
  return render(wrap(<AuthGate><div data-testid="workspace">workspace</div></AuthGate>));
};

describe("auth gate", () => {
  it("keeps the workspace open on the controlled preview fallback", () => {
    renderGate(session({ preview: true, hasCredentials: false }));

    expect(screen.getByTestId("workspace")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  it("waits for the persistence bootstrap before deciding", () => {
    renderGate(session({ status: "loading" }));

    expect(screen.getByTestId("auth-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
  });

  it("blocks the workspace when credentials exist but nobody is signed in", () => {
    renderGate(session({ hasCredentials: true, user: null }));

    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ورود به برنامه" })).toBeInTheDocument();
    expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
  });

  it("asks for the first administrator when the database has no credentials", () => {
    renderGate(session({ hasCredentials: false, user: null }));

    expect(screen.getByRole("heading", { name: "راه‌اندازی اولیه" })).toBeInTheDocument();
    expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
  });

  it("lets an authenticated user into the workspace", () => {
    renderGate(
      session({
        hasCredentials: true,
        user: { id: "user-admin", displayName: "ادمین", username: "admin", role: "admin" },
      }),
    );

    expect(screen.getByTestId("workspace")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });
});
