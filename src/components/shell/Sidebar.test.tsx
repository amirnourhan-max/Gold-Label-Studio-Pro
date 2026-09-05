import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { type ShellRoute, Sidebar } from "./Sidebar";

afterEach(cleanup);

function ControlledSidebar() {
  const [activePage, setActivePage] = useState<ShellRoute>("dashboard");

  return <>
    <output aria-label="صفحه فعال">{activePage}</output>
    <Sidebar activePage={activePage} onNavigate={setActivePage} />
  </>;
}

describe("approved sidebar artwork", () => {
  it("renders trust artwork without duplicating text over the fixed image", () => {
    render(<Sidebar />);
    expect(screen.getByTestId("trust-artwork")).toBeInTheDocument();
    expect(screen.queryByText("Precision in Details")).not.toBeInTheDocument();
  });

  it("shows product registration as the current page when the shell selects it", () => {
    render(<Sidebar activePage="product-registration" onNavigate={() => {}} />);

    expect(screen.getByRole("button", { name: "ثبت محصول" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "داشبورد" })).not.toHaveAttribute("aria-current");
  });

  it("updates the controlled shell route when product registration is selected", () => {
    render(<ControlledSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "ثبت محصول" }));

    expect(screen.getByRole("status", { name: "صفحه فعال" })).toHaveTextContent("product-registration");
  });
});
