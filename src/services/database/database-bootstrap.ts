import type { SqlClient } from "./sql-client";
import { TauriSqlClient } from "./tauri-sql-client";

export const persistenceDatabaseUrl = "sqlite:gold-label-studio-pro.db";

export const configureDatabaseConnection = async <Client extends SqlClient>(client: Client): Promise<Client> => {
  await client.execute("PRAGMA foreign_keys = ON");
  await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA busy_timeout = 5000");
  return client;
};

export const openPersistenceDatabase = async (): Promise<SqlClient> => {
  const client = await TauriSqlClient.open(persistenceDatabaseUrl);
  return configureDatabaseConnection(client);
};
