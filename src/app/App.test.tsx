import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(cleanup);

describe("Gold Label Studio Pro shell", () => {
  it("renders the application root", () => {
    render(<App />);
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByText("Gold Label Studio Pro")).toBeInTheDocument();
  });

  it("opens the product registration preview from the sidebar and marks it current", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "ثبت محصول" }));

    expect(screen.getByTestId("product-registration-page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ثبت محصول" })).toHaveAttribute("aria-current", "page");
  });

  it("opens the same product registration preview from Dashboard's new product action", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "محصول جدید" }));

    expect(screen.getByTestId("product-registration-page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ثبت محصول" })).toHaveAttribute("aria-current", "page");
  });

  it("opens visual-check pages directly from the page query", () => {
    window.history.replaceState({}, "", "/?page=packaging");
    render(<App />);

    expect(screen.getByTestId("packaging-page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "بسته‌بندی ‹" })).toHaveAttribute("aria-current", "page");
    window.history.replaceState({}, "", "/");
  });
});
