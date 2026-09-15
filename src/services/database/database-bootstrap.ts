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
  await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA busy_timeout = 5000");
  return client;
};

const describe = (status: PersistenceStatusReport): string => {
  const parts = [status.error, ...status.warnings].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );
  return parts.join(" — ");
};

let preparation: Promise<void> | null = null;

/**
 * Prepares the production database before any connection is opened and reports
 * honestly when it cannot be used. A success is cached for the rest of the run;
 * a failure is not, so a retry can succeed once the cause is fixed.
 */
export const preparePersistence = (): Promise<void> => {
  if (!isTauriEnvironment()) return Promise.resolve();
  if (preparation !== null) return preparation;

  preparation = (async (): Promise<void> => {
    let status: PersistenceStatusReport;
    try {
      status = await invoke<PersistenceStatusReport>("persistence_status");
    } catch (error) {
      // The real reason is the only clue an installed build leaves behind, so it
      // is logged and carried on the error instead of being replaced by a
      // generic message.
      console.error("[persistence] the desktop database check could not run", error);
      throw new PersistenceFailure(
        "unknown",
        persistenceFailureMessage("unknown"),
        error instanceof Error ? error.message : String(error),
      );
    }

    console.info(
      `[persistence] ${status.databasePath} — tables ${status.tablesPresent}/${status.tablesExpected}, integrity ${status.integrity}`,
    );
    status.warnings.forEach(warning => console.warn(`[persistence] ${warning}`));

    if (status.initialized) return;

    const detail = describe(status) || "the database could not be prepared";
    console.error(`[persistence] ${status.errorCode ?? "unknown"}: ${detail}`);
    throw new PersistenceFailure(
      toPersistenceFailureCode(status.errorCode),
      "ارتباط با پایگاه داده برقرار نشد",
      detail,
    );
  })();

  const attempt = preparation;
  attempt.catch(() => {
    // Keep a failed attempt retryable instead of poisoning every later call.
    if (preparation === attempt) preparation = null;
  });

  return attempt;
};

export const openPersistenceDatabase = async (): Promise<SqlClient> => {
  await preparePersistence();

  try {
    const client = await TauriSqlClient.open(persistenceDatabaseUrl);
    return await configureDatabaseConnection(client);
  } catch (error) {
    if (error instanceof PersistenceFailure) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[persistence] opening ${persistenceDatabaseUrl} failed`, error);
    throw new PersistenceFailure("load-failed", persistenceFailureMessage("load-failed"), detail);
  }
};

/** Test hook: forgets that the database was already prepared. */
export const resetPersistencePreparationForTests = (): void => {
  preparation = null;
};
