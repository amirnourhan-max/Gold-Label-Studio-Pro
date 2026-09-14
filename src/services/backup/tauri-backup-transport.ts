import { invoke } from "@tauri-apps/api/core";
import { isTauriEnvironment } from "../hardware/hardware-environment";
import type { BackupTransport } from "./backup-contract";

/** Real transport: the Rust layer performs the WAL-safe copy and validation. */
export class TauriBackupTransport implements BackupTransport {
  async validate(path: string): Promise<void> {
    await invoke<string>("backup_validate", { source: path });
  }

  async create(destinationPath: string): Promise<string> {
    return invoke<string>("backup_database", { destination: destinationPath });
  }

  async list(directory: string): Promise<readonly string[]> {
    return invoke<string[]>("backup_list", { directory });
  }

  async restore(path: string): Promise<void> {
    await invoke<string>("restore_database", { source: path });
  }
}

/** Test double: records every call and simulates a file system listing. */
export class RecordingBackupTransport implements BackupTransport {
  readonly created: string[] = [];
  readonly restored: string[] = [];
  readonly validated: string[] = [];
  files: string[] = [];
  createError: Error | null = null;
  restoreError: Error | null = null;

  async validate(path: string): Promise<void> {
    this.validated.push(path);
  }

  async create(destinationPath: string): Promise<string> {
    if (this.createError) throw this.createError;
    this.created.push(destinationPath);
    this.files = [destinationPath, ...this.files];
    return destinationPath;
  }

  async list(): Promise<readonly string[]> {
    return [...this.files];
  }

  async restore(path: string): Promise<void> {
    if (this.restoreError) throw this.restoreError;
    this.restored.push(path);
  }
}

/**
 * Preview fallback. Backup needs the desktop shell, so the service reports a
 * truthful failure instead of claiming a backup happened.
 */
export class UnavailableBackupTransport implements BackupTransport {
  async validate(): Promise<void> {
    throw new Error("پشتیبان‌گیری فقط در نسخه دسکتاپ در دسترس است");
  }

  async create(): Promise<string> {
    throw new Error("پشتیبان‌گیری فقط در نسخه دسکتاپ در دسترس است");
  }

  async list(): Promise<readonly string[]> {
    return [];
  }

  async restore(): Promise<void> {
    throw new Error("بازگردانی فقط در نسخه دسکتاپ در دسترس است");
  }
}

export const createDefaultBackupTransport = (): BackupTransport =>
  isTauriEnvironment() ? new TauriBackupTransport() : new UnavailableBackupTransport();
