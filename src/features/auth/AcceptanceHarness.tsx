import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef } from "react";
import { useAuthSession } from "./auth-session";
import {
  runAcceptanceHarness,
  type AcceptanceReport,
  type AcceptanceWindowBounds,
  type AcceptanceWindowMode,
} from "./acceptance-harness-runner";

const WINDOW_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 100;

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

/**
 * CI-only driver mounted by App only in an acceptance-enabled frontend build.
 * It deliberately calls the AuthSession context methods used by LoginPage so
 * no alternate persistence or authentication path is introduced.
 */
export function AcceptanceHarness() {
  const session = useAuthSession();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || session.status !== "ready" || session.preview || session.databaseError) return;
    started.current = true;

    void runAcceptanceHarness({
      hasCredentials: session.hasCredentials,
      readPreviousReport: () => invoke<AcceptanceReport | null>("acceptance_read_report"),
      readWindowBounds,
      waitForWindowMode,
      createFirstAdmin: session.createFirstAdmin,
      signIn: session.signIn,
      signOut: session.signOut,
      writeReport: report => invoke<void>("acceptance_write_report", { report }),
      closeNormally: () => getCurrentWindow().close(),
    }).catch(error => console.error("[acceptance] internal auth flow failed", error));
  }, [session]);

  return null;
}
