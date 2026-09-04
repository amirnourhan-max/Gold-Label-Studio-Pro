import { render, screen } from "@testing-library/react";
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

  it("uses seven independent local category images", () => {
    render(<Dashboard />);
    const categoryImages = screen.getAllByTestId("category-image");
    expect(categoryImages).toHaveLength(7);
    expect(categoryImages.every((node) => node.tagName === "IMG")).toBe(true);
    expect(new Set(categoryImages.map((node) => node.getAttribute("src"))).size).toBe(7);
  });
});
