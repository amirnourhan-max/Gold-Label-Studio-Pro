import { invoke } from "@tauri-apps/api/core";
import { isTauriEnvironment } from "../hardware/hardware-environment";
import {
  PersistenceFailure,
  persistenceFailureMessage,
  toPersistenceFailureCode,
  type PersistenceStatusReport,
} from "./persistence-failure";
import type { SqlClient } from "./sql-client";
import { TauriSqlClient } from "./tauri-sql-client";

export { PersistenceFailure, persistenceFailureMessage, toPersistenceFailureCode };
export type { PersistenceFailureCode, PersistenceStatusReport } from "./persistence-failure";

export const persistenceDatabaseUrl = "sqlite:gold-label-studio-pro.db";

export const configureDatabaseConnection = async <Client extends SqlClient>(client: Client): Promise<Client> => {
  await client.execute("PRAGMA foreign_keys = ON");
  // `journal_mode` returns a result row. Sending it through the plugin's
  // execute-only path is driver-dependent and was never exercised by the old
  // Rust-only release self-check. Read it through the query path instead.
  await client.select<{ journalMode: string }>("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA busy_timeout = 5000");
  return client;
};

/**
 * Best-effort: the desktop layer appends this to the diagnostic log so an
 * installed build always leaves the real reason on disk. A logging failure must
 * never replace the failure the user is looking at.
 */
export const recordPersistenceDiagnostic = (detail: string): void => {
  if (!isTauriEnvironment()) return;
  void invoke("record_persistence_diagnostic", { detail }).catch(() => undefined);
};

const describe = (status: PersistenceStatusReport): string => {
  const parts = [status.error, ...status.warnings].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );
  return parts.join(" — ");
};

let preparation: Promise<PersistenceStatusReport> | null = null;

/**
 * Prepares the production database before any connection is opened and reports
 * honestly when it cannot be used. A success is cached for the rest of the run;
 * a failure is not, so a retry can succeed once the cause is fixed.
 */
export const preparePersistence = (): Promise<PersistenceStatusReport | null> => {
  if (!isTauriEnvironment()) return Promise.resolve(null);
  if (preparation !== null) return preparation;

  preparation = (async (): Promise<PersistenceStatusReport> => {
    let status: PersistenceStatusReport;
    try {
      status = await invoke<PersistenceStatusReport>("persistence_status");
    } catch (error) {
      // The real reason is the only clue an installed build leaves behind, so it
      // is logged and carried on the error instead of being replaced by a
      // generic message.
      const detail = error instanceof Error ? error.message : String(error);
      console.error("[persistence] the desktop database check could not run", error);
      recordPersistenceDiagnostic(`DB-OPEN status check failed: ${detail}`);
      throw new PersistenceFailure("unknown", persistenceFailureMessage("unknown"), detail);
    }

    console.info(
      `[persistence] ${status.databasePath} — tables ${status.tablesPresent}/${status.tablesExpected}, integrity ${status.integrity}`,
    );
    status.warnings.forEach(warning => console.warn(`[persistence] ${warning}`));

    if (status.initialized) return status;

    const detail = describe(status) || "the database could not be prepared";
    const code = toPersistenceFailureCode(status.errorCode);
    console.error(`[persistence] ${status.errorCode ?? "unknown"}: ${detail}`);
    recordPersistenceDiagnostic(`status reports ${code}: ${detail}`);
    throw new PersistenceFailure(code, "ارتباط با پایگاه داده برقرار نشد", detail, status.logPath);
  })();

  const attempt = preparation;
  attempt.catch(() => {
    // Keep a failed attempt retryable instead of poisoning every later call.
    if (preparation === attempt) preparation = null;
  });

  return attempt;
};

export const openPersistenceDatabase = async (): Promise<SqlClient> => {
  const status = await preparePersistence();

  try {
    const databaseUrl = status?.databaseUrl ?? persistenceDatabaseUrl;
    const client = await configureDatabaseConnection(await TauriSqlClient.open(databaseUrl));

    if (status !== null) {
      const rows = await client.select<{ seq: number; name: string; file: string }>("PRAGMA database_list");
      const main = rows.find(row => row.name === "main");
      const expected = normalizedPhysicalPath(status.databasePath);
      const actual = normalizedPhysicalPath(main?.file ?? "");
      if (actual === "" || actual !== expected) {
        await client.close().catch(() => undefined);
        const detail = `DB-PATH expected ${status.databasePath}; plugin opened ${main?.file || "<unknown>"}`;
        recordPersistenceDiagnostic(detail);
        throw new PersistenceFailure("DB-PATH", persistenceFailureMessage("DB-PATH"), detail, status.logPath);
      }
    }

    return client;
  } catch (error) {
    if (error instanceof PersistenceFailure) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[persistence] opening the authoritative database failed`, error);
    recordPersistenceDiagnostic(`DB-OPEN opening the authoritative database failed: ${detail}`);
    throw new PersistenceFailure("DB-OPEN", persistenceFailureMessage("DB-OPEN"), detail, status?.logPath ?? null);
  }
};

const normalizedPhysicalPath = (value: string): string => {
  const normalized = value.trim().replace(/^\\\\\?\\/, "").replaceAll("\\", "/").replace(/\/$/, "");
  return /^[A-Za-z]:\//.test(normalized) ? normalized.toLocaleLowerCase("en-US") : normalized;
};

/** Test hook: forgets that the database was already prepared. */
export const resetPersistencePreparationForTests = (): void => {
  preparation = null;
};
