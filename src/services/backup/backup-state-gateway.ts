import { openPersistenceDatabase } from "../database/database-bootstrap";
import { SettingsRepository } from "../../repositories/settings-repository";

/** Persists when the last successful backup happened, for the auto schedule. */
export interface BackupStateGateway {
  loadLastBackupAt(): Promise<string | null>;
  recordBackupAt(completedAt: string): Promise<void>;
}

export class PersistenceBackupStateGateway implements BackupStateGateway {
  constructor(private readonly repository: SettingsRepository) {}

  async loadLastBackupAt(): Promise<string | null> {
    const record = await this.repository.getBackupSetting();
    return record?.lastBackupAt ?? null;
  }

  async recordBackupAt(completedAt: string): Promise<void> {
    await this.repository.recordBackupAt(completedAt);
  }
}

/** Used when SQLite is unavailable; the schedule simply never claims a backup. */
export class InMemoryBackupStateGateway implements BackupStateGateway {
  private lastBackupAt: string | null = null;

  async loadLastBackupAt(): Promise<string | null> {
    return this.lastBackupAt;
  }

  async recordBackupAt(completedAt: string): Promise<void> {
    this.lastBackupAt = completedAt;
  }
}

export const createDefaultBackupStateGateway = async (): Promise<BackupStateGateway> => {
  try {
    const client = await openPersistenceDatabase();
    return new PersistenceBackupStateGateway(new SettingsRepository(client));
  } catch {
    return new InMemoryBackupStateGateway();
  }
};
