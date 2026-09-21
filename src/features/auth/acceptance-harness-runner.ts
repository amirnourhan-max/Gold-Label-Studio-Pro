import type { CreateFirstAdminInput, SignInResult } from "./auth-session";

export const ACCEPTANCE_MARKER = "GLSP_ACCEPTANCE_HARNESS_V1";

export type AcceptanceConfig = Readonly<CreateFirstAdminInput & { enabled: boolean }>;

export type AcceptanceProgressPhase =
  | "acceptance-enabled"
  | "react-mounted"
  | "auth-provider-ready"
  | "database-ready"
  | "create-admin-started"
  | "create-admin-complete"
  | "workspace-entered"
  | "signed-out"
  | "signin-started"
  | "signin-complete";

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

type ProgressReport = Readonly<{
  marker: typeof ACCEPTANCE_MARKER;
  phase: AcceptanceProgressPhase;
}>;

export type AcceptanceReport = FirstRunCompleteReport | RestartCompleteReport | FailedReport | ProgressReport;

export type AcceptanceHarnessDriver = {
  config: AcceptanceConfig;
  hasCredentials: boolean;
  readWindowBounds(): Promise<AcceptanceWindowBounds>;
  waitForWindowMode(mode: AcceptanceWindowMode): Promise<AcceptanceWindowBounds>;
  createFirstAdmin(input: CreateFirstAdminInput): Promise<SignInResult>;
  signIn(username: string, password: string): Promise<SignInResult>;
  signOut(): void;
  writeReport(report: AcceptanceReport): Promise<void>;
  writeProgress(phase: AcceptanceProgressPhase): Promise<void>;
  closeNormally(): Promise<void>;
};

function requireSuccess(result: SignInResult): void {
  if (!result.ok) throw new Error(result.message);
}

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

const sanitizedErrorMessage = (error: unknown, config: AcceptanceConfig): string => {
  const secrets = [config.password, config.confirmation].filter(value => value.length > 0);
  return secrets.reduce((message, secret) => message.replaceAll(secret, "[redacted]"), errorMessage(error));
};

export async function runAcceptanceHarness(driver: AcceptanceHarnessDriver): Promise<void> {
  const credentials: CreateFirstAdminInput = {
    displayName: driver.config.displayName,
    username: driver.config.username,
    password: driver.config.password,
    confirmation: driver.config.confirmation,
  };
  let step = "read-auth-window";
  try {
    const initialAuth = await driver.readWindowBounds();

    if (driver.hasCredentials) {
      step = "signin-started";
      await driver.writeProgress("signin-started");
      requireSuccess(await driver.signIn(credentials.username, credentials.password));
      step = "signin-complete";
      await driver.writeProgress("signin-complete");
      step = "restart-workspace";
      const restartedWorkspace = await driver.waitForWindowMode("workspace");
      await driver.writeProgress("workspace-entered");
      step = "write-restart-report";
      await driver.writeReport({
        marker: ACCEPTANCE_MARKER,
        phase: "restart-complete",
        initialAuth,
        restartedWorkspace,
      });
      return;
    }

    step = "create-admin-started";
    await driver.writeProgress("create-admin-started");
    requireSuccess(await driver.createFirstAdmin(credentials));
    step = "create-admin-complete";
    await driver.writeProgress("create-admin-complete");
    step = "first-workspace";
    const firstWorkspace = await driver.waitForWindowMode("workspace");
    await driver.writeProgress("workspace-entered");

    step = "sign-out";
    driver.signOut();
    step = "signed-out-auth-window";
    const signedOutAuth = await driver.waitForWindowMode("auth");
    await driver.writeProgress("signed-out");

    step = "signin-started";
    await driver.writeProgress("signin-started");
    requireSuccess(await driver.signIn(credentials.username, credentials.password));
    step = "signin-complete";
    await driver.writeProgress("signin-complete");
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
      message: sanitizedErrorMessage(error, driver.config),
    });
    throw error;
  } finally {
    await driver.closeNormally();
  }
}
