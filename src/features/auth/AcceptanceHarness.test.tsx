import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthSessionContext, type AuthSessionValue } from "./auth-session";
import { ACCEPTANCE_MARKER } from "./acceptance-harness-runner";
import { AcceptanceHarness } from "./AcceptanceHarness";

const invoke = vi.fn();
const close = vi.fn(async () => undefined);
const scaleFactor = vi.fn(async () => 1);
const innerSize = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ close, innerSize, scaleFactor }),
}));

afterEach(() => {
  cleanup();
  invoke.mockReset();
  close.mockClear();
  scaleFactor.mockClear();
  innerSize.mockReset();
});

const session = (overrides: Partial<AuthSessionValue> = {}): AuthSessionValue => ({
  status: "ready",
  user: null,
  hasCredentials: false,
  preview: false,
  unavailableReason: null,
  databaseError: null,
  retryBootstrap: vi.fn(),
  createFirstAdmin: vi.fn(async () => ({ ok: true as const })),
  signIn: vi.fn(async () => ({ ok: true as const })),
  signOut: vi.fn(),
  ...overrides,
});

describe("acceptance-only AuthSession driver", () => {
  it("drives the same context methods as the First Run and Login forms", async () => {
    const value = session();
    invoke.mockImplementation(async command => command === "acceptance_read_report" ? null : undefined);
    innerSize
      .mockResolvedValueOnce({ width: 520, height: 720 })
      .mockResolvedValueOnce({ width: 1600, height: 900 })
      .mockResolvedValueOnce({ width: 520, height: 720 })
      .mockResolvedValueOnce({ width: 1600, height: 900 });

    render(
      <AuthSessionContext.Provider value={value}>
        <AcceptanceHarness />
      </AuthSessionContext.Provider>,
    );

    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(value.createFirstAdmin).toHaveBeenCalledWith({
      displayName: "CI Administrator",
      username: "glsp_ci_admin",
      password: "GLSP-CI-Only-1405!",
      confirmation: "GLSP-CI-Only-1405!",
    });
    expect(value.signOut).toHaveBeenCalledTimes(1);
    expect(value.signIn).toHaveBeenCalledWith("glsp_ci_admin", "GLSP-CI-Only-1405!");

    const written = invoke.mock.calls.find(([command]) => command === "acceptance_write_report");
    expect(written?.[1]).toMatchObject({
      report: {
        marker: ACCEPTANCE_MARKER,
        phase: "first-run-complete",
        firstWorkspace: { width: 1600, height: 900 },
        signedOutAuth: { width: 520, height: 720 },
      },
    });
  });

  it("stays dormant until the real desktop session bootstrap is ready", async () => {
    render(
      <AuthSessionContext.Provider value={session({ status: "loading" })}>
        <AcceptanceHarness />
      </AuthSessionContext.Provider>,
    );

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(invoke).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
});
