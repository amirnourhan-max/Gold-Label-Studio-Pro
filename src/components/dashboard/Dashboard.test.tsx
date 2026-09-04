import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dashboard } from "./Dashboard";

describe("approved dashboard composition", () => {
  it("renders the approved section counts", () => {
    render(<Dashboard />);
    expect(screen.getAllByTestId("metric-card")).toHaveLength(5);
    expect(screen.getAllByTestId("category-card")).toHaveLength(7);
    expect(screen.getAllByTestId("device-card")).toHaveLength(3);
    expect(screen.getAllByTestId("recent-activity-row")).toHaveLength(5);
    expect(screen.getAllByTestId("print-queue-row")).toHaveLength(5);
    expect(screen.getByTestId("hero-jewelry-card")).toBeInTheDocument();
    expect(screen.getByTestId("daily-activity-chart")).toBeInTheDocument();
    expect(screen.getByTestId("category-donut")).toBeInTheDocument();
  });

  it("renders approved category and device artwork as intrinsic images so nothing is clipped", () => {
    const view = render(<Dashboard />);
    const scoped = within(view.container);
    const categoryImages = scoped.getAllByTestId("category-image");
    const deviceImages = scoped.getAllByTestId("device-image");

    expect(categoryImages).toHaveLength(7);
    expect(deviceImages).toHaveLength(3);
    expect(categoryImages.every((node) => node.tagName === "IMG")).toBe(true);
    expect(deviceImages.every((node) => node.tagName === "IMG")).toBe(true);
    expect(new Set(categoryImages.map((node) => node.getAttribute("src"))).size).toBe(7);
    expect(new Set(deviceImages.map((node) => node.getAttribute("src"))).size).toBe(3);
  });
});
