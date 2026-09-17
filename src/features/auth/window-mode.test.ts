import { afterEach, describe, expect, it, vi } from "vitest";

const setSize = vi.fn(async () => undefined);
const setMinSize = vi.fn(async () => undefined);
const unmaximize = vi.fn(async () => undefined);
const center = vi.fn(async () => undefined);
const currentMonitor = vi.fn(async () => ({ size: { width: 1920, height: 1080 }, scaleFactor: 1.5 }));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ setSize, setMinSize, unmaximize, center }),
  currentMonitor: () => currentMonitor(),
}));
vi.mock("@tauri-apps/api/dpi", () => ({
  LogicalSize: class LogicalSize {
    constructor(public width: number, public height: number) {}
  },
}));

const { applyWindowMode, resetWindowModeForTests } = await import("./window-mode");

afterEach(() => {
  resetWindowModeForTests();
  setSize.mockClear();
  setMinSize.mockClear();
  unmaximize.mockClear();
  center.mockClear();
  currentMonitor.mockClear();
  currentMonitor.mockResolvedValue({ size: { width: 1920, height: 1080 }, scaleFactor: 1.5 });
  delete (globalThis as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe("native window modes", () => {
  it("fits compact auth mode to the DPI-scaled monitor and centers it", async () => {
    (globalThis as Record<string, unknown>).__TAURI_INTERNALS__ = {};

    await applyWindowMode("auth");

    expect(unmaximize).toHaveBeenCalledTimes(1);
    expect(setMinSize).toHaveBeenCalledWith(expect.objectContaining({ width: 420, height: 420 }));
    expect(setSize).toHaveBeenCalledWith(expect.objectContaining({ width: 520, height: 660 }));
    expect(center).toHaveBeenCalledTimes(1);
  });

  it("restores workspace dimensions and does not repeat the same mode", async () => {
    (globalThis as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    currentMonitor.mockResolvedValue({ size: { width: 1920, height: 1080 }, scaleFactor: 1 });

    await applyWindowMode("workspace");
    await applyWindowMode("workspace");

    expect(setMinSize).toHaveBeenCalledWith(expect.objectContaining({ width: 1024, height: 640 }));
    expect(setSize).toHaveBeenCalledWith(expect.objectContaining({ width: 1600, height: 900 }));
    expect(setSize).toHaveBeenCalledTimes(1);
  });

  it("does not call native APIs in browser preview", async () => {
    await applyWindowMode("auth");
    expect(setSize).not.toHaveBeenCalled();
  });
});
