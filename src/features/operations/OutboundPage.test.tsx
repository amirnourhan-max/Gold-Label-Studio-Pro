import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OperationsPreviewPage } from "./OperationsPreviewPage";

afterEach(cleanup);

describe("approved outbound workspace", () => {
  it("matches the approved scanning hierarchy and four live metrics", () => {
    render(<OperationsPreviewPage mode="outbound" />);

    const page = screen.getByTestId("outbound-page");
    expect(page).toHaveClass("outbound-workspace");
    expect(screen.getByRole("region", { name: "اسکن بارکد خروج کالا" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("اسکن کنید یا بارکد را وارد نمایید")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "آمار جلسه خروج کالا" })).toHaveTextContent("۱۲۸");
    expect(screen.getByRole("list", { name: "آمار جلسه خروج کالا" })).toHaveTextContent("483.725 g");
    expect(screen.getByRole("list", { name: "آمار جلسه خروج کالا" })).toHaveTextContent("۰۰:۲۴:۱۸");
    expect(screen.getByText("جمع وزن").closest("article")).toHaveClass("tone-gold");
    expect(screen.getByText("زمان جلسه").closest("article")).toHaveClass("tone-green");
    expect(screen.getByText("زمان جلسه").closest("article")).not.toHaveClass("green");
  });

  it("shows both scan outcomes and the complete eight-row history", () => {
    render(<OperationsPreviewPage mode="outbound" />);

    expect(screen.getByRole("alert", { name: "بارکد تکراری" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "اسکن موفق" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "تصویر محصول اسکن‌شده" })).toBeInTheDocument();
    const history = screen.getByRole("table", { name: "آخرین اسکن‌های خروج کالا" });
    expect(within(history).getAllByRole("row")).toHaveLength(9);
    expect(within(history).getAllByText("بارکد تکراری")).toHaveLength(2);
    expect(screen.getByText("نمایش")).toBeInTheDocument();
    expect(screen.getByText("۵۰")).toBeInTheDocument();
  });

  it("keeps the latest product, session summary, and four footer actions visible", () => {
    render(<OperationsPreviewPage mode="outbound" />);

    const details = screen.getByRole("complementary", { name: "جزئیات جلسه خروج کالا" });
    expect(within(details).getByRole("img", { name: "انگشتر طرح گل" })).toBeInTheDocument();
    expect(within(details).getByText("۹۴.۸۲٪")).toBeInTheDocument();
    const actions = screen.getByRole("toolbar", { name: "عملیات خروج کالا" });
    expect(within(actions).getAllByRole("button").map(button => button.textContent?.trim())).toEqual([
      "شروع", "توقف", "حذف آخرین", "پایان و گزارش",
    ]);
  });
});
