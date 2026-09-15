import type { BackupConfig, BackupOutcome } from "./backup-contract";
import { DEFAULT_BACKUP_INTERVAL_MINUTES } from "./backup-contract";
import type { BackupSettingsView } from "../settings/settings-contract";
import { backupIntervalOptions } from "../settings/settings-contract";

/** The approved Settings view mapped onto the scheduling contract. */
export const backupConfigFromSettings = (backup: BackupSettingsView): BackupConfig => ({
  enabled: backup.enabled,
  intervalMinutes: backupIntervalOptions[backup.intervalLabel] ?? DEFAULT_BACKUP_INTERVAL_MINUTES,
  destinationPath: backup.destinationPath,
});

export type Scheduler = (task: () => void, intervalMs: number) => () => void;

const defaultScheduler: Scheduler = (task, intervalMs) => {
  const timer = setInterval(task, intervalMs);
  return () => clearInterval(timer);
};

/** How often the persisted schedule is re-checked while the app runs. */
export const BACKUP_SCHEDULE_CHECK_INTERVAL_MS = 60_000;

export type AutomaticBackupSchedulerDependencies = Readonly<{
  /** Reads the persisted backup settings on every check. */
  loadConfig: () => Promise<BackupConfig>;
  loadLastBackupAt: () => Promise<string | null>;
  recordBackupAt: (completedAt: string) => Promise<void>;
  /** Runs a backup only when the configured interval has elapsed. */
  runAutomatic: (config: BackupConfig, lastBackupAt: string | null) => Promise<BackupOutcome | null>;
  intervalMs?: number;
  now?: () => Date;
  scheduler?: Scheduler;
  onOutcome?: (outcome: BackupOutcome) => void;
  /** Failures are surfaced here instead of being swallowed. */
  onError?: (error: unknown) => void;
}>;

export interface AutomaticBackupScheduler {
  start(): void;
  stop(): void;
  /** One due-check. Concurrent calls share a single run, so backups never stack. */
  tick(): Promise<BackupOutcome | null>;
}

/**
 * Application-level automatic backup. It re-reads the persisted schedule on
 * every tick, respects enabled/disabled and the configured interval (the backup
 * service decides what is due), records the completion time, and never runs two
 * backups at once.
 */
export const createAutomaticBackupScheduler = (
  dependencies: AutomaticBackupSchedulerDependencies,
): AutomaticBackupScheduler => {
  const intervalMs = dependencies.intervalMs ?? BACKUP_SCHEDULE_CHECK_INTERVAL_MS;
  const now = dependencies.now ?? (() => new Date());
  const scheduler = dependencies.scheduler ?? defaultScheduler;

  let cancel: (() => void) | null = null;
  let inFlight: Promise<BackupOutcome | null> | null = null;

  const tick = async (): Promise<BackupOutcome | null> => {
    if (inFlight !== null) return inFlight;

    const run = (async (): Promise<BackupOutcome | null> => {
      try {
        const config = await dependencies.loadConfig();
        if (!config.enabled) return null;

        const lastBackupAt = await dependencies.loadLastBackupAt();
        const outcome = await dependencies.runAutomatic(config, lastBackupAt);
        if (outcome === null) return null;

        if (outcome.ok) await dependencies.recordBackupAt(now().toISOString());
        dependencies.onOutcome?.(outcome);
        return outcome;
      } catch (error) {
        dependencies.onError?.(error);
        return null;
      }
    })();

    inFlight = run;
    try {
      return await run;
    } finally {
      inFlight = null;
    }
  };

  return {
    tick,

    start(): void {
      if (cancel !== null) return;
      void tick();
      cancel = scheduler(() => void tick(), intervalMs);
    },

    stop(): void {
      cancel?.();
      cancel = null;
    },
  };
};
