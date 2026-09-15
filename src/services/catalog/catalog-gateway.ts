import { CatalogRepository } from "../../repositories/catalog-repository";
import type { SqlClient, SqlValue } from "../database/sql-client";
import { isTauriEnvironment } from "../hardware/hardware-environment";
import { MockCatalogGateway } from "./mock-catalog-gateway";
import { PersistenceCatalogGateway } from "./persistence-catalog-gateway";
import type { CatalogGateway } from "./catalog-contract";

export type { CatalogEntry, CatalogGateway } from "./catalog-contract";
export { MockCatalogGateway } from "./mock-catalog-gateway";
export { PersistenceCatalogGateway } from "./persistence-catalog-gateway";

let gatewayInstance: CatalogGateway | null = null;

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
    // The SQL plugin only exists inside the desktop shell; every other
    // environment (browser preview, tests) gets the controlled mock fallback.
    gatewayInstance = isTauriEnvironment() ? createPersistenceGateway() : new MockCatalogGateway();
  }
  return gatewayInstance;
};

export const resetCatalogGatewayForTests = (): void => {
  gatewayInstance = null;
};
