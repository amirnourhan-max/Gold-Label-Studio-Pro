import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("exposes an editable label surface and the complete real tool list", async () => {
    render(<LabelDesignerPage />);

    const surface = screen.getByTestId("label-canvas-surface");
    expect(surface).toBeInTheDocument();
    expect(surface).toHaveStyle({ width: "600px", height: "360px" }); // 50x30mm at the default 150% zoom

    const tools = screen.getByRole("toolbar", { name: "فهرست ابزارهای طراحی" });
    expect(within(tools).getAllByRole("button").map(button => button.textContent?.trim())).toEqual([
      "انتخاب", "متن", "کد QR", "بارکد", "تصویر", "خط", "شکل", "متغیر",
    ]);
    await waitFor(() => expect(screen.getAllByRole("img", { name: /قالب/ })).toHaveLength(6));
  });

  it("keeps view controls separate from the complete left-side tool list", () => {
    render(<LabelDesignerPage />);

    const viewSettings = screen.getByRole("region", { name: "تنظیمات نمایش" });
    expect(within(viewSettings).getByRole("button", { name: "کوچک‌نمایی" })).toBeInTheDocument();
    expect(within(viewSettings).getByRole("button", { name: "بزرگ‌نمایی" })).toBeInTheDocument();
    expect(within(viewSettings).getByText("قفل راهنماها")).toBeInTheDocument();
  });

  it("shows all six saved templates as complete selectable cards", async () => {
    render(<LabelDesignerPage />);

    const templates = await screen.findByRole("list", { name: "قالب‌های ذخیره‌شده" });
    await waitFor(() => expect(within(templates).getAllByRole("listitem")).toHaveLength(6));
    expect(within(templates).getAllByRole("img").map(image => image.getAttribute("alt"))).toEqual([
      "قالب انگشتر", "قالب دستبند", "قالب گردنبند", "قالب سرویس", "قالب پلاک", "قالب گوشواره",
    ]);
  });

  it("keeps all property controls in a keyboard-accessible internal scroll region", () => {
    render(<LabelDesignerPage />);

    const properties = screen.getByRole("region", { name: "خواص عنصر" });
    const propertyScroll = within(properties).getByRole("region", { name: "تنظیمات خواص" });
    expect(propertyScroll).toHaveAttribute("tabindex", "0");
    expect(within(propertyScroll).getByText("موقعیت و اندازه")).toBeInTheDocument();
    expect(within(propertyScroll).getByText("تنظیمات کد QR")).toBeInTheDocument();
    expect(within(propertyScroll).getByText("ظاهر")).toBeInTheDocument();
    expect(within(propertyScroll).queryByRole("button", { name: "حذف عنصر" })).not.toBeInTheDocument();
    expect(within(properties).getByRole("button", { name: "حذف عنصر" })).toBeInTheDocument();
  });

  it("reveals rename and delete controls only while template management is active", async () => {
    render(<LabelDesignerPage />);

    const templates = await screen.findByRole("list", { name: "قالب‌های ذخیره‌شده" });
    await waitFor(() => expect(within(templates).getAllByRole("listitem")).toHaveLength(6));
    expect(within(templates).queryByRole("button", { name: /حذف قالب/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "مدیریت قالب‌ها" }));

    expect(within(templates).getByRole("button", { name: "حذف قالب انگشتر" })).toBeInTheDocument();
    expect(within(templates).getByRole("button", { name: "تغییر نام قالب انگشتر" })).toBeInTheDocument();
  });
});
