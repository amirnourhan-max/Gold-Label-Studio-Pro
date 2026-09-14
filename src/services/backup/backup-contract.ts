/** Persisted backup configuration as shown on the approved Settings page. */
export type BackupConfig = Readonly<{
  enabled: boolean;
  intervalMinutes: number;
  destinationPath: string;
}>;

export type BackupOutcome = Readonly<{
  ok: boolean;
  message: string;
  path?: string;
}>;

/**
 * Device-facing backup boundary. The Tauri implementation runs the WAL-safe
 * SQLite copy inside Rust; tests inject a recording implementation.
 */
export interface BackupTransport {
  /** Rejects anything that is not a healthy SQLite database. */
  validate(path: string): Promise<void>;
  /** Writes a coherent copy of the live database and returns the written path. */
  create(destinationPath: string): Promise<string>;
  /** Newest-first list of backup files inside a directory. */
  list(directory: string): Promise<readonly string[]>;
  /** Replaces the live database with a validated backup file. */
  restore(path: string): Promise<void>;
}

/**
 * Stages the desktop transport performs for every backup, in order. This is the
 * ordering the existing `backupPreparationStages` contract requires: the WAL is
 * checkpointed first, the main file plus its side files are copied while the
 * database is quiesced, and the copy is validated before it is reported as a
 * usable backup.
 */
export const backupTransportStages = [
  "checkpoint",
  "close-or-quiesce",
  "copy-coherent-database-set",
  "validate-copy",
  "reopen",
] as const;

/** The approved default schedule: daily. */
export const DEFAULT_BACKUP_INTERVAL_MINUTES = 1440;

export const BACKUP_FILE_PREFIX = "gold-label-studio-pro-backup";

/** `gold-label-studio-pro-backup-20260914-231500.db` (local time, sortable). */
export const buildBackupFileName = (now: Date): string => {
  const pad = (value: number): string => String(value).padStart(2, "0");
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
  return `${BACKUP_FILE_PREFIX}-${stamp}.db`;
};

const normalizedPath = (value: string): string => value.replace(/[\\/]+$/, "");

export const joinPath = (directory: string, fileName: string): string => {
  const base = normalizedPath(directory);
  return base.length === 0 ? fileName : `${base}\\${fileName}`;
};
