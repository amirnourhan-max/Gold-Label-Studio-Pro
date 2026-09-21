import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductRegistrationPage } from "./ProductRegistrationPage";
import type { LabelPrintWorkflow, PrintOutcome } from "../../services/printer/print-runtime";
import type { ScaleWorkflow, StableWeightOutcome } from "../../services/scale/scale-workflow";

afterEach(cleanup);

const printOutcome = (outcome: PrintOutcome) => outcome;

const createPrint = (outcome: PrintOutcome): LabelPrintWorkflow => ({
  printProductLabel: vi.fn(async () => outcome),
  printPackageLabel: vi.fn(async () => outcome),
  printTemplateLabel: vi.fn(async () => outcome),
  printCurrentDocument: vi.fn(async () => outcome),
  testPrint: vi.fn(async () => outcome),
});

const createScale = (outcome: StableWeightOutcome): ScaleWorkflow => ({
  readStableWeight: vi.fn(async () => outcome),
});

const weightField = () => screen.getByLabelText("وزن (گرم)") as HTMLInputElement;

describe("product registration scale wiring", () => {
  it("fills the weight field with the stable reading from the scale", async () => {
    const scale = createScale({ ok: true, grams: 4.385, gramsText: "4.385", milligrams: 4385 });
    render(<ProductRegistrationPage scale={scale} />);

    fireEvent.change(weightField(), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "دریافت از ترازو" }));

    await waitFor(() => expect(weightField()).toHaveValue("4.385"));
    expect(await screen.findByText(/وزن پایدار از ترازو ثبت شد/)).toBeInTheDocument();
  });

  it("keeps the entered weight when the scale read fails", async () => {
    const scale = createScale({ ok: false, message: "اتصال ترازو قطع شد" });
    render(<ProductRegistrationPage scale={scale} />);

    fireEvent.change(weightField(), { target: { value: "8.340" } });
    fireEvent.click(screen.getByRole("button", { name: "دریافت از ترازو" }));

    expect(await screen.findByText(/خواندن از ترازو ناموفق بود: اتصال ترازو قطع شد/)).toBeInTheDocument();
    expect(weightField()).toHaveValue("8.340");
  });
});

describe("product registration printing", () => {
  it("sends a real print job from the approved print action", async () => {
    const print = createPrint(printOutcome({ ok: true, message: "دستور چاپ (ZPL) به «Zebra ZD421» ارسال شد" }));
    render(<ProductRegistrationPage print={print} />);

    fireEvent.click(screen.getByRole("button", { name: "چاپ" }));

    await waitFor(() => expect(print.printProductLabel).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("دستور چاپ (ZPL) به «Zebra ZD421» ارسال شد")).toBeInTheDocument();
  });

  it("never reports success when the printer rejects the job", async () => {
    const print = createPrint(printOutcome({ ok: false, message: "ارسال به چاپگر ناموفق بود: صف چاپ در دسترس نیست" }));
    render(<ProductRegistrationPage print={print} />);

    fireEvent.click(screen.getByRole("button", { name: "چاپ" }));

    expect(await screen.findByText(/ارسال به چاپگر ناموفق بود: صف چاپ در دسترس نیست/)).toBeInTheDocument();
  });
});
