import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dashboard } from "./Dashboard";

describe("approved dashboard composition", () => {
  it("keeps the approved dashboard sections without the removed bottom device strip", () => {
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

  it("renders seven independent clean category images", () => {
    const view = render(<Dashboard />);
    const images = within(view.container).getAllByTestId("category-image");
    const sources = images.map((node) => node.getAttribute("src") ?? "");

    expect(images).toHaveLength(7);
    expect(images.every((node) => node.tagName === "IMG")).toBe(true);
    expect(new Set(sources).size).toBe(7);
    expect(sources.every((src) => src.includes("category-") && src.includes(".webp"))).toBe(true);
  });
});
