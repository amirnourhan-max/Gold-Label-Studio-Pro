import { afterEach, describe, expect, it, vi } from "vitest";
import { PersistenceFailure, type PersistenceStatusReport } from "./persistence-failure";

const invoke = vi.fn();
const load = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
vi.mock("@tauri-apps/plugin-sql", () => ({ default: { load: (...args: unknown[]) => load(...args) } }));

const {
  openPersistenceDatabase,
  preparePersistence,
  resetPersistencePreparationForTests,
} = await import("./database-bootstrap");

const shell = globalThis as Record<string, unknown>;

const healthy: PersistenceStatusReport = {
  databaseUrl: "sqlite:gold-label-studio-pro.db",
  databasePath: "C:\\Users\\user\\AppData\\Roaming\\com.amirnourhan.goldlabelstudiopro\\gold-label-studio-pro.db",
  directory: "C:\\Users\\user\\AppData\\Roaming\\com.amirnourhan.goldlabelstudiopro",
  initialized: true,
  createdFile: true,
  appliedSchema: true,
  tablesPresent: 16,
  tablesExpected: 16,
  integrity: "ok",
  recordedSqlxMigrations: [],
  warnings: [],
  errorCode: null,
  error: null,
};

const failed = (errorCode: string, error: string): PersistenceStatusReport => ({
  ...healthy,
  initialized: false,
  appliedSchema: false,
  errorCode,
  error,
});

afterEach(() => {
  delete shell.__TAURI_INTERNALS__;
  resetPersistencePreparationForTests();
  invoke.mockReset();
  load.mockReset();
});

const useDesktopShell = (): void => {
  shell.__TAURI_INTERNALS__ = {};
};

describe("persistence preparation", () => {
  it("does nothing outside the desktop shell", async () => {
    await preparePersistence();

    expect(invoke).not.toHaveBeenCalled();
  });

  it("reports the real reason when the database cannot be used", async () => {
    useDesktopShell();
    invoke.mockResolvedValue(failed("database-corrupt", "integrity check reported: malformed"));

    const failure = await preparePersistence().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PersistenceFailure);
    expect((failure as PersistenceFailure).code).toBe("database-corrupt");
    expect((failure as PersistenceFailure).detail).toContain("integrity check");
  });

  it("maps an unknown status code instead of trusting it", async () => {
    useDesktopShell();
    invoke.mockResolvedValue(failed("something-new", "a future failure"));

    const failure = (await preparePersistence().catch((error: unknown) => error)) as PersistenceFailure;

    expect(failure.code).toBe("unknown");
    expect(failure.message).toBe("ارتباط با پایگاه داده برقرار نشد");
  });

  it("keeps a failed attempt retryable so a fixed database can start the app", async () => {
    useDesktopShell();
    invoke.mockResolvedValueOnce(failed("database-not-writable", "access denied"));
    await expect(preparePersistence()).rejects.toBeInstanceOf(PersistenceFailure);

    invoke.mockResolvedValueOnce(healthy);
    await expect(preparePersistence()).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("checks the database only once per run when it is healthy", async () => {
    useDesktopShell();
    invoke.mockResolvedValue(healthy);

    await preparePersistence();
    await preparePersistence();
    await preparePersistence();

    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("never opens a connection when preparation failed", async () => {
    useDesktopShell();
    invoke.mockResolvedValue(failed("schema-incompatible", "missing column users.username"));

    const failure = (await openPersistenceDatabase().catch((error: unknown) => error)) as PersistenceFailure;

    // The service keeps the approved message and carries the reason as a code;
    // the interface resolves the specific text from it.
    expect(failure.code).toBe("schema-incompatible");
    expect(failure.message).toBe("ارتباط با پایگاه داده برقرار نشد");
    expect(failure.detail).toContain("missing column");
    expect(load).not.toHaveBeenCalled();
  });

  it("opens and configures the connection when the database is healthy", async () => {
    useDesktopShell();
    invoke.mockResolvedValue(healthy);
    const execute = vi.fn(async (_sql: string, _values: readonly unknown[] = []) => ({ rowsAffected: 0 }));
    load.mockResolvedValue({ execute, select: vi.fn(), close: vi.fn() });

    const client = await openPersistenceDatabase();
    await client.execute("SELECT 1");

    expect(load).toHaveBeenCalledWith("sqlite:gold-label-studio-pro.db");
    expect(execute.mock.calls.map(call => call[0])).toEqual([
      "PRAGMA foreign_keys = ON",
      "PRAGMA journal_mode = WAL",
      "PRAGMA busy_timeout = 5000",
      "SELECT 1",
    ]);
  });
});
