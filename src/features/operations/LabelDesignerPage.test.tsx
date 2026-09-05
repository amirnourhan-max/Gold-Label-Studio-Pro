import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LabelDesignerPage } from "./LabelDesignerPage";

afterEach(cleanup);

describe("approved label designer", () => {
  it("renders the reference workspace without the generic operations layout", () => {
    render(<LabelDesignerPage />);
    const page = screen.getByTestId("label-designer-page");
    expect(page).toHaveClass("label-designer-page");
    expect(screen.getByRole("toolbar", { name: "عملیات طراحی لیبل" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "ابزارهای طراحی" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "بوم طراحی لیبل" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "خواص عنصر" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "قالب‌های ذخیره‌شده" })).toBeInTheDocument();
  });

  it("uses the approved full jewelry label and exposes the reference tools", () => {
    render(<LabelDesignerPage />);
    expect(screen.getByAltText("لیبل انگشتر طرح گل")).toHaveAttribute("src", expect.stringContaining("designer-full-label.webp"));
    const tools = screen.getByRole("toolbar", { name: "فهرست ابزارهای طراحی" });
    expect(within(tools).getAllByRole("button").map(button => button.textContent?.trim())).toEqual([
      "انتخاب", "متن", "کد QR", "تصویر", "خط", "شکل", "جدول", "متغیر",
    ]);
    expect(screen.getAllByRole("img", { name: /قالب/ })).toHaveLength(6);
  });
});
