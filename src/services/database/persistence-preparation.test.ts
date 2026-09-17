import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersistenceFailure, type PersistenceStatusReport } from "./persistence-failure";

const invoke = vi.fn();
const load = vi.fn();
const diagnostics: string[] = [];
let statusResponses: PersistenceStatusReport[] = [];

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
  configDirectory: "C:\\Users\\user\\AppData\\Roaming\\com.amirnourhan.goldlabelstudiopro",
  dataDirectory: "C:\\Users\\user\\AppData\\Roaming\\com.amirnourhan.goldlabelstudiopro",
  logDirectory: "C:\\Users\\user\\AppData\\Roaming\\com.amirnourhan.goldlabelstudiopro\\logs",
  logPath: "C:\\Users\\user\\AppData\\Roaming\\com.amirnourhan.goldlabelstudiopro\\logs\\diagnostics.jsonl",
  parentExists: true,
  parentWritable: true,
  databaseExists: true,
  databaseSize: 4096,
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

beforeEach(() => {
  statusResponses = [];
  diagnostics.length = 0;
  invoke.mockImplementation(async (command: string, args?: { detail?: string }) => {
    if (command === "record_persistence_diagnostic") {
      diagnostics.push(args?.detail ?? "");
      return undefined;
    }
    const next = statusResponses.shift();
    if (!next) throw new Error("no queued persistence status");
    return next;
  });
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
    statusResponses = [failed("DB-SCHEMA", "integrity check reported: malformed")];

    const failure = (await preparePersistence().catch((error: unknown) => error)) as PersistenceFailure;

    expect(failure.code).toBe("DB-SCHEMA");
    expect(failure.detail).toContain("integrity check");
    // The real reason must also reach the diagnostic log the user can send.
    expect(diagnostics.join("\n")).toContain("integrity check reported: malformed");
  });

  it("maps an unknown status code instead of trusting it", async () => {
    useDesktopShell();
    statusResponses = [failed("something-new", "a future failure")];

    const failure = (await preparePersistence().catch((error: unknown) => error)) as PersistenceFailure;

    expect(failure.code).toBe("unknown");
    expect(failure.message).toBe("ارتباط با پایگاه داده برقرار نشد");
  });

  it("keeps a failed attempt retryable so a fixed database can start the app", async () => {
    useDesktopShell();
    statusResponses = [failed("DB-PERMISSION", "access denied"), healthy];

    await expect(preparePersistence()).rejects.toBeInstanceOf(PersistenceFailure);
    await expect(preparePersistence()).resolves.toEqual(healthy);
  });

  it("checks the database only once per run when it is healthy", async () => {
    useDesktopShell();
    statusResponses = [healthy];

    await preparePersistence();
    await preparePersistence();
    await preparePersistence();

    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("never opens a connection when preparation failed", async () => {
    useDesktopShell();
    statusResponses = [failed("DB-SCHEMA", "missing column users.username")];

    const failure = (await openPersistenceDatabase().catch((error: unknown) => error)) as PersistenceFailure;

    // The service keeps the approved message and carries the reason as a code;
    // the interface resolves the specific text from it.
    expect(failure.code).toBe("DB-SCHEMA");
    expect(failure.message).toBe("ارتباط با پایگاه داده برقرار نشد");
    expect(failure.detail).toContain("missing column");
    expect(load).not.toHaveBeenCalled();
  });

  it("records a diagnostic when the connection cannot be opened", async () => {
    useDesktopShell();
    statusResponses = [healthy];
    load.mockRejectedValue(new Error("database is locked"));

    const failure = (await openPersistenceDatabase().catch((error: unknown) => error)) as PersistenceFailure;

    expect(failure.code).toBe("DB-OPEN");
    expect(failure.detail).toBe("database is locked");
    expect(diagnostics.join("\n")).toContain("database is locked");
  });

  it("opens and configures the connection when the database is healthy", async () => {
    useDesktopShell();
    statusResponses = [healthy];
    const execute = vi.fn(async (_sql: string, _values: readonly unknown[] = []) => ({ rowsAffected: 0 }));
    const select = vi.fn(async (sql: string) =>
      sql === "PRAGMA database_list"
        ? [{ seq: 0, name: "main", file: healthy.databasePath }]
        : [],
    );
    load.mockResolvedValue({ execute, select, close: vi.fn() });

    const client = await openPersistenceDatabase();
    await client.execute("SELECT 1");

    expect(load).toHaveBeenCalledWith("sqlite:gold-label-studio-pro.db");
    expect(execute.mock.calls.map(call => call[0])).toEqual([
      "PRAGMA foreign_keys = ON",
      "PRAGMA busy_timeout = 5000",
      "SELECT 1",
    ]);
    expect(select).toHaveBeenCalledWith("PRAGMA database_list", []);
  });

  it("rejects a plugin connection that resolves to a different physical database", async () => {
    useDesktopShell();
    statusResponses = [healthy];
    load.mockResolvedValue({
      execute: vi.fn(async () => ({ rowsAffected: 0 })),
      select: vi.fn(async () => [{ seq: 0, name: "main", file: "C:\\wrong\\gold-label-studio-pro.db" }]),
      close: vi.fn(),
    });

    const failure = (await openPersistenceDatabase().catch((error: unknown) => error)) as PersistenceFailure;

    expect(failure.code).toBe("DB-PATH");
    expect(failure.detail).toContain("C:\\wrong");
    expect(diagnostics.join("\n")).toContain("DB-PATH");
  });

  it("accepts equivalent Windows paths with spaces and Persian characters", async () => {
    useDesktopShell();
    const unicodeStatus = {
      ...healthy,
      databasePath: "C:\\Users\\کاربر فارسی\\AppData\\Roaming\\Gold Label\\gold-label-studio-pro.db",
    };
    statusResponses = [unicodeStatus];
    load.mockResolvedValue({
      execute: vi.fn(async () => ({ rowsAffected: 0 })),
      select: vi.fn(async () => [{
        seq: 0,
        name: "main",
        file: "c:/Users/کاربر فارسی/AppData/Roaming/Gold Label/gold-label-studio-pro.db",
      }]),
      close: vi.fn(),
    });

    await expect(openPersistenceDatabase()).resolves.toBeDefined();
  });
});
