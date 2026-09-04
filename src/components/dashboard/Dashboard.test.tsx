import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dashboard } from "./Dashboard";

describe("approved dashboard composition", () => {
  it("removes the bottom device strip and keeps the approved dashboard sections", () => {
    render(<Dashboard />);
    expect(screen.getAllByTestId("metric-card")).toHaveLength(5);
    expect(screen.getAllByTestId("category-card")).toHaveLength(7);
    expect(screen.queryAllByTestId("device-card")).toHaveLength(0);
    expect(screen.getAllByTestId("recent-activity-row")).toHaveLength(5);
    expect(screen.getAllByTestId("print-queue-row")).toHaveLength(5);
    expect(screen.getByTestId("hero-jewelry-card")).toBeInTheDocument();
    expect(screen.getByTestId("daily-activity-chart")).toBeInTheDocument();
    expect(screen.getByTestId("category-donut")).toBeInTheDocument();
  });

  it("uses seven independent local SVG category artworks", () => {
    const view = render(<Dashboard />);
    const categoryImages = within(view.container).getAllByTestId("category-image");
    const sources = categoryImages.map((node) => node.getAttribute("src") ?? "");
    expect(categoryImages).toHaveLength(7);
    expect(categoryImages.every((node) => node.tagName === "IMG")).toBe(true);
    expect(new Set(sources).size).toBe(7);
    expect(sources.every((src) => /category-[a-z-]+\.svg(?:$|\?)/.test(src))).toBe(true);
  });
});
