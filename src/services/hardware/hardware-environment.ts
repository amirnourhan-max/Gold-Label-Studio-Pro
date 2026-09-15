/**
 * Environment detection shared by the hardware service layer. The Tauri SQL
 * plugin and the hardware commands only exist inside the desktop shell.
 *
 * Two signals are accepted, because a false negative here would disable every
 * device/backup path in a packaged build:
 *   - the `__TAURI_INTERNALS__` runtime global the shell always injects, which
 *     is also what the product/returns persistence runtimes rely on;
 *   - the build-time `TAURI_ENV_PLATFORM` flag Vite exposes for Tauri builds
 *     (`envPrefix` in vite.config.ts).
 */
export const isTauriEnvironment = (): boolean => {
  if ("__TAURI_INTERNALS__" in globalThis) return true;
  const injected = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return typeof injected?.TAURI_ENV_PLATFORM === "string" && injected.TAURI_ENV_PLATFORM.length > 0;
};
