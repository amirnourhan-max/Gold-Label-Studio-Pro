import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "./SettingsPage";

const probe = vi.hoisted(() => vi.fn(async () => ({ ok: true, message: "ترازو پاسخ داد (8.34 گرم)" })));
const backup = vi.hoisted(() => vi.fn(async () => ({ ok: true, message: "پشتیبان‌گیری با موفقیت انجام شد", path: "D:\\b.db" })));
const listBackups = vi.hoisted(() => vi.fn(async (): Promise<readonly string[]> => []));
const restore = vi.hoisted(() => vi.fn(async () => ({ ok: true, message: "بازگردانی با موفقیت انجام شد" })));
const runAutomatic = vi.hoisted(() => vi.fn(async () => null));
const recordBackupAt = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../../services/hardware/device-probe", () => ({
  createDeviceProbeService: () => ({ probe }),
}));

vi.mock("../../services/backup/backup-service", () => ({
  createBackupService: () => ({
    backup,
    list: listBackups,
    restore,
    isDue: () => false,
    runAutomatic,
  }),
}));

vi.mock("../../services/backup/backup-state-gateway", () => ({
  createDefaultBackupStateGateway: async () => ({
    loadLastBackupAt: async () => null,
    recordBackupAt,
  }),
}));

beforeEach(() => {
  probe.mockClear();
  backup.mockClear();
  listBackups.mockClear();
  restore.mockClear();
  runAutomatic.mockClear();
  recordBackupAt.mockClear();
});

afterEach(cleanup);

describe("settings hardware actions", () => {
  it("runs a real scale probe and shows the reported result", async () => {
    render(<SettingsPage />);

    const scaleCard = screen.getByRole("region", { name: "تنظیمات ترازو" });
    fireEvent.click(within(scaleCard).getByRole("button", { name: "تست اتصال" }));

    await waitFor(() => expect(probe).toHaveBeenCalledWith("scale", expect.objectContaining({ scalePort: "COM3" })));
    expect(await within(scaleCard).findByText("ترازو پاسخ داد (8.34 گرم)")).toBeInTheDocument();
  });

  it("runs the printer and scanner probes", async () => {
    render(<SettingsPage />);

    fireEvent.click(within(screen.getByRole("region", { name: "تنظیمات پرینتر" })).getByRole("button", { name: "تست چاپ" }));
    fireEvent.click(within(screen.getByRole("region", { name: "تنظیمات اسکنر" })).getByRole("button", { name: "تست اسکن" }));

    await waitFor(() => expect(probe).toHaveBeenCalledWith("printer", expect.anything()));
    await waitFor(() => expect(probe).toHaveBeenCalledWith("scanner", expect.anything()));
  });

  it("writes a manual backup and records the completion time", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "گرفتن بکاپ" }));

    await waitFor(() => expect(backup).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("پشتیبان‌گیری با موفقیت انجام شد")).toBeInTheDocument();
    await waitFor(() => expect(recordBackupAt).toHaveBeenCalledTimes(1));
  });

  it("explains that no backup file exists instead of restoring nothing", async () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "بازیابی بکاپ" }));

    expect(await screen.findByText("هیچ فایل پشتیبانی در مسیر تعیین‌شده پیدا نشد")).toBeInTheDocument();
    expect(restore).not.toHaveBeenCalled();
  });

  it("validates and restores the newest available backup", async () => {
    listBackups.mockResolvedValueOnce(["D:\\GoldLabel\\Backups\\newest.db", "D:\\GoldLabel\\Backups\\older.db"]);
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "بازیابی بکاپ" }));

    await waitFor(() => expect(restore).toHaveBeenCalledWith("D:\\GoldLabel\\Backups\\newest.db"));
    expect(await screen.findByText("بازگردانی با موفقیت انجام شد")).toBeInTheDocument();
  });
});
