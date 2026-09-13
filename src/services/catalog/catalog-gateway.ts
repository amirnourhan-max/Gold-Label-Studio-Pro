import { CatalogRepository } from "../../repositories/catalog-repository";
import type { SqlClient, SqlValue } from "../database/sql-client";
import { MockCatalogGateway } from "./mock-catalog-gateway";
import { PersistenceCatalogGateway } from "./persistence-catalog-gateway";
import type { CatalogGateway } from "./catalog-contract";

export type { CatalogEntry, CatalogGateway } from "./catalog-contract";
export { MockCatalogGateway } from "./mock-catalog-gateway";
export { PersistenceCatalogGateway } from "./persistence-catalog-gateway";

export type CatalogGatewayMode = "persistence" | "mock";

let gatewayInstance: CatalogGateway | null = null;

/**
 * The Tauri SQL plugin only exists inside the desktop shell. Vite injects
 * TAURI_ENV_PLATFORM for Tauri builds, so its presence selects the persistence
 * gateway; every other environment (browser preview, tests) gets the
 * controlled mock fallback.
 */
export const isPersistenceAvailable = (): boolean => {
  const injected = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return typeof injected?.TAURI_ENV_PLATFORM === "string" && injected.TAURI_ENV_PLATFORM.length > 0;
};

export const catalogGatewayMode = (): CatalogGatewayMode => (isPersistenceAvailable() ? "persistence" : "mock");

/** Defers the Tauri SQL client import until the first actual database call. */
const createLazySqlClient = (open: () => Promise<SqlClient>): SqlClient => {
  let clientPromise: Promise<SqlClient> | null = null;

  const resolve = (): Promise<SqlClient> => {
    if (clientPromise === null) clientPromise = open();
    return clientPromise;
  };

  return {
    select: async <T>(sql: string, bindValues: readonly SqlValue[] = []) => (await resolve()).select<T>(sql, bindValues),
    execute: async (sql: string, bindValues: readonly SqlValue[] = []) => (await resolve()).execute(sql, bindValues),
    transaction: async <T>(work: (client: SqlClient) => Promise<T>) => (await resolve()).transaction(work),
    close: async () => (await resolve()).close(),
  } satisfies SqlClient;
};

const createPersistenceGateway = (): CatalogGateway => {
  const repository = new CatalogRepository(
    createLazySqlClient(async () => {
      const { openPersistenceDatabase } = await import("../database/database-bootstrap");
      return openPersistenceDatabase();
    }),
  );
  return new PersistenceCatalogGateway(repository);
};

export const createDefaultCatalogGateway = (): CatalogGateway => {
  if (gatewayInstance === null) {
    gatewayInstance = isPersistenceAvailable() ? createPersistenceGateway() : new MockCatalogGateway();
  }
  return gatewayInstance;
};

export const resetCatalogGatewayForTests = (): void => {
  gatewayInstance = null;
};
