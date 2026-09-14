import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProductListItem, ProductWorkflowPort } from "../../services/products/product-service";
import { ProductsPage } from "./ProductsPage";

afterEach(cleanup);

const ring: ProductListItem = {
  id: "p-1", code: "R-001", name: "انگشتر پایدار", group: "انگشتر",
  category: "زنانه", purityPerMille: 750, weightMg: 4385,
  status: "active", imagePath: null,
};
const bracelet: ProductListItem = {
  id: "p-2", code: "B-002", name: "دستبند", group: "دستبند",
  category: "زنانه", purityPerMille: 585, weightMg: 125,
  status: "inactive", imagePath: null,
};

describe("ProductsPage persistence integration", () => {
  it("loads, searches and filters real product data", async () => {
    const workflow: ProductWorkflowPort = {
      load: vi.fn().mockResolvedValue({ source: "persistence", products: [ring, bracelet] }),
      create: vi.fn(),
      softDelete: vi.fn(),
    };
    render(<ProductsPage workflow={workflow} />);

    expect(await screen.findByText("انگشتر پایدار")).toBeInTheDocument();
    expect(screen.getByText("۴.۳۸۵ g")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "جستجوی محصولات" }), { target: { value: "R-001" } });
    expect(screen.getByText("انگشتر پایدار")).toBeInTheDocument();
    expect(screen.queryByText("دستبند")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "جستجوی محصولات" }), { target: { value: "" } });
    fireEvent.change(screen.getByRole("combobox", { name: "وضعیت" }), { target: { value: "غیرفعال" } });
    expect(screen.getByText("دستبند")).toBeInTheDocument();
    expect(screen.queryByText("انگشتر پایدار")).not.toBeInTheDocument();
  });

  it("soft-deletes through the workflow and refreshes the persisted snapshot", async () => {
    const softDelete = vi.fn<ProductWorkflowPort["softDelete"]>().mockResolvedValue({
      source: "persistence", products: [bracelet],
    });
    const workflow: ProductWorkflowPort = {
      load: vi.fn().mockResolvedValue({ source: "persistence", products: [ring, bracelet] }),
      create: vi.fn(),
      softDelete,
    };
    render(<ProductsPage workflow={workflow} />);
    await screen.findByText("انگشتر پایدار");
    fireEvent.click(screen.getByRole("button", { name: "حذف انگشتر پایدار" }));

    await waitFor(() => expect(softDelete).toHaveBeenCalledWith("p-1"));
    await waitFor(() => expect(screen.queryByText("انگشتر پایدار")).not.toBeInTheDocument());
  });

  it("shows loading, empty and error states without bypassing the workflow", async () => {
    let resolveLoad!: (value: { source: "persistence"; products: readonly ProductListItem[] }) => void;
    const pending = new Promise<{ source: "persistence"; products: readonly ProductListItem[] }>(resolve => { resolveLoad = resolve; });
    const workflow: ProductWorkflowPort = { load: () => pending, create: vi.fn(), softDelete: vi.fn() };
    const view = render(<ProductsPage workflow={workflow} />);
    expect(screen.getByText("در حال بارگذاری محصولات...")).toBeInTheDocument();
    resolveLoad({ source: "persistence", products: [] });
    expect(await screen.findByText("محصولی یافت نشد.")).toBeInTheDocument();
    view.unmount();

    render(<ProductsPage workflow={{ ...workflow, load: vi.fn().mockRejectedValue(new Error("database unavailable")) }} />);
    expect(await screen.findByText("database unavailable")).toBeInTheDocument();
  });
});
