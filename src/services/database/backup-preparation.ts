import type { SqlClient } from "./sql-client";

export const backupPreparationStages = [
  "checkpoint",
  "close-or-quiesce",
  "copy-coherent-database-set",
  "validate-copy",
  "reopen",
] as const;

export type BackupPreparationStage = (typeof backupPreparationStages)[number];

/**
 * Future backup services must follow these hooks rather than copying only the
 * SQLite primary file while WAL mode is active. This phase deliberately does
 * not read, copy, close, or restore any user data.
 */
export interface BackupPreparation {
  checkpoint(client: SqlClient): Promise<void>;
  quiesceOrClose(client: SqlClient): Promise<void>;
  validateCopiedBackup(backupPath: string): Promise<void>;
  reopen(): Promise<SqlClient>;
}
