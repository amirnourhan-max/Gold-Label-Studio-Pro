import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const minimize = vi.fn(async () => undefined);
const close = vi.fn(async () => undefined);

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ minimize, close }),
}));

const { AuthWindowChrome } = await import("./AuthWindowChrome");

afterEach(() => {
  cleanup();
  minimize.mockClear();
  close.mockClear();
});

describe("compact auth window chrome", () => {
  it("provides a draggable titlebar with working minimize and close controls", async () => {
    render(<AuthWindowChrome />);

    expect(screen.getByTestId("auth-window-drag-region")).toHaveAttribute("data-tauri-drag-region");
    fireEvent.click(screen.getByRole("button", { name: "کمینه" }));
    fireEvent.click(screen.getByRole("button", { name: "بستن" }));

    await waitFor(() => {
      expect(minimize).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });
  });
});
