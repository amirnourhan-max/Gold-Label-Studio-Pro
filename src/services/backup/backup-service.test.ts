import { describe, expect, it } from "vitest";
import { backupPreparationStages } from "../database/backup-preparation";
import { backupTransportStages, buildBackupFileName, joinPath, type BackupConfig } from "./backup-contract";
import { createBackupService } from "./backup-service";
import { RecordingBackupTransport } from "./tauri-backup-transport";

const config: BackupConfig = {
  enabled: true,
  intervalMinutes: 1440,
  destinationPath: "D:\\GoldLabel\\Backups",
};

const clock = (iso: string) => () => new Date(iso);

describe("backup naming", () => {
  it("builds a sortable timestamped file name", () => {
    expect(buildBackupFileName(new Date(2026, 8, 14, 23, 15, 0))).toBe(
      "gold-label-studio-pro-backup-20260914-231500.db",
    );
  });

  it("joins the destination directory with the file name", () => {
    expect(joinPath("D:\\GoldLabel\\Backups\\", "a.db")).toBe("D:\\GoldLabel\\Backups\\a.db");
    expect(joinPath("", "a.db")).toBe("a.db");
  });
});

describe("backup preparation contract", () => {
  it("performs the documented WAL-safe stages in the required order", () => {
    expect(backupTransportStages).toEqual(backupPreparationStages);
  });
});

describe("backup service", () => {
  it("writes a backup into the configured directory", async () => {
    const transport = new RecordingBackupTransport();
    const service = createBackupService({ transport, now: clock("2026-09-14T23:15:00") });

    const outcome = await service.backup(config);

    expect(outcome.ok).toBe(true);
    expect(outcome.path).toBe("D:\\GoldLabel\\Backups\\gold-label-studio-pro-backup-20260914-231500.db");
    expect(transport.created).toHaveLength(1);
  });

  it("rejects a backup request with no destination instead of guessing", async () => {
    const transport = new RecordingBackupTransport();
    const service = createBackupService({ transport });

    const outcome = await service.backup({ ...config, destinationPath: "  " });

    expect(outcome.ok).toBe(false);
    expect(outcome.message).toContain("مسیر");
    expect(transport.created).toHaveLength(0);
  });

  it("surfaces a failed copy without claiming success", async () => {
    const transport = new RecordingBackupTransport();
    transport.createError = new Error("disk full");
    const service = createBackupService({ transport });

    const outcome = await service.backup(config);

    expect(outcome.ok).toBe(false);
    expect(outcome.message).toContain("disk full");
  });

  it("lists backups through the transport", async () => {
    const transport = new RecordingBackupTransport();
    transport.files = ["b.db", "a.db"];
    const service = createBackupService({ transport });

    expect(await service.list(config)).toEqual(["b.db", "a.db"]);
  });

  it("validates the file before restoring it", async () => {
    const transport = new RecordingBackupTransport();
    const service = createBackupService({ transport });

    const outcome = await service.restore("D:\\GoldLabel\\Backups\\a.db");

    expect(outcome.ok).toBe(true);
    expect(transport.validated).toEqual(["D:\\GoldLabel\\Backups\\a.db"]);
    expect(transport.restored).toEqual(["D:\\GoldLabel\\Backups\\a.db"]);
  });

  it("refuses to restore an invalid file and never touches the live database", async () => {
    const transport = new RecordingBackupTransport();
    transport.validate = async () => {
      throw new Error("not a SQLite database file");
    };
    const service = createBackupService({ transport });

    const outcome = await service.restore("D:\\GoldLabel\\Backups\\broken.db");

    expect(outcome.ok).toBe(false);
    expect(outcome.message).toContain("not a SQLite database file");
    expect(transport.restored).toHaveLength(0);
  });

  it("reports a restore failure that happens after validation", async () => {
    const transport = new RecordingBackupTransport();
    transport.restoreError = new Error("database is locked");
    const service = createBackupService({ transport });

    const outcome = await service.restore("D:\\GoldLabel\\Backups\\a.db");

    expect(outcome.ok).toBe(false);
    expect(outcome.message).toContain("database is locked");
  });

  it("is due when nothing has ever been backed up", () => {
    const service = createBackupService({ transport: new RecordingBackupTransport() });

    expect(service.isDue(config, null)).toBe(true);
  });

  it("respects the configured interval", () => {
    const service = createBackupService({
      transport: new RecordingBackupTransport(),
      now: clock("2026-09-14T12:00:00Z"),
    });

    expect(service.isDue(config, "2026-09-14T00:30:00Z")).toBe(false); // 11.5h < 24h
    expect(service.isDue(config, "2026-09-13T10:00:00Z")).toBe(true); // 26h > 24h
  });

  it("never runs an automatic backup when the setting is disabled", async () => {
    const transport = new RecordingBackupTransport();
    const service = createBackupService({ transport });

    const outcome = await service.runAutomatic({ ...config, enabled: false }, null);

    expect(outcome).toBeNull();
    expect(transport.created).toHaveLength(0);
  });

  it("runs an automatic backup only when the interval has elapsed", async () => {
    const transport = new RecordingBackupTransport();
    const service = createBackupService({
      transport,
      now: clock("2026-09-14T12:00:00Z"),
    });

    expect(await service.runAutomatic(config, "2026-09-14T11:00:00Z")).toBeNull();
    expect(transport.created).toHaveLength(0);

    const outcome = await service.runAutomatic(config, "2026-09-13T09:00:00Z");
    expect(outcome?.ok).toBe(true);
    expect(transport.created).toHaveLength(1);
  });
});
