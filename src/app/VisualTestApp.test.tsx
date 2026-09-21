import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VisualTestApp } from "./VisualTestApp";
import { visualTestModeEnabled } from "./visual-test-mode";

afterEach(cleanup);

describe("Label Designer visual-test entry", () => {
  it("is enabled only by the explicit build-time flag", () => {
    expect(visualTestModeEnabled({ VITE_VISUAL_TEST_MODE: "1" })).toBe(true);
    expect(visualTestModeEnabled({ VITE_VISUAL_TEST_MODE: "0" })).toBe(false);
    expect(visualTestModeEnabled({})).toBe(false);
  });

  it("renders the real ready designer workspace with actual document elements", async () => {
    render(<VisualTestApp />);

    const page = await screen.findByTestId("label-designer-page");
    expect(page).toBeInTheDocument();
    expect(screen.queryByText("در حال آماده‌سازی پایگاه داده...")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "ابزارهای طراحی" })).toBeInTheDocument();
    expect(screen.getByTestId("label-canvas-surface")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "خواص عنصر" })).toBeInTheDocument();

    const templates = screen.getByRole("region", { name: "قالب‌های ذخیره‌شده" });
    await waitFor(() => expect(within(templates).getAllByRole("listitem")).toHaveLength(1));
    expect(screen.getByTestId("label-element-text-1")).toBeInTheDocument();
    expect(screen.getByTestId("label-element-qr-1")).toBeInTheDocument();
    expect(screen.getByTestId("label-element-barcode-1")).toBeInTheDocument();
  });
});
