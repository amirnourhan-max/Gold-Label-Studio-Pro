import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import capabilities from "../../../src-tauri/capabilities/default.json";
import { Topbar } from "./Topbar";

const windowMocks = vi.hoisted(() => ({
  minimize: vi.fn().mockResolvedValue(undefined),
  toggleMaximize: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => windowMocks,
}));

describe("custom desktop titlebar", () => {
  beforeEach(() => {
    windowMocks.minimize.mockClear();
    windowMocks.toggleMaximize.mockClear();
    windowMocks.close.mockClear();
  });

  it("renders dark integrated window controls and a drag region", () => {
    render(<Topbar />);
    expect(screen.getByTestId("window-drag-region")).toHaveAttribute("data-tauri-drag-region");
    expect(screen.getByRole("button", { name: "کمینه" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "بزرگ‌نمایی" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "بستن" })).toBeInTheDocument();
  });

  it("routes minimize, maximize and close clicks to the Tauri window API", async () => {
    render(<Topbar />);

    fireEvent.click(screen.getByRole("button", { name: "کمینه" }));
    fireEvent.click(screen.getByRole("button", { name: "بزرگ‌نمایی" }));
    fireEvent.click(screen.getByRole("button", { name: "بستن" }));

    await waitFor(() => {
      expect(windowMocks.minimize).toHaveBeenCalledTimes(1);
      expect(windowMocks.toggleMaximize).toHaveBeenCalledTimes(1);
      expect(windowMocks.close).toHaveBeenCalledTimes(1);
    });
  });

  it("grants the Tauri permissions required by the window controls", () => {
    expect(capabilities.permissions).toEqual(expect.arrayContaining([
      "core:window:allow-close",
      "core:window:allow-minimize",
      "core:window:allow-toggle-maximize",
      "core:window:allow-start-dragging",
    ]));
  });
});
