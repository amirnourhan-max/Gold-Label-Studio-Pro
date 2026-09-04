import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    const view = render(<Topbar />);
    const ui = within(view.container);
    expect(ui.getByTestId("window-drag-region")).toHaveAttribute("data-tauri-drag-region");
    expect(ui.getByRole("button", { name: "کمینه" })).toBeInTheDocument();
    expect(ui.getByRole("button", { name: "بزرگ‌نمایی" })).toBeInTheDocument();
    expect(ui.getByRole("button", { name: "بستن" })).toBeInTheDocument();
  });

  it("routes minimize, maximize and close clicks to the Tauri window API", async () => {
    const view = render(<Topbar />);
    const ui = within(view.container);

    fireEvent.click(ui.getByRole("button", { name: "کمینه" }));
    fireEvent.click(ui.getByRole("button", { name: "بزرگ‌نمایی" }));
    fireEvent.click(ui.getByRole("button", { name: "بستن" }));

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
