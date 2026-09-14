/**
 * Environment detection shared by the hardware service layer. The Tauri SQL
 * plugin only exists inside the desktop shell; Vite injects TAURI_ENV_PLATFORM
 * for Tauri builds, so hardware transports are only constructed there.
 */
export const isTauriEnvironment = (): boolean => {
  const injected = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return typeof injected?.TAURI_ENV_PLATFORM === "string" && injected.TAURI_ENV_PLATFORM.length > 0;
};