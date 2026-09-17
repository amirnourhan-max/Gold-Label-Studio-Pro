import { getCurrentWindow } from "@tauri-apps/api/window";

export type WindowAction = "minimize" | "maximize" | "close";

export async function runWindowAction(action: WindowAction): Promise<void> {
  try {
    const appWindow = getCurrentWindow();
    if (action === "minimize") await appWindow.minimize();
    if (action === "maximize") await appWindow.toggleMaximize();
    if (action === "close") await appWindow.close();
  } catch (error) {
    console.error(`Window action failed: ${action}`, error);
  }
}
