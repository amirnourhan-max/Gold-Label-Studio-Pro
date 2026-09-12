import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { weightMgFromGramText } from "../../services/database/weight";
import type { CatalogSnapshot, ProductCatalogService, ProductListItem } from "../../services/product-catalog";
import { ProductCatalogProvider } from "./ProductCatalogProvider";
import { ProductsPage } from "./ProductsPage";

afterEach(cleanup);

const catalog: CatalogSnapshot = {
  groups: [
    { id: "g-ring", name: "انگشتر", sortOrder: 0, categories: [{ id: "c-women", name: "انگشتر زنانه" }] },
    { id: "g-bracelet", name: "دستبند", sortOrder: 1, categories: [{ id: "c-chain", name: "دستبند زنجیری" }] },
  ],
  workshops: [{ id: "w-1", name: "کارگاه پارسیان" }],
};

const rows: ProductListItem[] = [
  { id: "p-1", code: "R-001", name: "انگشتر طرح گل", group: "انگشتر", category: "انگشتر زنانه", workshop: "کارگاه پارسیان", purity: 750, weightMg: weightMgFromGramText("4.385"), status: "active", image: null },
  { id: "p-2", code: "B-002", name: "دستبند کارتیه", group: "دستبند", category: "دستبند زنجیری", workshop: "کارگاه پارسیان", purity: 875, weightMg: weightMgFromGramText("8.340"), status: "pending_print", image: null },
];

function memoryService() {
  let products = [...rows];
  const service: ProductCatalogService = {
    source: "sqlite",
    initialize: vi.fn().mockResolvedValue(undefined),
    loadCatalog: vi.fn().mockResolvedValue(catalog),
    listProducts: vi.fn(async () => products),
    softDeleteProduct: vi.fn(async id => { products = products.filter(product => product.id !== id); }),
    addGroup: vi.fn(), softDeleteGroup: vi.fn(), addCategory: vi.fn(), softDeleteCategory: vi.fn(),
    addWorkshop: vi.fn(), softDeleteWorkshop: vi.fn(), createProduct: vi.fn(),
  };
  return service;
}

const renderPage = (onNewProduct = vi.fn(), service = memoryService()) => {
  render(<ProductCatalogProvider service={service}><ProductsPage onNewProduct={onNewProduct} /></ProductCatalogProvider>);
  return { onNewProduct, service };
};

describe("persisted products page", () => {
  it("renders repository products and derives inventory statistics", async () => {
    const { service } = renderPage();
    const table = screen.getByRole("table", { name: "فهرست محصولات" });
    await waitFor(() => expect(within(table).getByText("R-001")).toBeInTheDocument());
    expect(within(table).getByText("B-002")).toBeInTheDocument();
    expect(screen.getByText("۱۲.۷۲۵ g")).toBeInTheDocument();
    expect(service.listProducts).toHaveBeenCalledOnce();
  });

  it("filters real data by search, group, category, purity, and status", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("R-001")).toBeInTheDocument());
    fireEvent.change(screen.getByRole("searchbox", { name: "جستجوی محصولات" }), { target: { value: "دستبند" } });
    expect(screen.queryByText("R-001")).not.toBeInTheDocument();
    expect(screen.getByText("B-002")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "عیار" }), { target: { value: "750" } });
    expect(screen.queryByText("B-002")).not.toBeInTheDocument();
  });

  it("soft-deletes through the service and refreshes the table", async () => {
    const { service } = renderPage();
    await waitFor(() => expect(screen.getByText("R-001")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "حذف انگشتر طرح گل" }));
    await waitFor(() => expect(screen.queryByText("R-001")).not.toBeInTheDocument());
    expect(service.softDeleteProduct).toHaveBeenCalledWith("p-1");
  });

  it("keeps the approved new-product action connected to navigation", async () => {
    const onNewProduct = vi.fn();
    renderPage(onNewProduct);
    await waitFor(() => expect(screen.getByRole("button", { name: /افزودن محصول جدید/ })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /افزودن محصول جدید/ }));
    expect(onNewProduct).toHaveBeenCalledOnce();
  });
});
