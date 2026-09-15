import { useEffect } from "react";
import { createBackupService } from "../../services/backup/backup-service";
import { createAutomaticBackupScheduler, backupConfigFromSettings, type AutomaticBackupScheduler as Scheduler } from "../../services/backup/backup-scheduler";
import { createDefaultBackupStateGateway } from "../../services/backup/backup-state-gateway";
import { isTauriEnvironment } from "../../services/hardware/hardware-environment";
import { createDefaultSettingsGateway } from "../../services/settings/settings-gateway";

/**
 * Runs the automatic backup for the whole signed-in session, independent of the
 * Settings page. It renders nothing; when the shell unmounts (sign-out or app
 * close) the scheduler is stopped with it.
 */
export function AutomaticBackupScheduler() {
  useEffect(() => {
    // Only the desktop shell has a real file system and a live database.
    if (!isTauriEnvironment()) return;

    let stopped = false;
    let scheduler: Scheduler | null = null;

    const boot = async (): Promise<void> => {
      const service = createBackupService();
      const state = await createDefaultBackupStateGateway();
      const settings = await createDefaultSettingsGateway();
      if (stopped) return;

      scheduler = createAutomaticBackupScheduler({
        loadConfig: async () => backupConfigFromSettings((await settings.loadSettings()).backup),
        loadLastBackupAt: () => state.loadLastBackupAt(),
        recordBackupAt: completedAt => state.recordBackupAt(completedAt),
        runAutomatic: (config, lastBackupAt) => service.runAutomatic(config, lastBackupAt),
        onError: error => console.warn("automatic backup failed", error),
      });
      scheduler.start();
    };

    void boot().catch(() => undefined);

    return () => {
      stopped = true;
      scheduler?.stop();
    };
  }, []);

  return null;
}
