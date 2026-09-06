import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OperationsPreviewPage } from "./OperationsPreviewPage";

afterEach(cleanup);

describe("approved returns workspace", () => {
  it("matches the approved scanning hierarchy and four live metrics", () => {
    render(<OperationsPreviewPage mode="outbound" />);

    const page = screen.getByTestId("outbound-page");
    expect(page).toHaveClass("outbound-workspace");
    expect(screen.getByRole("heading", { name: "مرجوع کالا", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("اسکن و ثبت مرجوع محصولات به انبار")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "اسکن بارکد مرجوع کالا" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "منتظر اسکن بارکد هستیم..." })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "بارکدخوان مرجع" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("اسکن کنید یا بارکد را وارد نمایید")).toBeInTheDocument();
    const metrics = screen.getByRole("list", { name: "آمار جلسه مرجوع کالا" });
    expect(metrics).toHaveTextContent("۱۲۸");
    expect(metrics).toHaveTextContent("483.725 g");
    expect(metrics).toHaveTextContent("۰۰:۲۴:۱۸");
    expect(within(metrics).getByText("وزن کل مرجوع").closest("article")).toHaveClass("tone-gold");
    expect(screen.getByText("زمان جلسه").closest("article")).toHaveClass("tone-green");
    expect(screen.getByText("زمان جلسه").closest("article")).not.toHaveClass("green");
  });

  it("shows both scan outcomes and the complete eight-row history", () => {
    render(<OperationsPreviewPage mode="outbound" />);

    expect(screen.getByRole("alert", { name: "بارکد تکراری" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "اسکن موفق" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "تصویر محصول اسکن‌شده" })).toBeInTheDocument();
    const history = screen.getByRole("table", { name: "آخرین اسکن‌های مرجوع کالا" });
    expect(within(history).getAllByRole("row")).toHaveLength(9);
    expect(within(history).getAllByText("بارکد تکراری")).toHaveLength(2);
    expect(screen.getByText("نمایش")).toBeInTheDocument();
    expect(screen.getByText("۵۰")).toBeInTheDocument();
  });

  it("keeps the latest product, session summary, and four footer actions visible", () => {
    render(<OperationsPreviewPage mode="outbound" />);

    const details = screen.getByRole("complementary", { name: "جزئیات جلسه مرجوع کالا" });
    expect(within(details).getByRole("img", { name: "انگشتر طرح گل" })).toBeInTheDocument();
    expect(within(details).getByRole("heading", { name: "وضعیت اتصال بارکدخوان" })).toBeInTheDocument();
    expect(within(details).getByRole("img", { name: "بارکدخوان متصل" })).toBeInTheDocument();
    expect(within(details).getByRole("button", { name: "تست اتصال" })).toBeInTheDocument();
    expect(within(details).getByText("۹۴.۸۲٪")).toBeInTheDocument();
    const actions = screen.getByRole("toolbar", { name: "عملیات مرجوع کالا" });
    expect(within(actions).getAllByRole("button").map(button => button.textContent?.trim())).toEqual([
      "شروع", "توقف", "بازگشت آخرین", "پایان و گزارش",
    ]);
  });
});
