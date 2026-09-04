import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sidebar } from "./Sidebar";

describe("approved sidebar artwork", () => {
  it("renders trust artwork without duplicating text over the fixed image", () => {
    render(<Sidebar />);
    expect(screen.getByTestId("trust-artwork")).toBeInTheDocument();
    expect(screen.queryByText("Precision in Details")).not.toBeInTheDocument();
  });
});
