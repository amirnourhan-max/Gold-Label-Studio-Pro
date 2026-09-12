import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatalogSnapshot, ProductCatalogService } from "../../services/product-catalog";
import { ProductCatalogProvider, useProductCatalog } from "./ProductCatalogProvider";

afterEach(cleanup);

const catalog: CatalogSnapshot = {
  groups: [{ id: "group-1", name: "انگشتر", sortOrder: 0, categories: [{ id: "category-1", name: "انگشتر زنانه" }] }],
  workshops: [{ id: "workshop-1", name: "کارگاه پارسیان" }],
};

function serviceFixture(): ProductCatalogService {
  return {
    source: "sqlite",
    initialize: vi.fn().mockResolvedValue(undefined),
    loadCatalog: vi.fn().mockResolvedValue(catalog),
    addGroup: vi.fn(), softDeleteGroup: vi.fn(), addCategory: vi.fn(), softDeleteCategory: vi.fn(),
    addWorkshop: vi.fn(), softDeleteWorkshop: vi.fn(), createProduct: vi.fn(), listProducts: vi.fn(), softDeleteProduct: vi.fn(),
  };
}

function Probe() {
  const state = useProductCatalog();
  return <output>{state.loading ? "loading" : `${state.source}:${state.catalog.groups[0]?.name}:${state.revision}`}</output>;
}

describe("ProductCatalogProvider", () => {
  it("initializes the supplied service and exposes its persisted catalog", async () => {
    const service = serviceFixture();
    render(<ProductCatalogProvider service={service}><Probe /></ProductCatalogProvider>);
    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("sqlite:انگشتر:0")).toBeInTheDocument());
    expect(service.initialize).toHaveBeenCalledOnce();
    expect(service.loadCatalog).toHaveBeenCalledOnce();
  });

  it("reloads the catalog and increments revision after a mutation", async () => {
    const service = serviceFixture();
    function MutationProbe() {
      const state = useProductCatalog();
      return <button onClick={() => void state.refreshCatalog(true)}>{state.revision}</button>;
    }
    render(<ProductCatalogProvider service={service}><MutationProbe /></ProductCatalogProvider>);
    await waitFor(() => expect(service.loadCatalog).toHaveBeenCalledOnce());
    screen.getByRole("button").click();
    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("1"));
    expect(service.loadCatalog).toHaveBeenCalledTimes(2);
  });
});
