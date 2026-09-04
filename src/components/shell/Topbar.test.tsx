import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import capabilities from "../../../src-tauri/capabilities/default.json";
import { Topbar } from "./Topbar";

describe("custom desktop titlebar", () => {
  it("renders dark integrated window controls and a drag region", () => {
    render(<Topbar />);
    expect(screen.getByTestId("window-drag-region")).toHaveAttribute("data-tauri-drag-region");
    expect(screen.getByRole("button", { name: "کمینه" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "بزرگ‌نمایی" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "بستن" })).toBeInTheDocument();
  });

  it("grants the Tauri permissions required by the three window controls", () => {
    expect(capabilities.permissions).toEqual(expect.arrayContaining([
      "core:window:allow-close",
      "core:window:allow-minimize",
      "core:window:allow-toggle-maximize",
      "core:window:allow-start-dragging",
    ]));
  });
});
