import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageContainer } from "./PageContainer";
import { ScrollPanel } from "./ScrollPanel";

describe("layout primitives", () => {
  it("keeps page and internal-scroll semantics available to feature pages", () => {
    render(<PageContainer className="example-page"><ScrollPanel aria-label="فهرست نمونه">محتوا</ScrollPanel></PageContainer>);

    expect(screen.getByRole("main")).toHaveClass("example-page");
    expect(screen.getByRole("region", { name: "فهرست نمونه" })).toHaveAttribute("tabindex", "0");
  });
});
