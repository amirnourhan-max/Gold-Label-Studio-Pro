import { describe, expect, it } from "vitest";
import { asUtcIsoString, type EntityId } from "../types/persistence";
import { CatalogRepository } from "./catalog-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";

describe("CatalogRepository", () => {
  it("maps SQLite product-group rows into camelCase persistence records", async () => {
    const client = new RecordingSqlClient().returns([{
      id: "group-1", name: "انگشتر", sort_order: 2, is_active: 1,
      created_at: "2026-09-12T10:00:00.000Z", updated_at: "2026-09-12T10:00:00.000Z", deleted_at: null,
    }]);

    const [group] = await new CatalogRepository(client).listActiveGroups();

    expect(group).toEqual({
      id: "group-1", name: "انگشتر", sortOrder: 2, isActive: true,
      createdAt: "2026-09-12T10:00:00.000Z", updatedAt: "2026-09-12T10:00:00.000Z", deletedAt: null,
    });
  });

  it("maps SQLite category and workshop rows instead of leaking snake_case values", async () => {
    const categoryClient = new RecordingSqlClient().returns([{
      id: "category-1", product_group_id: "group-1", name: "انگشتر زنانه", sort_order: 1, is_active: 1,
      created_at: "2026-09-12T10:00:00.000Z", updated_at: "2026-09-12T10:00:00.000Z", deleted_at: null,
    }]);
    const workshopClient = new RecordingSqlClient().returns([{
      id: "workshop-1", name: "کارگاه مرکزی", is_active: 1,
      created_at: "2026-09-12T10:00:00.000Z", updated_at: "2026-09-12T10:00:00.000Z", deleted_at: null,
    }]);

    const [category] = await new CatalogRepository(categoryClient).listActiveCategories("group-1");
    const [workshop] = await new CatalogRepository(workshopClient).listActiveWorkshops();

    expect(category).toMatchObject({ productGroupId: "group-1", sortOrder: 1, isActive: true });
    expect(workshop).toMatchObject({ id: "workshop-1", isActive: true, deletedAt: null });
  });

  it("lists only active, non-deleted product groups", async () => {
    const client = new RecordingSqlClient().returns([]);

    await new CatalogRepository(client).listActiveGroups();

    expect(client.selectCalls[0]?.sql).toContain("is_active = 1 AND deleted_at IS NULL");
  });

  it("uses a UTC value for soft deletion instead of physically deleting a workshop", async () => {
    const client = new RecordingSqlClient();

    await new CatalogRepository(client).softDeleteWorkshop("workshop-1", "2026-09-10T00:00:00.000Z");

    expect(client.executeCalls[0]).toMatchObject({
      sql: expect.stringContaining("SET deleted_at = ?, updated_at = ?"),
      bindValues: ["2026-09-10T00:00:00.000Z", "2026-09-10T00:00:00.000Z", "workshop-1"],
    });
  });

  it("creates and soft-deletes groups and categories with bound UTC values", async () => {
    const client = new RecordingSqlClient();
    const repository = new CatalogRepository(client);
    const createdAt = asUtcIsoString("2026-09-12T11:00:00.000Z");

    await repository.createGroup({ id: "group-2" as EntityId, name: "النگو", sortOrder: 4, createdAt });
    await repository.createCategory({
      id: "category-2" as EntityId, productGroupId: "group-2" as EntityId,
      name: "النگو تراش", sortOrder: 0, createdAt,
    });
    await repository.softDeleteGroup("group-2", createdAt);
    await repository.softDeleteCategory("category-2", createdAt);

    expect(client.executeCalls[0]?.bindValues).toEqual(["group-2", "النگو", 4, createdAt, createdAt]);
    expect(client.executeCalls[1]?.bindValues).toEqual([
      "category-2", "group-2", "النگو تراش", 0, createdAt, createdAt,
    ]);
    expect(client.executeCalls[2]?.sql).toContain("UPDATE product_groups SET deleted_at");
    expect(client.executeCalls[3]?.sql).toContain("UPDATE main_categories SET deleted_at");
  });

  it("creates a workshop using bound values", async () => {
    const client = new RecordingSqlClient();

    await new CatalogRepository(client).createWorkshop({
      id: "workshop-2" as EntityId, name: "کارگاه نمونه",
      createdAt: asUtcIsoString("2026-09-12T12:00:00.000Z"),
    });

    expect(client.executeCalls[0]?.bindValues).toEqual([
      "workshop-2", "کارگاه نمونه", "2026-09-12T12:00:00.000Z", "2026-09-12T12:00:00.000Z",
    ]);
  });
});
