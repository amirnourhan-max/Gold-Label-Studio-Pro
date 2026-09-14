import { describe, expect, it } from "vitest";
import { ProductService, type ProductGateway } from "./product-service";
import type { CreateProductInput } from "../../types/persistence";
import type { ProductListRecord } from "../../repositories/product-repository";

function setup() {
  const records: ProductListRecord[] = [];
  let created: CreateProductInput | null = null;
  const gateway: ProductGateway = {
    async listActive() { return records.filter(record => record.deletedAt === null); },
    async create(input) {
      created = input;
      records.unshift({
        ...input,
        updatedAt: input.createdAt,
        deletedAt: null,
        productGroupName: null,
        mainCategoryName: null,
      } as ProductListRecord);
    },
    async softDelete(id, deletedAt) {
      const index = records.findIndex(record => record.id === id);
      if (index >= 0) records[index] = { ...records[index], deletedAt, updatedAt: deletedAt } as ProductListRecord;
    },
  };
  let id = 0;
  const environment = {
    now: () => "2026-09-10T00:00:00.000Z",
    newId: () => `product-${++id}`,
  };
  return { gateway, environment, service: new ProductService(gateway, environment), getCreated: () => created };
}

const draft = {
  name: "انگشتر",
  code: "R-001",
  weightGramText: "4.385",
  stoneWeightGramText: "0.125",
  purity: "750",
  size: "54",
  quantity: "1",
  imagePath: null,
  note: "",
  inInventory: true,
} as const;

describe("ProductService", () => {
  it("creates a valid product with exact integer milligram weights", async () => {
    const { service, getCreated } = setup();

    const result = await service.create(draft);

    expect(result.persisted).toBe(true);
    expect(getCreated()).toMatchObject({
      productCode: "R-001",
      weightMg: 4385,
      stoneWeightMg: 125,
      purityPerMille: 750,
      status: "active",
    });
    expect(result.snapshot.products[0]?.weightMg).toBe(4385);
  });

  it("rejects precision beyond milligrams and stone weight above total weight", async () => {
    const { service } = setup();
    await expect(service.create({ ...draft, weightGramText: "4.3851" })).rejects.toThrow("precision");
    await expect(service.create({ ...draft, stoneWeightGramText: "4.386" })).rejects.toThrow("وزن نگین");
  });

  it("loads persisted products through a fresh service instance and soft-deletes without hard deletion", async () => {
    const { service, gateway, environment } = setup();
    const created = await service.create(draft);
    const freshService = new ProductService(gateway, environment);
    expect((await freshService.load()).products).toHaveLength(1);

    const afterDelete = await freshService.softDelete(created.snapshot.products[0]!.id);

    expect(afterDelete.products).toHaveLength(0);
  });
});
