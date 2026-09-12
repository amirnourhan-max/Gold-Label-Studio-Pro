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
  it("maps a joined SQLite row into a camelCase catalog record", async () => {
    const client = new RecordingSqlClient().returns([{
      id: "product-1", product_code: "R-001", name: "انگشتر طرح گل",
      product_group_id: "group-1", main_category_id: "category-1", workshop_id: "workshop-1",
      label_template_id: null, purity_per_mille: 750, weight_mg: 4385, stone_weight_mg: 250,
      size: "54", quantity: 1, image_path: "product-images/product-1.webp", note: null,
      status: "active", created_at: "2026-09-12T10:00:00.000Z",
      updated_at: "2026-09-12T10:00:00.000Z", deleted_at: null,
      group_name: "انگشتر", category_name: "انگشتر زنانه", workshop_name: "کارگاه مرکزی",
    }]);

    const [record] = await new ProductRepository(client).listActiveCatalog();

    expect(record).toEqual({
      id: "product-1", productCode: "R-001", name: "انگشتر طرح گل",
      productGroupId: "group-1", mainCategoryId: "category-1", workshopId: "workshop-1",
      labelTemplateId: null, purityPerMille: 750, weightMg: 4385, stoneWeightMg: 250,
      size: "54", quantity: 1, imagePath: "product-images/product-1.webp", note: null,
      status: "active", createdAt: "2026-09-12T10:00:00.000Z",
      updatedAt: "2026-09-12T10:00:00.000Z", deletedAt: null,
      groupName: "انگشتر", categoryName: "انگشتر زنانه", workshopName: "کارگاه مرکزی",
    });
  });

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
