import { LogicalSize } from "@tauri-apps/api/dpi";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriEnvironment } from "../../services/hardware/hardware-environment";

export type WindowMode = "auth" | "workspace";

const AUTH_MIN = { width: 420, height: 420 } as const;
const AUTH_TARGET = { width: 520, height: 720 } as const;
const WORKSPACE_MIN = { width: 1024, height: 640 } as const;
const WORKSPACE_TARGET = { width: 1600, height: 900 } as const;

let appliedMode: WindowMode | null = null;

export async function applyWindowMode(mode: WindowMode): Promise<void> {
  if (!isTauriEnvironment() || appliedMode === mode) return;

  const appWindow = getCurrentWindow();
  const monitor = await currentMonitor();
  const scale = monitor?.scaleFactor && monitor.scaleFactor > 0 ? monitor.scaleFactor : 1;
  const availableWidth = monitor ? monitor.size.width / scale : Number.POSITIVE_INFINITY;
  const availableHeight = monitor ? monitor.size.height / scale : Number.POSITIVE_INFINITY;
  const target = mode === "auth" ? AUTH_TARGET : WORKSPACE_TARGET;
  const minimum = mode === "auth" ? AUTH_MIN : WORKSPACE_MIN;
  const horizontalMargin = mode === "auth" ? 40 : 0;
  const verticalMargin = mode === "auth" ? 60 : 0;
  const width = Math.max(minimum.width, Math.min(target.width, availableWidth - horizontalMargin));
  const height = Math.max(minimum.height, Math.min(target.height, availableHeight - verticalMargin));

  await appWindow.unmaximize();
  await appWindow.setMinSize(new LogicalSize(minimum.width, minimum.height));
  await appWindow.setSize(new LogicalSize(width, height));
  await appWindow.center();
  appliedMode = mode;
}

export function resetWindowModeForTests(): void {
  appliedMode = null;
}
