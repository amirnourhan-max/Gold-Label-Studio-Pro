import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OperationsPreviewPage } from "./OperationsPreviewPage";

afterEach(cleanup);

describe("label print workspace", () => {
  it("provides product selection and the complete display-only print setup", () => {
    render(<OperationsPreviewPage mode="label-print" />);

    expect(screen.getByTestId("label-print-page")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "جستجوی محصول برای چاپ" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "اطلاعات محصول انتخاب‌شده" })).toBeInTheDocument();
    const setup = screen.getByRole("region", { name: "تنظیمات چاپ لیبل" });
    expect(within(setup).getByRole("spinbutton", { name: "تعداد چاپ" })).toHaveValue(1);
    expect(within(setup).getByLabelText("چاپگر لیبل")).toBeInTheDocument();
    expect(within(setup).getByLabelText("سایز لیبل")).toBeInTheDocument();
  });

  it("shows a QR label preview, saved templates, and printable queue controls", () => {
    render(<OperationsPreviewPage mode="label-print" />);

    expect(screen.getByRole("img", { name: "پیش‌نمایش لیبل انگشتر طرح گل" })).toBeInTheDocument();
    expect(screen.getByText("QR Code")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "قالب‌های ذخیره‌شده چاپ" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "چاپ تست" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "چاپ لیبل" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "صف چاپ" })).toHaveTextContent("۳ مورد");
    expect(screen.getByRole("button", { name: "چاپ همه" })).toBeInTheDocument();
  });
});
