import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SettingsSnapshot } from "../../services/settings/settings-contract";

const store = vi.hoisted(() => ({
  stored: undefined as SettingsSnapshot | undefined,
  saveCalls: [] as SettingsSnapshot[],
  loadShouldFail: false,
  saveShouldFail: false,
}));

vi.mock("../../services/settings/settings-gateway", async () => {
  const { approvedSettingsSnapshot } = await import("../../services/settings/settings-contract");
  return {
    createDefaultSettingsGateway: async () => ({
      loadSettings: async () => {
        if (store.loadShouldFail) throw new Error("settings database unavailable");
        return store.stored ?? approvedSettingsSnapshot;
      },
      saveSettings: async (snapshot: SettingsSnapshot) => {
        if (store.saveShouldFail) throw new Error("settings write failed");
        store.stored = snapshot;
        store.saveCalls.push(snapshot);
      },
    }),
  };
});

import { SettingsPage } from "./SettingsPage";

const PATH_LABEL = "مسیر ذخیره";
const SWITCH_LABEL = "فعال‌سازی بکاپ خودکار";
const APPROVED_PATH = "D:\\GoldLabel\\Backups";

afterEach(() => {
  cleanup();
  store.stored = undefined;
  store.saveCalls.length = 0;
  store.loadShouldFail = false;
  store.saveShouldFail = false;
});

const renderLoadedPage = async () => {
  render(<SettingsPage />);
  const path = await screen.findByLabelText(PATH_LABEL);
  await waitFor(() => expect(path).toHaveValue(APPROVED_PATH));
  return path;
};

describe("settings page persistence", () => {
  it("persists edits and reloads them after the page restarts", async () => {
    const path = await renderLoadedPage();

    fireEvent.change(path, { target: { value: "E:\\GoldLabel\\Backups" } });
    await waitFor(() => expect(store.stored?.backup.destinationPath).toBe("E:\\GoldLabel\\Backups"));

    fireEvent.click(screen.getByRole("switch", { name: SWITCH_LABEL }));
    await waitFor(() => expect(store.stored?.backup.enabled).toBe(false));

    // Restart the application: mount a fresh page over the same persisted store.
    cleanup();
    render(<SettingsPage />);

    await waitFor(() => expect(screen.getByLabelText(PATH_LABEL)).toHaveValue("E:\\GoldLabel\\Backups"));
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: SWITCH_LABEL })).toHaveAttribute("aria-checked", "false"),
    );
  });

  it("blocks an invalid value, reports it, and recovers once it is valid again", async () => {
    const path = await renderLoadedPage();

    fireEvent.change(path, { target: { value: "" } });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("مسیر ذخیره بکاپ"));
    expect(store.saveCalls).toHaveLength(0);

    fireEvent.change(path, { target: { value: "F:\\Backups" } });

    await waitFor(() => expect(store.stored?.backup.destinationPath).toBe("F:\\Backups"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports a load failure while keeping the approved screen usable", async () => {
    store.loadShouldFail = true;

    render(<SettingsPage />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("بارگذاری تنظیمات ذخیره‌شده ناموفق بود"),
    );
    expect(screen.getByRole("region", { name: "تنظیمات ترازو" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "بکاپ‌گیری اتوماتیک" })).toBeInTheDocument();
    expect(screen.getByLabelText(PATH_LABEL)).toHaveValue(APPROVED_PATH);
  });

  it("reports a failed save so the user knows the change was not persisted", async () => {
    const path = await renderLoadedPage();
    store.saveShouldFail = true;

    fireEvent.change(path, { target: { value: "G:\\Backups" } });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("ذخیره تنظیمات ناموفق بود"));
    expect(store.stored).toBeUndefined();
  });
});
