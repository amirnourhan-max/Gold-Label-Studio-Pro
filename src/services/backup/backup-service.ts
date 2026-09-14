import {
  buildBackupFileName,
  DEFAULT_BACKUP_INTERVAL_MINUTES,
  joinPath,
  type BackupConfig,
  type BackupOutcome,
  type BackupTransport,
} from "./backup-contract";
import { createDefaultBackupTransport } from "./tauri-backup-transport";

export type BackupServiceOptions = Readonly<{
  transport?: BackupTransport;
  now?: () => Date;
}>;

export interface BackupService {
  /** Creates a WAL-safe copy in the configured destination directory. */
  backup(config: BackupConfig): Promise<BackupOutcome>;
  /** Newest-first backups already present in the destination directory. */
  list(config: BackupConfig): Promise<readonly string[]>;
  /** Validates the file first, then replaces the live database with it. */
  restore(path: string): Promise<BackupOutcome>;
  /** True when the configured interval has elapsed since the last backup. */
  isDue(config: BackupConfig, lastBackupAt: string | null): boolean;
  /**
   * Runs an automatic backup only when it is enabled and due. Returns `null`
   * when nothing needed to happen, so callers can distinguish "skipped".
   */
  runAutomatic(config: BackupConfig, lastBackupAt: string | null): Promise<BackupOutcome | null>;
}

const message = (error: unknown): string =>
  error instanceof Error && error.message.length > 0 ? error.message : "خطای نامشخص در عملیات پشتیبان";

export const createBackupService = (options: BackupServiceOptions = {}): BackupService => {
  const transport = options.transport ?? createDefaultBackupTransport();
  const now = options.now ?? (() => new Date());

  const isDue = (config: BackupConfig, lastBackupAt: string | null): boolean => {
    if (!config.enabled) return false;
    if (!lastBackupAt) return true;
    const previous = Date.parse(lastBackupAt);
    if (!Number.isFinite(previous)) return true;
    const interval = config.intervalMinutes > 0 ? config.intervalMinutes : DEFAULT_BACKUP_INTERVAL_MINUTES;
    return now().getTime() - previous >= interval * 60_000;
  };

  const backup = async (config: BackupConfig): Promise<BackupOutcome> => {
    if (config.destinationPath.trim().length === 0) {
      return { ok: false, message: "مسیر پشتیبان‌گیری تنظیم نشده است" };
    }
    try {
      const destination = joinPath(config.destinationPath, buildBackupFileName(now()));
      const written = await transport.create(destination);
      return { ok: true, message: "پشتیبان‌گیری با موفقیت انجام شد", path: written };
    } catch (error) {
      return { ok: false, message: `پشتیبان‌گیری ناموفق بود: ${message(error)}` };
    }
  };

  return {
    backup,
    isDue,

    async list(config: BackupConfig): Promise<readonly string[]> {
      if (config.destinationPath.trim().length === 0) return [];
      try {
        return await transport.list(config.destinationPath);
      } catch {
        return [];
      }
    },

    async restore(path: string): Promise<BackupOutcome> {
      if (path.trim().length === 0) {
        return { ok: false, message: "فایلی برای بازگردانی انتخاب نشده است" };
      }
      try {
        await transport.validate(path);
      } catch (error) {
        return { ok: false, message: `فایل پشتیبان معتبر نیست: ${message(error)}` };
      }
      try {
        await transport.restore(path);
        return { ok: true, message: "بازگردانی با موفقیت انجام شد. لطفاً برنامه را دوباره باز کنید." };
      } catch (error) {
        return { ok: false, message: `بازگردانی ناموفق بود: ${message(error)}` };
      }
    },

    async runAutomatic(config: BackupConfig, lastBackupAt: string | null): Promise<BackupOutcome | null> {
      if (!isDue(config, lastBackupAt)) return null;
      return backup(config);
    },
  };
};
