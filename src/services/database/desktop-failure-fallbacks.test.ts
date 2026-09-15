import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./database-bootstrap", () => ({
  openPersistenceDatabase: async () => {
    throw new Error("sqlite is unavailable");
  },
}));

const { createDefaultSettingsGateway } = await import("../settings/settings-gateway");
const { createDefaultTemplateGateway } = await import("../label-templates/template-gateway");
const { createDefaultPackagingGateway } = await import("../packaging/packaging-gateway");
const { createDefaultUserGateway } = await import("../users/user-gateway");
const { bootstrapAuthSession } = await import("../users/session-bootstrap");

const shell = globalThis as Record<string, unknown>;

const setDesktopShell = (present: boolean): void => {
  if (present) shell.__TAURI_INTERNALS__ = {};
  else delete shell.__TAURI_INTERNALS__;
};

afterEach(() => setDesktopShell(false));

/**
 * The in-memory gateways exist so the approved screens render in the browser
 * preview, which has no SQLite at all. Inside the desktop shell the same
 * fallback would replace a real failure with invented data (or silently accept
 * writes that never reach the database), so these tests pin the fail-closed
 * behavior that replaced it.
 */
describe("desktop database failures are never hidden behind mock data", () => {
  it("reports the settings failure instead of accepting unsaved changes", async () => {
    setDesktopShell(true);
    await expect(createDefaultSettingsGateway()).rejects.toThrow("sqlite is unavailable");
  });

  it("reports the saved-template failure instead of showing mock templates", async () => {
    setDesktopShell(true);
    await expect(createDefaultTemplateGateway()).rejects.toThrow("sqlite is unavailable");
  });

  it("keeps the settings and template mock gateways for the browser preview", async () => {
    setDesktopShell(false);

    await expect(createDefaultSettingsGateway()).resolves.toBeDefined();
    await expect(createDefaultTemplateGateway()).resolves.toBeDefined();
  });

  it("reports the packaging failure instead of opening a mock package", async () => {
    setDesktopShell(true);
    const gateway = createDefaultPackagingGateway();

    await expect(gateway.loadSession()).rejects.toThrow("sqlite is unavailable");
  });

  it("reports the user failure instead of signing in against invented users", async () => {
    setDesktopShell(true);
    await expect(createDefaultUserGateway()).rejects.toThrow("sqlite is unavailable");
  });

  it("keeps the authentication gate closed when the desktop database is unavailable", async () => {
    setDesktopShell(true);

    const session = await bootstrapAuthSession();

    expect(session.preview).toBe(false);
    expect(session.hasCredentials).toBe(false);
  });

  it("still treats a missing database as preview outside the desktop shell", async () => {
    setDesktopShell(false);

    const session = await bootstrapAuthSession();

    expect(session.preview).toBe(true);
    expect(session.hasCredentials).toBe(false);
  });
});
