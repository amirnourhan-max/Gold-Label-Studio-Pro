import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProductRegistrationPage } from "./ProductRegistrationPage";

afterEach(cleanup);

describe("approved product registration screen", () => {
  it("keeps the breadcrumb and editable product groups accessible", () => {
    render(<ProductRegistrationPage />);
    expect(screen.getByRole("navigation", { name: "مسیر صفحه" })).toHaveTextContent("محصولات");
    expect(screen.getByRole("heading", { name: "ثبت محصول" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "نام محصول" })).toHaveValue("انگشتر طرح نگین خورشیدی");
    expect(screen.getByRole("combobox", { name: "زیرمجموعه" })).toHaveValue("انگشتر زنانه");
    expect(screen.getByRole("textbox", { name: "کد داخلی" })).toHaveValue("R-250904-00125");
    expect(screen.getByRole("textbox", { name: "وزن (گرم)" })).toHaveValue("4.385");
    expect(screen.getByRole("textbox", { name: "وزن نگین (گرم)" })).toHaveValue("4.385");
    expect(screen.getByRole("combobox", { name: "عیار" })).toHaveValue("750");
    expect(screen.getByRole("textbox", { name: "سایز" })).toHaveValue("54");
    expect(screen.getByRole("spinbutton", { name: "تعداد" })).toHaveValue(1);
    expect(screen.getByRole("combobox", { name: "کارگاه / سازنده" })).toHaveValue("کارگاه طلای پارسیان");
    expect(screen.getByRole("combobox", { name: "قالب لیبل" })).toHaveValue("default");
    expect(screen.getByRole("textbox", { name: "یادداشت" })).toHaveValue("نگین اتمی درجه یک");
  });

  it("expands category branches and selects a visible subcategory locally", () => {
    render(<ProductRegistrationPage />);
    const groups = screen.getByRole("region", { name: "گروه / دسته اصلی" });
    const ring = within(groups).getByRole("button", { name: "انگشتر" });
    expect(ring).toHaveAttribute("aria-expanded", "true");
    expect(within(groups).getByRole("button", { name: "انگشتر زنانه" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(groups).getByRole("button", { name: "انگشتر مردانه" }));
    expect(screen.getByRole("combobox", { name: "زیرمجموعه" })).toHaveValue("انگشتر مردانه");
    fireEvent.click(ring);
    expect(within(groups).queryByRole("button", { name: "انگشتر مردانه" })).not.toBeInTheDocument();
    fireEvent.click(within(groups).getByRole("button", { name: "دستبند" }));
    expect(within(groups).getByRole("button", { name: "دستبند" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("combobox", { name: "زیرمجموعه" })).toHaveValue("دستبند زنانه");
  });

  it("adds and removes a main product group locally", () => {
    render(<ProductRegistrationPage />);
    const groups = screen.getByRole("region", { name: "گروه / دسته اصلی" });
    fireEvent.click(within(groups).getByRole("button", { name: "افزودن گروه اصلی" }));
    fireEvent.change(within(groups).getByRole("textbox", { name: "نام گروه اصلی جدید" }), { target: { value: "النگو" } });
    fireEvent.click(within(groups).getByRole("button", { name: "ثبت گروه اصلی" }));
    expect(within(groups).getByRole("button", { name: "النگو" })).toBeInTheDocument();
    fireEvent.click(within(groups).getByRole("button", { name: "حذف گروه اصلی" }));
    expect(within(groups).queryByRole("button", { name: "النگو" })).not.toBeInTheDocument();
  });

  it("adds and removes workshop choices locally", () => {
    render(<ProductRegistrationPage />);
    fireEvent.click(screen.getByRole("button", { name: "افزودن کارگاه" }));
    fireEvent.change(screen.getByRole("textbox", { name: "نام کارگاه جدید" }), { target: { value: "کارگاه نمونه" } });
    fireEvent.click(screen.getByRole("button", { name: "ثبت کارگاه" }));
    expect(screen.getByRole("combobox", { name: "کارگاه / سازنده" })).toHaveValue("کارگاه نمونه");
    fireEvent.click(screen.getByRole("button", { name: "حذف کارگاه" }));
    expect(screen.getByRole("combobox", { name: "کارگاه / سازنده" })).toHaveValue("کارگاه طلای پارسیان");
    expect(screen.queryByRole("option", { name: "کارگاه نمونه" })).not.toBeInTheDocument();
  });

  it("shows the approved local ring and a fixed label preview even when fields change", () => {
    render(<ProductRegistrationPage />);
    expect(screen.getByAltText("پیش‌نمایش تصویر محصول")).toHaveAttribute("src", expect.stringContaining("product-registration-ring.webp"));
    const label = within(screen.getByRole("region", { name: "پیش‌نمایش لیبل (QR)" })).getByRole("img");
    expect(label).toHaveAttribute("src", expect.stringContaining("product-registration-label.webp"));
    const original = label.getAttribute("src");
    fireEvent.change(screen.getByRole("textbox", { name: "نام محصول" }), { target: { value: "نمونه محلی" } });
    expect(screen.getByRole("textbox", { name: "نام محصول" })).toHaveValue("نمونه محلی");
    expect(label).toHaveAttribute("src", original);
  });

  it("shows illustrative device states with no operational device controls", () => {
    render(<ProductRegistrationPage />);
    const rail = screen.getByRole("complementary", { name: "وضعیت دستگاه‌ها" });
    for (const name of ["ترازو دیجیتال", "چاپگر لیبل", "پایگاه داده"]) {
      expect(within(rail).getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(within(rail).getAllByText("متصل")).toHaveLength(3);
    expect(within(rail).getByText("4.385 g")).toBeInTheDocument();
    for (const name of ["کالیبره", "تنظیمات چاپگر", "آزمایش اتصال"]) {
      expect(within(rail).getByRole("button", { name })).toBeDisabled();
    }
    expect(screen.getByRole("button", { name: "دریافت از ترازو" })).toBeDisabled();
    expect(screen.getByText(/هیچ اطلاعاتی ذخیره یا چاپ نمی‌شود/)).toBeInTheDocument();
  });

  it("keeps print, save, print-and-save, and clear in reference order without real operations", () => {
    render(<ProductRegistrationPage />);
    const actions = screen.getByRole("group", { name: "عملیات محصول" });
    expect(within(actions).getAllByRole("button").map(button => button.textContent)).toEqual(["چاپ", "ثبت", "چاپ و ثبت", "پاک کردن فرم"]);
    fireEvent.click(within(actions).getByRole("button", { name: "ثبت" }));
    expect(screen.getByRole("status")).toHaveTextContent("پیش‌نمایش رابط کاربری");
    expect(screen.getByRole("textbox", { name: "نام محصول" })).toHaveValue("انگشتر طرح نگین خورشیدی");
    fireEvent.click(screen.getByRole("checkbox", { name: "وضعیت موجودی" }));
    expect(screen.getByRole("checkbox", { name: "وضعیت موجودی" })).not.toBeChecked();
    fireEvent.click(within(actions).getByRole("button", { name: "پاک کردن فرم" }));
    expect(screen.getByRole("textbox", { name: "نام محصول" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "یادداشت" })).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "وضعیت موجودی" })).toBeChecked();
    expect(screen.queryByAltText("پیش‌نمایش تصویر محصول")).not.toBeInTheDocument();
  });

  it("previews a local image and removes it without affecting the static label", async () => {
    render(<ProductRegistrationPage />);
    fireEvent.change(screen.getByLabelText("انتخاب تصویر"), {
      target: { files: [new File(["image bytes"], "ring.webp", { type: "image/webp" })] },
    });
    await waitFor(() => expect(screen.getByAltText("پیش‌نمایش تصویر محصول")).toHaveAttribute("src", expect.stringContaining("data:image/webp;base64,")));
    fireEvent.click(screen.getByRole("button", { name: "حذف" }));
    expect(screen.queryByAltText("پیش‌نمایش تصویر محصول")).not.toBeInTheDocument();
    expect(screen.getByAltText("نمونه ثابت لیبل محصول؛ کد QR نمایشی")).toBeInTheDocument();
  });
});
