import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OperationsPreviewPage } from "./OperationsPreviewPage";

afterEach(cleanup);

describe("approved packaging workspace", () => {
  it("offers QR scanning and manual entry as two distinct paths", () => {
    render(<OperationsPreviewPage mode="packaging" />);

    expect(screen.getByRole("region", { name: "اسکن QR محصول" })).toBeInTheDocument();
    const manual = screen.getByRole("region", { name: "ورود دستی کد محصول" });
    expect(within(manual).getByPlaceholderText("کد محصول را وارد کنید...")).toBeInTheDocument();
    expect(within(manual).getByRole("button", { name: "افزودن به بسته" })).toBeInTheDocument();
  });

  it("renders the complete six-item package and both scan outcomes", () => {
    render(<OperationsPreviewPage mode="packaging" />);

    const table = screen.getByRole("table", { name: "اقلام اسکن‌شده بسته" });
    expect(within(table).getAllByRole("row")).toHaveLength(8);
    expect(within(table).getByText("24.862 g")).toBeInTheDocument();
    expect(screen.getByRole("alert", { name: "محصول تکراری" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "اسکن موفق" })).toBeInTheDocument();
  });

  it("shows complete current-package details beside the printable label", () => {
    render(<OperationsPreviewPage mode="packaging" />);

    const details = screen.getByRole("complementary", { name: "اطلاعات بسته جاری" });
    expect(within(details).getByText("PK-250604-00125")).toBeInTheDocument();
    expect(within(details).getByText("۶ قلم")).toBeInTheDocument();
    expect(within(details).getByText("24.862 g")).toBeInTheDocument();
    expect(within(details).getByText("00:14:37")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "لیبل بسته PK-250604-00125" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "چاپ لیبل بسته" })).toHaveLength(2);
  });
});
