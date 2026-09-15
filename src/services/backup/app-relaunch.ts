import { invoke } from "@tauri-apps/api/core";
import { isTauriEnvironment } from "../hardware/hardware-environment";

/**
 * Restarts the desktop application.
 *
 * Restoring a database replaces the file the SQL plugin already has open, so
 * the running process would keep writing through a stale connection. The
 * restore flow therefore relaunches the app instead of continuing; outside the
 * desktop shell there is nothing to relaunch.
 */
export const relaunchApplication = async (): Promise<boolean> => {
  if (!isTauriEnvironment()) return false;
  try {
    await invoke<void>("relaunch_app");
    return true;
  } catch {
    return false;
  }
};
