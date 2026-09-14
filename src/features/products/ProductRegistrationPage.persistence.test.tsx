import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProductWorkflowPort } from "../../services/products/product-service";
import { previewProductSnapshot } from "../../services/products/product-runtime";
import { ProductRegistrationPage } from "./ProductRegistrationPage";

afterEach(cleanup);

describe("ProductRegistrationPage persistence integration", () => {
  it("sends the approved form values through the product workflow", async () => {
    const create = vi.fn<ProductWorkflowPort["create"]>().mockResolvedValue({
      persisted: true,
      snapshot: { source: "persistence", products: [] },
    });
    const workflow: ProductWorkflowPort = {
      load: vi.fn().mockResolvedValue(previewProductSnapshot),
      create,
      softDelete: vi.fn().mockResolvedValue({ source: "persistence", products: [] }),
    };

    render(<ProductRegistrationPage workflow={workflow} />);
    fireEvent.click(screen.getByRole("button", { name: /^ثبت$/ }));

    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: "انگشتر طرح نگین خورشیدی",
      code: "R-250904-00125",
      weightGramText: "4.385",
      stoneWeightGramText: "4.385",
      purity: "750",
      quantity: "1",
      inInventory: true,
    }));
    expect(screen.getByRole("status")).toHaveTextContent("ثبت محصول با موفقیت انجام شد.");
  });
});
