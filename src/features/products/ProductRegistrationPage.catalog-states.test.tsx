import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadCatalog = vi.fn();
const addWorkshop = vi.fn();

vi.mock("../../services/catalog/catalog-gateway", () => ({
  createDefaultCatalogGateway: () => ({
    loadCatalog,
    addGroup: vi.fn().mockResolvedValue("group-x"),
    removeGroup: vi.fn().mockResolvedValue(undefined),
    addCategory: vi.fn().mockResolvedValue(undefined),
    removeCategory: vi.fn().mockResolvedValue(undefined),
    addWorkshop,
    removeWorkshop: vi.fn().mockResolvedValue(undefined),
    peekCatalog: () => undefined,
  }),
}));

const ProductRegistrationPage = vi.importActual<typeof import("./ProductRegistrationPage")>(
  "./ProductRegistrationPage",
).then(module => module.ProductRegistrationPage);

let Page: Awaited<typeof ProductRegistrationPage>;

beforeEach(async () => {
  vi.clearAllMocks();
  Page = (await vi.importActual<typeof import("./ProductRegistrationPage")>("./ProductRegistrationPage")).ProductRegistrationPage;
});

afterEach(cleanup);

describe("product registration catalog states", () => {
  it("shows a loading status before the gateway resolves", async () => {
    let resolveLoad: (entry: never) => void = () => {};
    loadCatalog.mockImplementation(() => new Promise(resolve => { resolveLoad = resolve; }));

    render(<Page />);
    expect(screen.getAllByRole("status").some(node => node.textContent?.includes("در حال بارگذاری گروه‌ها"))).toBe(true);

    resolveLoad({ groups: [{ id: "g1", name: "انگشتر", categories: [] }], workshops: [] } as never);
    await waitFor(() => expect(screen.getByRole("button", { name: "انگشتر" })).toBeInTheDocument());
  });

  it("renders an empty-catalog message when the database has no records", async () => {
    loadCatalog.mockResolvedValue({ groups: [], workshops: [] });

    render(<Page />);
    await waitFor(() => expect(screen.getAllByRole("status").some(node => node.textContent?.includes("گروهی ثبت نشده است"))).toBe(true));
    expect(screen.getByRole("button", { name: "حذف گروه اصلی" })).toBeDisabled();
  });

  it("shows an error message when the gateway fails to load", async () => {
    loadCatalog.mockRejectedValue(new Error("database unavailable"));

    render(<Page />);
    await waitFor(() => expect(screen.getAllByRole("alert").some(node => node.textContent?.includes("خطا در خواندن گروه‌ها"))).toBe(true));
  });

  it("surfaces add failures as an alert without losing the form", async () => {
    loadCatalog.mockResolvedValue({ groups: [], workshops: [] });
    addWorkshop.mockRejectedValue(new Error("insert failed"));

    render(<Page />);
    await waitFor(() => expect(screen.getByRole("button", { name: "افزودن کارگاه" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "افزودن کارگاه" }));
    fireEvent.change(screen.getByRole("textbox", { name: "نام کارگاه جدید" }), { target: { value: "کارگاه خطا" } });
    fireEvent.click(screen.getByRole("button", { name: "ثبت کارگاه" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("افزودن کارگاه ناموفق بود"));
    expect(screen.getByTestId("product-registration-page")).toBeInTheDocument();
  });
});
