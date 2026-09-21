import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef } from "react";
import { useAuthSession } from "./auth-session";
import {
  ACCEPTANCE_MARKER,
  runAcceptanceHarness,
  type AcceptanceConfig,
  type AcceptanceProgressPhase,
  type AcceptanceReport,
  type AcceptanceWindowBounds,
  type AcceptanceWindowMode,
} from "./acceptance-harness-runner";

const WINDOW_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 100;
const AUTH_READY_TIMEOUT_MS = 30_000;

const delay = (milliseconds: number): Promise<void> =>
  new Promise(resolve => globalThis.setTimeout(resolve, milliseconds));

async function readWindowBounds(): Promise<AcceptanceWindowBounds> {
  const appWindow = getCurrentWindow();
  const [physical, scaleFactor] = await Promise.all([appWindow.innerSize(), appWindow.scaleFactor()]);
  const scale = scaleFactor > 0 ? scaleFactor : 1;
  return {
    width: Math.round(physical.width / scale),
    height: Math.round(physical.height / scale),
  };
}

async function waitForWindowMode(mode: AcceptanceWindowMode): Promise<AcceptanceWindowBounds> {
  const deadline = Date.now() + WINDOW_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const current = await readWindowBounds();
    const reached = mode === "workspace" ? current.width >= 1_000 : current.width < 900;
    if (reached) return current;
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error(`window did not reach ${mode} mode within ${WINDOW_TIMEOUT_MS}ms`);
}

type SessionSnapshot = ReturnType<typeof useAuthSession>;

async function waitForAuthProvider(readSession: () => SessionSnapshot): Promise<SessionSnapshot> {
  const deadline = Date.now() + AUTH_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const session = readSession();
    if (session.status === "ready") return session;
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error(`auth provider did not become ready within ${AUTH_READY_TIMEOUT_MS}ms`);
}

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

/**
 * CI-only driver mounted by App only in an acceptance-enabled frontend build.
 * It deliberately calls the AuthSession context methods used by LoginPage so
 * no alternate persistence or authentication path is introduced.
 */
export function AcceptanceHarness() {
  const session = useAuthSession();
  const sessionRef = useRef(session);
  const started = useRef(false);
  sessionRef.current = session;

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const writeReport = (report: AcceptanceReport): Promise<void> =>
      invoke<void>("acceptance_write_report", { report });
    const writeProgress = (phase: AcceptanceProgressPhase): Promise<void> =>
      writeReport({ marker: ACCEPTANCE_MARKER, phase });

    void (async () => {
      let step = "acceptance-get-config";
      let runnerStarted = false;
      try {
        const config = await invoke<AcceptanceConfig>("acceptance_get_config");
        if (!config.enabled) return;

        step = "acceptance-enabled";
        await writeProgress("acceptance-enabled");
        step = "react-mounted";
        await writeProgress("react-mounted");

        step = "auth-provider-ready";
        const readySession = await waitForAuthProvider(() => sessionRef.current);
        await writeProgress("auth-provider-ready");
        if (readySession.preview) throw new Error("acceptance cannot run with the preview user gateway");
        if (readySession.databaseError) {
          throw new Error(`database ${readySession.databaseError.code}: ${readySession.databaseError.friendlyMessage}`);
        }
        step = "database-ready";
        await writeProgress("database-ready");

        runnerStarted = true;
        await runAcceptanceHarness({
          config,
          hasCredentials: readySession.hasCredentials,
          readWindowBounds,
          waitForWindowMode,
          createFirstAdmin: input => sessionRef.current.createFirstAdmin(input),
          signIn: (username, password) => sessionRef.current.signIn(username, password),
          signOut: () => sessionRef.current.signOut(),
          writeReport,
          writeProgress,
          closeNormally: () => getCurrentWindow().close(),
        });
      } catch (error) {
        if (runnerStarted) {
          console.error("[acceptance] internal auth flow failed", error);
          return;
        }
        try {
          await writeReport({
            marker: ACCEPTANCE_MARKER,
            phase: "failed",
            step,
            message: errorMessage(error),
          });
        } finally {
          await getCurrentWindow().close();
        }
      }
    })();
  }, []);

  return null;
}
