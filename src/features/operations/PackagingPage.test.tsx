import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OperationsPreviewPage } from "./OperationsPreviewPage";

afterEach(cleanup);

/** The page now loads its package from the packaging gateway, so wait for the session to arrive. */
const waitForLoadedPackage = () => screen.findByText("PK-250604-00125");

describe("approved packaging workspace", () => {
  it("offers QR scanning and manual entry as two distinct paths", async () => {
    render(<OperationsPreviewPage mode="packaging" />);

    expect(screen.getByRole("region", { name: "اسکن QR محصول" })).toBeInTheDocument();
    const manual = screen.getByRole("region", { name: "ورود دستی کد محصول" });
    expect(within(manual).getByPlaceholderText("کد محصول را وارد کنید...")).toBeInTheDocument();
    expect(within(manual).getByRole("button", { name: "افزودن به بسته" })).toBeInTheDocument();

    await waitForLoadedPackage();
  });

  it("renders the complete six-item package and both scan outcomes", async () => {
    render(<OperationsPreviewPage mode="packaging" />);
    await waitForLoadedPackage();

    const table = screen.getByRole("table", { name: "اقلام اسکن‌شده بسته" });
    expect(within(table).getAllByRole("row")).toHaveLength(7);
    expect(screen.getAllByText("24.862 g")).toHaveLength(2);
    expect(screen.getByRole("alert", { name: "محصول تکراری" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "اسکن موفق" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "تصویر محصول تکراری" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "تصویر محصول اسکن‌شده" })).toBeInTheDocument();
    expect(screen.getByText("10:24:18")).toBeInTheDocument();
    expect(screen.getByText("10:24:15")).toBeInTheDocument();
  });

  it("shows complete current-package details beside the printable label", async () => {
    render(<OperationsPreviewPage mode="packaging" />);
    await waitForLoadedPackage();

    const details = screen.getByRole("complementary", { name: "اطلاعات بسته جاری" });
    expect(within(details).getByText("PK-250604-00125")).toBeInTheDocument();
    expect(within(details).getByText("۶ قلم")).toBeInTheDocument();
    expect(within(details).getByText("24.862 g")).toBeInTheDocument();
    expect(within(details).getByText("00:14:37")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "لیبل بسته PK-250604-00125" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "چاپ لیبل بسته" })).toHaveLength(2);
  });

  it("keeps the approved package-entry, scrollable item list, and action order explicit", async () => {
    render(<OperationsPreviewPage mode="packaging" />);

    expect(screen.getByTestId("packaging-manual-entry")).toContainElement(
      screen.getByLabelText("کد محصول دستی"),
    );
    expect(screen.getByTestId("packaging-items-scroll")).toContainElement(
      screen.getByRole("table", { name: "اقلام اسکن‌شده بسته" }),
    );
    expect(screen.getByTestId("current-package-panel")).toBeInTheDocument();

    const actions = within(screen.getByRole("group", { name: "عملیات بسته" })).getAllByRole("button");
    expect(actions.map((action) => action.textContent)).toEqual([
      expect.stringContaining("ایجاد بسته جدید"),
      expect.stringContaining("پایان بسته‌بندی"),
      expect.stringContaining("چاپ لیبل بسته"),
      expect.stringContaining("حذف آخرین اسکن"),
    ]);

    await waitForLoadedPackage();
  });
});
