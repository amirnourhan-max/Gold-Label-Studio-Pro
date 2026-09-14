import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PackagingGateway } from "../../services/packaging/packaging-contract";
import { createMockPackagingGateway } from "../../services/packaging/mock-packaging-gateway";
import { OperationsPreviewPage } from "./OperationsPreviewPage";

const delegates = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("../../services/packaging/packaging-gateway", () => ({
  packagingGateway: {
    loadSession: () => (delegates.current as PackagingGateway).loadSession(),
    createPackage: () => (delegates.current as PackagingGateway).createPackage(),
    addItemByCode: (productCode: string) => (delegates.current as PackagingGateway).addItemByCode(productCode),
    removeItem: (itemId: string) => (delegates.current as PackagingGateway).removeItem(itemId),
    removeLastItem: () => (delegates.current as PackagingGateway).removeLastItem(),
    completePackage: () => (delegates.current as PackagingGateway).completePackage(),
  },
}));

const fixedNow = new Date("2026-09-10T10:00:00.000Z");
const approvedPreview = () =>
  createMockPackagingGateway({ clock: () => new Date(fixedNow), initialCreatedAtMs: fixedNow.getTime() - 877_000 });

const renderPackaging = () => render(<OperationsPreviewPage mode="packaging" />);
const loaded = () => screen.findByText("PK-250604-00125");
const itemsTable = () => screen.getByRole("table", { name: "اقلام اسکن‌شده بسته" });
const rowCount = () => within(itemsTable()).getAllByRole("row").length - 1;
const errorCard = () => screen.getByRole("alert", { name: "محصول تکراری" });
const acceptedCard = () => screen.getByRole("status", { name: "اسکن موفق" });

/** Types a product code into the approved manual-entry path and adds it to the package. */
const scan = (productCode: string) => {
  fireEvent.change(screen.getByLabelText("کد محصول دستی"), { target: { value: productCode } });
  fireEvent.click(screen.getByRole("button", { name: "افزودن به بسته" }));
};

beforeEach(() => {
  delegates.current = approvedPreview();
});

afterEach(cleanup);

describe("packaging page persistence lifecycle", () => {
  it("shows a loading state until the stored package arrives", () => {
    delegates.current = { ...approvedPreview(), loadSession: () => new Promise<never>(() => {}) };

    renderPackaging();

    expect(screen.getByText("در حال بارگذاری اقلام بسته...")).toBeInTheDocument();
    expect(screen.getByText("در حال بارگذاری")).toBeInTheDocument();
    expect(screen.getAllByText("۰ قلم").length).toBeGreaterThan(0);
  });

  it("shows an empty state for a package without items", async () => {
    delegates.current = { ...approvedPreview(), loadSession: () => approvedPreview().createPackage() };

    renderPackaging();

    expect(await screen.findByText("هنوز محصولی در این بسته ثبت نشده است")).toBeInTheDocument();
    expect(screen.getByText("در حال بسته‌بندی")).toBeInTheDocument();
    expect(screen.getAllByText("0.000 g").length).toBeGreaterThan(0);
  });

  it("reports a load failure inside the approved error card", async () => {
    delegates.current = { ...approvedPreview(), loadSession: () => Promise.reject(new Error("دیتابیس محلی در دسترس نیست")) };

    renderPackaging();

    expect(await screen.findByText("دیتابیس محلی در دسترس نیست")).toBeInTheDocument();
    expect(within(errorCard()).getByText("خطا در بارگذاری اطلاعات")).toBeInTheDocument();
    expect(screen.getByText("اطلاعات بسته در دسترس نیست")).toBeInTheDocument();
  });

  it("refreshes the list, count and weight after an accepted scan", async () => {
    renderPackaging();
    await loaded();

    scan("r-250604-00130");

    expect(await screen.findByText("R-250604-00130")).toBeInTheDocument();
    expect(rowCount()).toBe(7);
    expect(screen.getAllByText("28.342 g").length).toBeGreaterThan(0);
    expect(within(acceptedCard()).getByText("انگشتر طرح نگین به بسته اضافه شد")).toBeInTheDocument();
    expect(screen.getByLabelText("کد محصول دستی")).toHaveValue("");
  });

  it("keeps the package unchanged when the product is already scanned", async () => {
    renderPackaging();
    await loaded();

    scan("R-250604-00125");

    expect(await screen.findByText("این محصول قبلاً در بسته فعلی اسکن شده است")).toBeInTheDocument();
    expect(within(errorCard()).getByText("اسکن تکراری")).toBeInTheDocument();
    expect(rowCount()).toBe(6);
    expect(screen.getAllByText("24.862 g")).toHaveLength(2);
  });

  it("reports an unknown product code without changing the package", async () => {
    renderPackaging();
    await loaded();

    scan("X-260604-00001");

    expect(await screen.findByText("محصولی با این کد در سیستم ثبت نشده است")).toBeInTheDocument();
    expect(within(errorCard()).getByText("محصول یافت نشد")).toBeInTheDocument();
    expect(rowCount()).toBe(6);
    expect(screen.getByLabelText("کد محصول دستی")).toHaveValue("X-260604-00001");
  });

  it("removes the last scan and rewrites the totals", async () => {
    renderPackaging();
    await loaded();

    fireEvent.click(screen.getByRole("button", { name: "حذف آخرین اسکن" }));

    expect((await screen.findAllByText("22.912 g")).length).toBeGreaterThan(0);
    expect(rowCount()).toBe(5);
    expect(screen.getAllByText("۵ قلم").length).toBeGreaterThan(0);
  });

  it("removes a single item from the list", async () => {
    renderPackaging();
    await loaded();

    fireEvent.click(screen.getByRole("button", { name: "حذف انگشتر طرح گل" }));

    expect((await screen.findAllByText("20.477 g")).length).toBeGreaterThan(0);
    expect(rowCount()).toBe(5);
    expect(within(itemsTable()).queryByText("R-250604-00125")).not.toBeInTheDocument();
  });

  it("completes the package and keeps its items visible", async () => {
    renderPackaging();
    await loaded();

    fireEvent.click(screen.getByRole("button", { name: "پایان بسته‌بندی" }));

    expect(await screen.findByText("بسته‌بندی تکمیل شده")).toBeInTheDocument();
    expect(rowCount()).toBe(6);
    expect(screen.getAllByText("24.862 g")).toHaveLength(2);
  });

  it("creates a new package record from the approved action", async () => {
    renderPackaging();
    await loaded();

    fireEvent.click(screen.getByRole("button", { name: "ایجاد بسته جدید" }));

    expect(await screen.findByText("PK-260910-00126")).toBeInTheDocument();
    expect(screen.getByText("هنوز محصولی در این بسته ثبت نشده است")).toBeInTheDocument();
    expect(screen.getAllByText("0.000 g").length).toBeGreaterThan(0);
    expect(screen.getAllByText("۰ قلم").length).toBeGreaterThan(0);
  });
});
