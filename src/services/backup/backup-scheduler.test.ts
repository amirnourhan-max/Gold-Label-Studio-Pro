import { describe, expect, it, vi } from "vitest";
import type { BackupOutcome } from "./backup-contract";
import {
  backupConfigFromSettings,
  createAutomaticBackupScheduler,
  type Scheduler,
} from "./backup-scheduler";
import type { BackupSettingsView } from "../settings/settings-contract";

const settingsView = (overrides: Partial<BackupSettingsView> = {}): BackupSettingsView => ({
  enabled: true,
  intervalLabel: "هر ۶ ساعت",
  destinationPath: "D:\\GoldLabel\\Backups",
  ...overrides,
});

const manualScheduler = (): { schedule: Scheduler; tick: () => void; intervals: number[]; cancelled: number } => {
  let tasks: Array<() => void> = [];
  const intervals: number[] = [];
  let cancelled = 0;

  return {
    intervals,
    get cancelled() {
      return cancelled;
    },
    // A cancelled timer must not fire anymore, like clearInterval would.
    tick: () => [...tasks].forEach(task => task()),
    schedule: (task, intervalMs) => {
      tasks.push(task);
      intervals.push(intervalMs);
      return () => {
        cancelled += 1;
        tasks = tasks.filter(item => item !== task);
      };
    },
  };
};

const createHarness = (options: {
  config?: BackupSettingsView;
  lastBackupAt?: string | null;
  outcome?: BackupOutcome | null;
  timer?: ReturnType<typeof manualScheduler>;
}) => {
  const timer = options.timer ?? manualScheduler();
  const runAutomatic = vi.fn(async () => (options.outcome === undefined ? { ok: true, message: "ok" } : options.outcome));
  const recordBackupAt = vi.fn(async () => undefined);
  const onError = vi.fn();

  const scheduler = createAutomaticBackupScheduler({
    loadConfig: async () => backupConfigFromSettings(options.config ?? settingsView()),
    loadLastBackupAt: async () => options.lastBackupAt ?? null,
    recordBackupAt,
    runAutomatic,
    scheduler: timer.schedule,
    intervalMs: 1_000,
    now: () => new Date("2026-09-15T10:00:00.000Z"),
    onError,
  });

  return { scheduler, timer, runAutomatic, recordBackupAt, onError };
};

describe("backup settings mapping", () => {
  it("maps the approved interval labels onto persisted minutes", () => {
    expect(backupConfigFromSettings(settingsView()).intervalMinutes).toBe(360);
    expect(backupConfigFromSettings(settingsView({ intervalLabel: "هر روز ساعت ۲۳:۰۰" })).intervalMinutes).toBe(1440);
  });

  it("falls back to the daily interval for an unknown label", () => {
    expect(backupConfigFromSettings(settingsView({ intervalLabel: "نامعلوم" })).intervalMinutes).toBe(1440);
  });
});

describe("automatic backup scheduler", () => {
  it("checks the schedule as soon as it starts and then on the interval", async () => {
    const harness = createHarness({});

    harness.scheduler.start();

    await vi.waitFor(() => expect(harness.runAutomatic).toHaveBeenCalledTimes(1));
    expect(harness.timer.intervals).toEqual([1_000]);

    harness.timer.tick();
    await vi.waitFor(() => expect(harness.runAutomatic).toHaveBeenCalledTimes(2));
  });

  it("records the completion time of a successful backup", async () => {
    const harness = createHarness({});

    await harness.scheduler.tick();

    expect(harness.recordBackupAt).toHaveBeenCalledWith("2026-09-15T10:00:00.000Z");
  });

  it("does nothing while automatic backup is disabled", async () => {
    const harness = createHarness({ config: settingsView({ enabled: false }) });

    expect(await harness.scheduler.tick()).toBeNull();
    expect(harness.runAutomatic).not.toHaveBeenCalled();
    expect(harness.recordBackupAt).not.toHaveBeenCalled();
  });

  it("does not record a completion when the schedule is not due", async () => {
    const harness = createHarness({ outcome: null });

    expect(await harness.scheduler.tick()).toBeNull();
    expect(harness.runAutomatic).toHaveBeenCalledTimes(1);
    expect(harness.recordBackupAt).not.toHaveBeenCalled();
  });

  it("never runs two backups at once", async () => {
    const harness = createHarness({});

    await Promise.all([harness.scheduler.tick(), harness.scheduler.tick(), harness.scheduler.tick()]);

    expect(harness.runAutomatic).toHaveBeenCalledTimes(1);
    expect(harness.recordBackupAt).toHaveBeenCalledTimes(1);
  });

  it("reports a failing backup honestly without recording it", async () => {
    const harness = createHarness({ outcome: { ok: false, message: "disk full" } });

    const outcome = await harness.scheduler.tick();

    expect(outcome).toMatchObject({ ok: false });
    expect(harness.recordBackupAt).not.toHaveBeenCalled();
  });

  it("surfaces errors raised while reading the schedule", async () => {
    const timer = manualScheduler();
    const onError = vi.fn();
    const scheduler = createAutomaticBackupScheduler({
      loadConfig: async () => {
        throw new Error("settings unavailable");
      },
      loadLastBackupAt: async () => null,
      recordBackupAt: async () => undefined,
      runAutomatic: async () => ({ ok: true, message: "unused" }),
      scheduler: timer.schedule,
      onError,
    });

    expect(await scheduler.tick()).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("stops its timer when the session ends", async () => {
    const harness = createHarness({});
    harness.scheduler.start();
    await vi.waitFor(() => expect(harness.runAutomatic).toHaveBeenCalledTimes(1));

    harness.scheduler.stop();
    expect(harness.timer.cancelled).toBe(1);

    harness.timer.tick();
    await Promise.resolve();
    expect(harness.runAutomatic).toHaveBeenCalledTimes(1); // only the initial check
  });

  it("starts only one timer even if start is called twice", () => {
    const harness = createHarness({});

    harness.scheduler.start();
    harness.scheduler.start();

    expect(harness.timer.intervals).toHaveLength(1);
  });
});
