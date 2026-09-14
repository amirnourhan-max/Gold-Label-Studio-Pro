import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(cleanup);

/** The shell now boots through the auth session provider, so it renders async. */
const renderApp = async () => {
  render(<App />);
  await screen.findByTestId("app-shell");
};

describe("Gold Label Studio Pro shell", () => {
  it("renders the application root", async () => {
    await renderApp();
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByText("Gold Label Studio Pro")).toBeInTheDocument();
  });

  it("opens the product registration preview from the sidebar and marks it current", async () => {
    await renderApp();

    fireEvent.click(screen.getByRole("button", { name: "ثبت محصول" }));

    expect(screen.getByTestId("product-registration-page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ثبت محصول" })).toHaveAttribute("aria-current", "page");
  });

  it("opens the same product registration preview from Dashboard's new product action", async () => {
    await renderApp();

    fireEvent.click(screen.getByRole("button", { name: "محصول جدید" }));

    expect(screen.getByTestId("product-registration-page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ثبت محصول" })).toHaveAttribute("aria-current", "page");
  });

  it("opens visual-check pages directly from the page query", async () => {
    window.history.replaceState({}, "", "/?page=packaging");
    await renderApp();

    expect(screen.getByTestId("packaging-page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "بسته‌بندی ‹" })).toHaveAttribute("aria-current", "page");
    window.history.replaceState({}, "", "/");
  });

  it("opens the returns workspace from the renamed sidebar item", async () => {
    await renderApp();

    fireEvent.click(screen.getByRole("button", { name: "مرجوع کالا ‹" }));

    expect(screen.getByTestId("returns-page")).toHaveClass("returns-workspace");
    expect(screen.getByRole("button", { name: "مرجوع کالا ‹" })).toHaveAttribute("aria-current", "page");
  });

  it("opens the returns workspace directly from the returns route", async () => {
    window.history.replaceState({}, "", "/?page=returns");
    await renderApp();

    expect(screen.getByTestId("returns-page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "مرجوع کالا ‹" })).toHaveAttribute("aria-current", "page");
    window.history.replaceState({}, "", "/");
  });

  it("opens the settings workspace from the settings route", async () => {
    window.history.replaceState({}, "", "/?page=settings");
    await renderApp();

    expect(screen.getByTestId("settings-page")).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "منوی اصلی" })).getByRole("button", { name: "تنظیمات" }),
    ).toHaveAttribute("aria-current", "page");
    window.history.replaceState({}, "", "/");
  });

  it("opens the dedicated products workspace with filters and a preview-only inventory table", async () => {
    window.history.replaceState({}, "", "/?page=products");
    await renderApp();

    expect(screen.getByTestId("products-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "محصولات" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "افزودن محصول جدید" })).toBeInTheDocument();
    expect(screen.getByText("کل محصولات")).toBeInTheDocument();
    expect(screen.getByText("وزن کل موجودی")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "جستجوی محصولات" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "فیلتر محصولات" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "فهرست محصولات" })).toBeInTheDocument();
    expect(screen.getByText("صرفاً نمایشی")).toBeInTheDocument();
    window.history.replaceState({}, "", "/");
  });

  it("rejects the removed reports route and falls back to the dashboard", async () => {
    window.history.replaceState({}, "", "/?page=reports");
    await renderApp();

    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    expect(screen.queryByText("گزارش‌ها")).not.toBeInTheDocument();
    expect(screen.queryByText("گزارش‌گیری")).not.toBeInTheDocument();
    window.history.replaceState({}, "", "/");
  });
});
