import { describe, expect, it } from "vitest";
import { CatalogRepository } from "./catalog-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";

const now = "2026-09-13T10:00:00.000Z";

describe("CatalogRepository", () => {
  it("lists only active, non-deleted product groups", async () => {
    const client = new RecordingSqlClient().returns([]);

    await new CatalogRepository(client).listActiveGroups();

    expect(client.selectCalls[0]?.sql).toContain("FROM product_groups");
    expect(client.selectCalls[0]?.sql).toContain("is_active = 1 AND deleted_at IS NULL");
  });

  it("uses a UTC value for soft deletion instead of physically deleting a workshop", async () => {
    const client = new RecordingSqlClient();

    await new CatalogRepository(client).softDeleteWorkshop("workshop-1", now);

    expect(client.executeCalls[0]).toMatchObject({
      sql: expect.stringContaining("SET deleted_at = ?, updated_at = ?"),
      bindValues: [now, now, "workshop-1"],
    });
  });

  it("soft-deletes product groups with a UTC timestamp instead of removing rows", async () => {
    const client = new RecordingSqlClient();

    await new CatalogRepository(client).softDeleteGroup("group-1", now);

    expect(client.executeCalls[0]?.sql).toContain("UPDATE product_groups SET deleted_at = ?, updated_at = ?");
    expect(client.executeCalls[0]?.bindValues).toEqual([now, now, "group-1"]);
  });

  it("soft-deletes main categories with a UTC timestamp instead of removing rows", async () => {
    const client = new RecordingSqlClient();

    await new CatalogRepository(client).softDeleteCategory("category-1", now);

    expect(client.executeCalls[0]?.sql).toContain("UPDATE main_categories SET deleted_at = ?, updated_at = ?");
    expect(client.executeCalls[0]?.bindValues).toEqual([now, now, "category-1"]);
  });

  it("inserts a product group with an active flag and UTC audit timestamps", async () => {
    const client = new RecordingSqlClient();

    await new CatalogRepository(client).createGroup("النگو", now);

    expect(client.executeCalls[0]?.sql).toContain("INSERT INTO product_groups");
    expect(client.executeCalls[0]?.bindValues).toEqual([expect.any(String), "النگو", 0, 1, now, now]);
  });

  it("inserts a main category bound to its product group", async () => {
    const client = new RecordingSqlClient();

    await new CatalogRepository(client).createCategory("group-1", "نیم‌ست", now);

    expect(client.executeCalls[0]?.sql).toContain("INSERT INTO main_categories");
    expect(client.executeCalls[0]?.bindValues).toEqual([expect.any(String), "group-1", "نیم‌ست", 0, 1, now, now]);
  });

  it("inserts a workshop with an active flag and UTC audit timestamps", async () => {
    const client = new RecordingSqlClient();

    await new CatalogRepository(client).createWorkshop("کارگاه نمونه", now);

    expect(client.executeCalls[0]?.sql).toContain("INSERT INTO workshops");
    expect(client.executeCalls[0]?.bindValues).toEqual([expect.any(String), "کارگاه نمونه", 1, now, now]);
  });

  it("rejects empty catalog names before reaching the database", async () => {
    const client = new RecordingSqlClient();

    await expect(new CatalogRepository(client).createGroup("   ", now)).rejects.toThrow("empty");
    await expect(new CatalogRepository(client).createCategory("group-1", "", now)).rejects.toThrow("empty");
    await expect(new CatalogRepository(client).createWorkshop("  ", now)).rejects.toThrow("empty");
    expect(client.executeCalls).toHaveLength(0);
  });

  it("maps raw snake_case rows into camelCase catalog records", async () => {
    const client = new RecordingSqlClient().returns([
      {
        id: "group-1",
        name: "انگشتر",
        sort_order: 0,
        is_active: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: "group-2",
        name: "دستبند",
        sort_order: 1,
        is_active: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ]);

    const groups = await new CatalogRepository(client).listActiveGroups();

    expect(groups).toEqual([
      {
        id: "group-1",
        name: "انگشتر",
        sortOrder: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: "group-2",
        name: "دستبند",
        sortOrder: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ]);
  });
});
