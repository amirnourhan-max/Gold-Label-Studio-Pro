import { describe, expect, it } from "vitest";
import { ProductRepository } from "./product-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";
import type { CreateProductInput } from "../types/persistence";

const product: CreateProductInput = {
  id: "product-1" as CreateProductInput["id"], productCode: "R-001", name: "Ring",
  productGroupId: null, mainCategoryId: null, workshopId: null, labelTemplateId: null,
  purityPerMille: 750, weightMg: 4385 as CreateProductInput["weightMg"], stoneWeightMg: 125 as CreateProductInput["stoneWeightMg"],
  size: null, quantity: 1, imagePath: null, note: null, status: "active", createdAt: "2026-09-10T00:00:00.000Z" as CreateProductInput["createdAt"],
};

describe("ProductRepository", () => {
  it("writes product weights as integer milligrams with UTC audit fields", async () => {
    const client = new RecordingSqlClient();
    await new ProductRepository(client).create(product);
    expect(client.executeCalls[0]?.sql).toContain("weight_mg");
    expect(client.executeCalls[0]?.bindValues).toContain(4385);
    expect(client.executeCalls[0]?.bindValues).toContain(125);
    expect(client.executeCalls[0]?.bindValues.filter(value => value === "2026-09-10T00:00:00.000Z")).toHaveLength(2);
  });

  it("maps database columns and excludes soft-deleted products", async () => {
    const client = new RecordingSqlClient().returns([]);
    await new ProductRepository(client).listActive();
    expect(client.selectCalls[0]?.sql).toContain("product_code AS productCode");
    expect(client.selectCalls[0]?.sql).toContain("weight_mg AS weightMg");
    expect(client.selectCalls[0]?.sql).toContain("deleted_at IS NULL");
  });

  it("loads active products with their catalog display names", async () => {
    const client = new RecordingSqlClient().returns([]);
    await new ProductRepository(client).listActiveWithCatalog();
    const sql = client.selectCalls[0]?.sql ?? "";
    expect(sql).toContain("LEFT JOIN product_groups");
    expect(sql).toContain("LEFT JOIN main_categories");
    expect(sql).toContain("productGroupName");
    expect(sql).toContain("mainCategoryName");
    expect(sql).toContain("deleted_at IS NULL");
  });

  it("soft-deletes instead of issuing a destructive delete", async () => {
    const client = new RecordingSqlClient();
    await new ProductRepository(client).softDelete("product-1", "2026-09-11T00:00:00.000Z");
    expect(client.executeCalls[0]?.sql).toMatch(/^UPDATE products SET deleted_at/);
    expect(client.executeCalls[0]?.sql).not.toContain("DELETE FROM");
    expect(client.executeCalls[0]?.bindValues).toEqual([
      "2026-09-11T00:00:00.000Z",
      "2026-09-11T00:00:00.000Z",
      "product-1",
    ]);
  });
});
