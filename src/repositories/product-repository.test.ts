import { describe, expect, it } from "vitest";
import { ProductRepository } from "./product-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";
import type { CreateProductInput } from "../types/persistence";

const product: CreateProductInput = {
  id: "product-1" as CreateProductInput["id"], productCode: "R-001", name: "Ring",
  productGroupId: null, mainCategoryId: null, workshopId: null, labelTemplateId: null,
  purityPerMille: 750, weightMg: 4385 as CreateProductInput["weightMg"], stoneWeightMg: 0 as CreateProductInput["stoneWeightMg"],
  size: null, quantity: 1, imagePath: null, note: null, status: "active", createdAt: "2026-09-10T00:00:00.000Z" as CreateProductInput["createdAt"],
};

describe("ProductRepository", () => {
  it("writes a product with integer milligrams and UTC audit fields", async () => {
    const client = new RecordingSqlClient();

    await new ProductRepository(client).create(product);

    expect(client.executeCalls[0]?.bindValues).toContain(4385);
    expect(client.executeCalls[0]?.bindValues).toContain("2026-09-10T00:00:00.000Z");
  });

  it("does not return soft-deleted products from the active list", async () => {
    const client = new RecordingSqlClient().returns([]);

    await new ProductRepository(client).listActive();

    expect(client.selectCalls[0]?.sql).toContain("deleted_at IS NULL");
  });
});
