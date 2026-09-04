import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Topbar } from "./Topbar";

describe("custom desktop titlebar", () => {
  it("renders dark integrated window controls and a drag region", () => {
    render(<Topbar />);
    expect(screen.getByTestId("window-drag-region")).toHaveAttribute("data-tauri-drag-region");
    expect(screen.getByRole("button", { name: "کمینه" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "بزرگ‌نمایی" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "بستن" })).toBeInTheDocument();
  });
});
