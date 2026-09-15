import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LabelPrintPage } from "./LabelPrintPage";
import { PackagingPage } from "./PackagingPage";
import type { LabelPrintWorkflow, PrintOutcome } from "../../services/printer/print-runtime";

afterEach(cleanup);

const createPrint = (outcome: PrintOutcome): LabelPrintWorkflow => ({
  printProductLabel: vi.fn(async () => outcome),
  printPackageLabel: vi.fn(async () => outcome),
  printTemplateLabel: vi.fn(async () => outcome),
  testPrint: vi.fn(async () => outcome),
});

const sent = { ok: true, message: "دستور چاپ (ZPL) به «Zebra ZD421» ارسال شد" } as const;
const rejected = { ok: false, message: "ارسال به چاپگر ناموفق بود: چاپگر پیدا نشد" } as const;

describe("label print page actions", () => {
  it("sends a test print through the printer workflow", async () => {
    const print = createPrint(sent);
    render(<LabelPrintPage print={print} />);

    fireEvent.click(screen.getByRole("button", { name: "چاپ تست" }));

    await waitFor(() => expect(print.testPrint).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(sent.message)).toBeInTheDocument();
  });

  it("prints the selected saved template with the chosen copy count", async () => {
    const print = createPrint(sent);
    render(<LabelPrintPage print={print} />);

    fireEvent.click(screen.getByRole("button", { name: "افزایش تعداد" }));
    fireEvent.click(screen.getByRole("button", { name: "چاپ لیبل" }));

    await waitFor(() => expect(print.printTemplateLabel).toHaveBeenCalledTimes(1));
    expect(print.printTemplateLabel).toHaveBeenCalledWith(expect.objectContaining({ copies: 2 }));
    expect(await screen.findByText(sent.message)).toBeInTheDocument();
  });

  it("surfaces a refused print job instead of a success message", async () => {
    const print = createPrint(rejected);
    render(<LabelPrintPage print={print} />);

    fireEvent.click(screen.getByRole("button", { name: "چاپ لیبل" }));

    expect(await screen.findByText(rejected.message)).toBeInTheDocument();
    expect(screen.queryByText(sent.message)).not.toBeInTheDocument();
  });
});

describe("packaging label printing", () => {
  it("prints the open package label with its count and total weight", async () => {
    const print = createPrint(sent);
    render(<PackagingPage print={print} />);

    const actions = await screen.findByRole("group", { name: "عملیات بسته" });
    fireEvent.click(within(actions).getByRole("button", { name: "چاپ لیبل بسته" }));

    await waitFor(() => expect(print.printPackageLabel).toHaveBeenCalledTimes(1));
    expect(print.printPackageLabel).toHaveBeenCalledWith(
      expect.objectContaining({ packageCode: "PK-250604-00125", itemCount: 6, totalWeightMg: 24_862 }),
    );
    expect(await screen.findByText(sent.message)).toBeInTheDocument();
  });

  it("reports a package print failure honestly", async () => {
    const print = createPrint(rejected);
    render(<PackagingPage print={print} />);

    const actions = await screen.findByRole("group", { name: "عملیات بسته" });
    fireEvent.click(within(actions).getByRole("button", { name: "چاپ لیبل بسته" }));

    expect(await screen.findByText(rejected.message)).toBeInTheDocument();
  });
});
