import type { CreateFirstAdminInput, SignInResult } from "./auth-session";

export const ACCEPTANCE_MARKER = "GLSP_ACCEPTANCE_HARNESS_V1";

const credentials: CreateFirstAdminInput = {
  displayName: "CI Administrator",
  username: "glsp_ci_admin",
  password: "GLSP-CI-Only-1405!",
  confirmation: "GLSP-CI-Only-1405!",
};

export type AcceptanceWindowMode = "auth" | "workspace";
export type AcceptanceWindowBounds = Readonly<{ width: number; height: number }>;

type FirstRunCompleteReport = Readonly<{
  marker: typeof ACCEPTANCE_MARKER;
  phase: "first-run-complete";
  initialAuth: AcceptanceWindowBounds;
  firstWorkspace: AcceptanceWindowBounds;
  signedOutAuth: AcceptanceWindowBounds;
  reauthenticatedWorkspace: AcceptanceWindowBounds;
}>;

type RestartCompleteReport = Readonly<{
  marker: typeof ACCEPTANCE_MARKER;
  phase: "restart-complete";
  initialAuth: AcceptanceWindowBounds;
  restartedWorkspace: AcceptanceWindowBounds;
}>;

type FailedReport = Readonly<{
  marker: typeof ACCEPTANCE_MARKER;
  phase: "failed";
  step: string;
  message: string;
}>;

export type AcceptanceReport = FirstRunCompleteReport | RestartCompleteReport | FailedReport;

export type AcceptanceHarnessDriver = {
  hasCredentials: boolean;
  readPreviousReport(): Promise<AcceptanceReport | null>;
  readWindowBounds(): Promise<AcceptanceWindowBounds>;
  waitForWindowMode(mode: AcceptanceWindowMode): Promise<AcceptanceWindowBounds>;
  createFirstAdmin(input: CreateFirstAdminInput): Promise<SignInResult>;
  signIn(username: string, password: string): Promise<SignInResult>;
  signOut(): void;
  writeReport(report: AcceptanceReport): Promise<void>;
  closeNormally(): Promise<void>;
};

function requireSuccess(result: SignInResult): void {
  if (!result.ok) throw new Error(result.message);
}

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

export async function runAcceptanceHarness(driver: AcceptanceHarnessDriver): Promise<void> {
  let step = "read-state";
  try {
    const previous = await driver.readPreviousReport();
    step = "read-auth-window";
    const initialAuth = await driver.readWindowBounds();

    if (previous?.phase === "first-run-complete" || driver.hasCredentials) {
      step = "restart-sign-in";
      requireSuccess(await driver.signIn(credentials.username, credentials.password));
      step = "restart-workspace";
      const restartedWorkspace = await driver.waitForWindowMode("workspace");
      step = "write-restart-report";
      await driver.writeReport({
        marker: ACCEPTANCE_MARKER,
        phase: "restart-complete",
        initialAuth,
        restartedWorkspace,
      });
      return;
    }

    step = "create-first-admin";
    requireSuccess(await driver.createFirstAdmin(credentials));
    step = "first-workspace";
    const firstWorkspace = await driver.waitForWindowMode("workspace");

    step = "sign-out";
    driver.signOut();
    step = "signed-out-auth-window";
    const signedOutAuth = await driver.waitForWindowMode("auth");

    step = "same-run-sign-in";
    requireSuccess(await driver.signIn(credentials.username, credentials.password));
    step = "reauthenticated-workspace";
    const reauthenticatedWorkspace = await driver.waitForWindowMode("workspace");

    step = "write-first-run-report";
    await driver.writeReport({
      marker: ACCEPTANCE_MARKER,
      phase: "first-run-complete",
      initialAuth,
      firstWorkspace,
      signedOutAuth,
      reauthenticatedWorkspace,
    });
  } catch (error) {
    await driver.writeReport({
      marker: ACCEPTANCE_MARKER,
      phase: "failed",
      step,
      message: errorMessage(error),
    });
    throw error;
  } finally {
    await driver.closeNormally();
  }
}
