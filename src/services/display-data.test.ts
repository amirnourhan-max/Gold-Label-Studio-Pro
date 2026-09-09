import { describe, expect, it } from "vitest";
import { displayData } from "./display-data";

describe("display-data service boundary", () => {
  it("provides the approved preview records without persisting UI changes", () => {
    const products = displayData.listProducts();

    expect(products).toHaveLength(7);
    expect(products[0]?.code).toBe("R-250904-00125");
    expect(displayData.listReturnScans()).toHaveLength(8);
  });
});
