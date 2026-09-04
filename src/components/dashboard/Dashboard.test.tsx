import { render, screen } from "@testing-library/react";
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
});
