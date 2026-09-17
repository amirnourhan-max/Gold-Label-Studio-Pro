import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AuthSessionContext, type AuthSessionValue } from "../../features/auth/auth-session";
import { Topbar } from "./Topbar";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    minimize: vi.fn().mockResolvedValue(undefined),
    toggleMaximize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }),
}));

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

const renderTopbar = (value: AuthSessionValue) => {
  const wrap = (children: ReactNode) => (
    <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
  );
  return render(wrap(<Topbar />));
};

describe("topbar session block", () => {
  it("shows the signed-in user's name and role", () => {
    renderTopbar(
      session({
        user: { id: "u1", displayName: "مریم رضایی", username: "m.rezaei", role: "operator" },
      }),
    );

    expect(screen.getByText("مریم رضایی")).toBeInTheDocument();
    expect(screen.getByText("اپراتور")).toBeInTheDocument();
  });

  it("offers a sign-out control only when someone is signed in", () => {
    const signOut = vi.fn();
    renderTopbar(session({ user: null, signOut }));

    expect(screen.queryByRole("button", { name: "خروج از حساب" })).not.toBeInTheDocument();
  });

  it("signs out through the session service", () => {
    const signOut = vi.fn();
    renderTopbar(
      session({ user: { id: "u1", displayName: "ادمین", username: "admin", role: "admin" }, signOut }),
    );

    fireEvent.click(screen.getByRole("button", { name: "خروج از حساب" }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the approved fallback identity while no session exists", () => {
    renderTopbar(session({ user: null }));

    expect(screen.getByText("مدیر سیستم")).toBeInTheDocument();
    expect(screen.getByText("مدیر ارشد")).toBeInTheDocument();
  });
});
