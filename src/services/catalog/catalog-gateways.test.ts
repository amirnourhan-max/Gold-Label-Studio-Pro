import { describe, expect, it } from "vitest";
import { MockCatalogGateway } from "./mock-catalog-gateway";
import { PersistenceCatalogGateway } from "./persistence-catalog-gateway";
import { RecordingSqlClient } from "../../repositories/test-support/recording-sql-client";
import { CatalogRepository } from "../../repositories/catalog-repository";

describe("MockCatalogGateway (controlled fallback)", () => {
  it("serves the approved preview groups and workshops", async () => {
    const gateway = new MockCatalogGateway();

    const entry = await gateway.loadCatalog();

    expect(entry.groups.map(group => group.name)).toEqual(["انگشتر", "دستبند", "سرویس", "گردنبند"]);
    expect(entry.workshops.map(workshop => workshop.name)).toEqual(["کارگاه طلای پارسیان", "کارگاه مرکزی"]);
  });

  it("adds and removes groups and workshops in memory without touching a database", async () => {
    const gateway = new MockCatalogGateway();

    await gateway.addGroup("النگو");
    expect((await gateway.peekCatalog?.())?.groups.at(-1)?.name).toBe("النگو");
    await gateway.addWorkshop("کارگاه نمونه");

    const expanded = await gateway.loadCatalog();
    expect(expanded.groups.at(-1)?.name).toBe("النگو");
    expect(expanded.workshops.at(-1)?.name).toBe("کارگاه نمونه");

    const addedGroup = expanded.groups.at(-1)!;
    const addedWorkshop = expanded.workshops.at(-1)!;
    await gateway.removeGroup(addedGroup.id);
    await gateway.removeWorkshop(addedWorkshop.id);

    const restored = await gateway.loadCatalog();
    expect(restored.groups.map(group => group.name)).toEqual(["انگشتر", "دستبند", "سرویس", "گردنبند"]);
    expect(restored.workshops.map(workshop => workshop.name)).toEqual(["کارگاه طلای پارسیان", "کارگاه مرکزی"]);
  });

  it("rejects blank names and unknown groups for category operations", async () => {
    const gateway = new MockCatalogGateway();

    await expect(gateway.addGroup("   ")).rejects.toThrow("empty");
    await expect(gateway.addWorkshop("")).rejects.toThrow("empty");
    await expect(gateway.addCategory("unknown-group" as never, "نیم‌ست")).rejects.toThrow("Unknown product group");
  });

  it("supports full in-memory category operations", async () => {
    const gateway = new MockCatalogGateway();

    await gateway.addCategory("mock-group-rings" as never, "انگشتر طرح جدید");
    const expanded = await gateway.loadCatalog();
    const rings = expanded.groups.find(group => group.name === "انگشتر");
    expect(rings?.categories.at(-1)?.name).toBe("انگشتر طرح جدید");

    const addedCategory = rings?.categories.at(-1)!;
    await gateway.removeCategory(addedCategory.id);
    const restored = await gateway.loadCatalog();
    expect(restored.groups.find(group => group.name === "انگشتر")?.categories.some(category => category.name === "انگشتر طرح جدید")).toBe(false);
  });
});

describe("PersistenceCatalogGateway", () => {
  it("loads a nested catalog entry from the repository", async () => {
    const now = "2026-09-13T10:00:00.000Z";
    const client = new RecordingSqlClient();
    const groupRows = [
      { id: "group-1", name: "انگشتر", sort_order: 0, is_active: 1, created_at: now, updated_at: now, deleted_at: null },
      { id: "group-2", name: "دستبند", sort_order: 1, is_active: 1, created_at: now, updated_at: now, deleted_at: null },
    ];
    const categoryRows = [
      { id: "category-1", product_group_id: "group-1", name: "انگشتر مردانه", sort_order: 0, is_active: 1, created_at: now, updated_at: now, deleted_at: null },
    ];
    const workshopRows = [
      { id: "workshop-1", name: "کارگاه مرکزی", is_active: 1, created_at: now, updated_at: now, deleted_at: null },
    ];
    // Select order: groups and workshops in parallel, then categories per group.
    client.returnsInOrder(groupRows, workshopRows, categoryRows);

    const entry = await new PersistenceCatalogGateway(new CatalogRepository(client)).loadCatalog();

    expect(client.selectCalls.map(call => call.sql)).toEqual([
      expect.stringContaining("FROM product_groups"),
      expect.stringContaining("FROM workshops"),
      expect.stringContaining("FROM main_categories"),
      expect.stringContaining("FROM main_categories"),
    ]);
    expect(entry.groups).toEqual([
      {
        id: "group-1",
        name: "انگشتر",
        categories: [{ id: "category-1", productGroupId: "group-1", name: "انگشتر مردانه" }],
      },
      { id: "group-2", name: "دستبند", categories: [] },
    ]);
    expect(entry.workshops).toEqual([{ id: "workshop-1", name: "کارگاه مرکزی" }]);
  });

  it("routes add and remove operations to repository writes", async () => {
    const now = "2026-09-13T10:00:00.000Z";
    const client = new RecordingSqlClient().returnsInOrder(
      // The only select in this test: groups reload right after addGroup.
      [{ id: "group-created", name: "النگو", sort_order: 0, is_active: 1, created_at: now, updated_at: now, deleted_at: null }],
    );
    const gateway = new PersistenceCatalogGateway(new CatalogRepository(client));

    const newGroupId = await gateway.addGroup("النگو");
    expect(newGroupId).toBe("group-created");
    await gateway.removeGroup("group-9" as never);
    await gateway.addWorkshop("کارگاه نمونه");
    await gateway.removeWorkshop("workshop-9" as never);
    await gateway.addCategory("group-1" as never, "نیم‌ست");
    await gateway.removeCategory("category-9" as never);

    const sql = client.executeCalls.map(call => call.sql);
    expect(sql[0]).toContain("INSERT INTO product_groups");
    expect(sql[1]).toContain("UPDATE product_groups SET deleted_at");
    expect(sql[2]).toContain("INSERT INTO workshops");
    expect(sql[3]).toContain("UPDATE workshops SET deleted_at");
    expect(sql[4]).toContain("INSERT INTO main_categories");
    expect(sql[5]).toContain("UPDATE main_categories SET deleted_at");
    for (const call of client.executeCalls) {
      for (const value of call.bindValues) {
        if (typeof value === "string" && value.includes("T") && value.endsWith("Z")) {
          expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        }
      }
    }
  });
});
