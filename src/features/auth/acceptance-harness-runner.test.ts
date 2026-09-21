import { describe, expect, it } from "vitest";
import {
  ACCEPTANCE_MARKER,
  runAcceptanceHarness,
  type AcceptanceHarnessDriver,
  type AcceptanceReport,
  type AcceptanceWindowMode,
} from "./acceptance-harness-runner";

const bounds = {
  auth: { width: 520, height: 720 },
  workspace: { width: 1600, height: 900 },
} as const;

const config = {
  enabled: true,
  displayName: "CI Administrator",
  username: "glsp_ci_admin",
  password: "GLSP-CI-Only-1405!",
  confirmation: "GLSP-CI-Only-1405!",
} as const;

function driver(previousReport: AcceptanceReport | null = null) {
  const events: string[] = [];
  const reports: AcceptanceReport[] = [];
  const value: AcceptanceHarnessDriver = {
    config,
    hasCredentials: previousReport !== null,
    readWindowBounds: async () => bounds.auth,
    waitForWindowMode: async (mode: AcceptanceWindowMode) => {
      events.push(`window:${mode}`);
      return bounds[mode];
    },
    createFirstAdmin: async input => {
      events.push(`create:${input.displayName}:${input.username}:${input.password}:${input.confirmation}`);
      return { ok: true };
    },
    signIn: async (username, password) => {
      events.push(`sign-in:${username}:${password}`);
      return { ok: true };
    },
    signOut: () => { events.push("sign-out"); },
    writeReport: async report => {
      reports.push(report);
      events.push(`report:${report.phase}`);
    },
    writeProgress: async phase => { events.push(`phase:${phase}`); },
    closeNormally: async () => { events.push("close"); },
  };
  return { value, events, reports };
}

describe("internal installed-app acceptance harness", () => {
  it("uses the real session API for first-admin, logout, and reauthentication", async () => {
    const harness = driver();

    await runAcceptanceHarness(harness.value);

    expect(harness.events).toEqual([
      "phase:create-admin-started",
      "create:CI Administrator:glsp_ci_admin:GLSP-CI-Only-1405!:GLSP-CI-Only-1405!",
      "phase:create-admin-complete",
      "window:workspace",
      "phase:workspace-entered",
      "sign-out",
      "window:auth",
      "phase:signed-out",
      "phase:signin-started",
      "sign-in:glsp_ci_admin:GLSP-CI-Only-1405!",
      "phase:signin-complete",
      "window:workspace",
      "report:first-run-complete",
      "close",
    ]);
    expect(harness.reports).toEqual([
      {
        marker: ACCEPTANCE_MARKER,
        phase: "first-run-complete",
        initialAuth: bounds.auth,
        firstWorkspace: bounds.workspace,
        signedOutAuth: bounds.auth,
        reauthenticatedWorkspace: bounds.workspace,
      },
    ]);
  });

  it("authenticates the persisted administrator after a real process restart", async () => {
    const firstRun: AcceptanceReport = {
      marker: ACCEPTANCE_MARKER,
      phase: "first-run-complete",
      initialAuth: bounds.auth,
      firstWorkspace: bounds.workspace,
      signedOutAuth: bounds.auth,
      reauthenticatedWorkspace: bounds.workspace,
    };
    const harness = driver(firstRun);

    await runAcceptanceHarness(harness.value);

    expect(harness.events).toEqual([
      "phase:signin-started",
      "sign-in:glsp_ci_admin:GLSP-CI-Only-1405!",
      "phase:signin-complete",
      "window:workspace",
      "phase:workspace-entered",
      "report:restart-complete",
      "close",
    ]);
    expect(harness.reports[0]).toEqual({
      marker: ACCEPTANCE_MARKER,
      phase: "restart-complete",
      initialAuth: bounds.auth,
      restartedWorkspace: bounds.workspace,
    });
  });

  it("records a deterministic failure instead of hanging the CI runner", async () => {
    const harness = driver();
    harness.value.createFirstAdmin = async () => ({
      ok: false,
      reason: "error",
      message: `database write failed for ${config.password}`,
    });

    await expect(runAcceptanceHarness(harness.value)).rejects.toThrow("database write failed");

    expect(harness.reports[0]).toMatchObject({
      marker: ACCEPTANCE_MARKER,
      phase: "failed",
      message: "database write failed for [redacted]",
    });
    expect(JSON.stringify(harness.reports)).not.toContain(config.password);
    expect(harness.events.at(-1)).toBe("close");
  });
});
