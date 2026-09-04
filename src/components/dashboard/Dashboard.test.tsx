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

  it("renders seven clean category atlas cells with unique positions and no embedded card text", () => {
    const view = render(<Dashboard />);
    const categoryArt = within(view.container).getAllByTestId("category-image");
    expect(categoryArt).toHaveLength(7);
    expect(categoryArt.every((node) => node.tagName === "DIV")).toBe(true);

    const images = categoryArt.map((node) => node.style.backgroundImage);
    const positions = categoryArt.map((node) => node.style.backgroundPosition);
    expect(new Set(images).size).toBe(1);
    expect(images[0]).toContain("category-clean-atlas");
    expect(new Set(positions).size).toBe(7);
  });
});
