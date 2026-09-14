import { describe, expect, it } from "vitest";
import type { CreatePackageInput } from "../types/persistence";
import { PackageRepository } from "./package-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";

const packageRow = {
  id: "package-1", package_code: "PK-250604-00125", status: "open", operator_user_id: null,
  item_count: 2, total_weight_mg: 6335, closed_at: null,
  created_at: "2026-09-10T10:00:00.000Z", updated_at: "2026-09-10T10:05:00.000Z",
};

describe("PackageRepository", () => {
  it("binds an immutable milligram snapshot when adding a package item", async () => {
    const client = new RecordingSqlClient();

    await new PackageRepository(client).addItem({
      id: "item-1", packageId: "package-1", productId: "product-1", scannedAt: "2026-09-10T00:00:00.000Z",
      scannedByUserId: null, weightMgSnapshot: 4385, purityPerMilleSnapshot: 750, createdAt: "2026-09-10T00:00:00.000Z",
    });

    expect(client.executeCalls[0]?.bindValues).toEqual([
      "item-1", "package-1", "product-1", "2026-09-10T00:00:00.000Z", null, 4385, 750,
      "2026-09-10T00:00:00.000Z", "2026-09-10T00:00:00.000Z",
    ]);
  });

  it("maps persisted package rows to the camelCase record contract", async () => {
    const client = new RecordingSqlClient().returns([packageRow]);

    const [packageRecord] = await new PackageRepository(client).listOpen();

    expect(packageRecord).toEqual({
      id: "package-1", packageCode: "PK-250604-00125", status: "open", operatorUserId: null,
      itemCount: 2, totalWeightMg: 6335, closedAt: null,
      createdAt: "2026-09-10T10:00:00.000Z", updatedAt: "2026-09-10T10:05:00.000Z",
    });
  });

  it("returns the most recent open package or null when none is open", async () => {
    const open = new PackageRepository(new RecordingSqlClient().returns([packageRow]));
    const none = new PackageRepository(new RecordingSqlClient().returns([]));

    expect((await open.findLatestOpen())?.packageCode).toBe("PK-250604-00125");
    expect(await none.findLatestOpen()).toBeNull();
  });

  it("binds package creation details in schema order", async () => {
    const client = new RecordingSqlClient();

    await new PackageRepository(client).create({
      id: "package-2", packageCode: "PK-250604-00126", status: "open", operatorUserId: null,
      itemCount: 0, totalWeightMg: 0, closedAt: null, createdAt: "2026-09-10T11:00:00.000Z",
    } as CreatePackageInput);

    expect(client.executeCalls[0]?.bindValues).toEqual([
      "package-2", "PK-250604-00126", "open", null, 0, 0,
      "2026-09-10T11:00:00.000Z", "2026-09-10T11:00:00.000Z", null,
    ]);
  });

  it("reads package items joined with their product details", async () => {
    const client = new RecordingSqlClient().returns([
      {
        id: "item-1", package_id: "package-1", product_id: "product-1", scanned_at: "2026-09-10T10:01:00.000Z",
        scanned_by_user_id: null, weight_mg_snapshot: 4385, purity_per_mille_snapshot: 750,
        created_at: "2026-09-10T10:01:00.000Z", updated_at: "2026-09-10T10:01:00.000Z",
        product_code: "R-250604-00125", product_name: "انگشتر طرح گل", product_group_name: "انگشتر",
      },
    ]);

    const [detail] = await new PackageRepository(client).listItemDetails("package-1");

    expect(detail).toEqual({
      id: "item-1", productId: "product-1", productCode: "R-250604-00125", productName: "انگشتر طرح گل",
      groupName: "انگشتر", purityPerMille: 750, weightMgSnapshot: 4385, scannedAt: "2026-09-10T10:01:00.000Z",
    });
  });

  it("aggregates integer milligram totals for a package", async () => {
    const client = new RecordingSqlClient().returns([{ item_count: 6, total_weight_mg: 24862, purity_per_mille: 750 }]);

    expect(await new PackageRepository(client).summarize("package-1")).toEqual({
      itemCount: 6, totalWeightMg: 24862, purityPerMille: 750,
    });
  });

  it("reports a null assay when the package holds no items", async () => {
    const client = new RecordingSqlClient().returns([{ item_count: 0, total_weight_mg: 0, purity_per_mille: null }]);

    expect(await new PackageRepository(client).summarize("package-1")).toEqual({
      itemCount: 0, totalWeightMg: 0, purityPerMille: null,
    });
  });

  it("detects the item already holding a product inside a package", async () => {
    const found = new PackageRepository(new RecordingSqlClient().returns([{ id: "item-9" }]));
    const missing = new PackageRepository(new RecordingSqlClient().returns([]));

    expect(await found.findItemId("package-1", "product-1")).toBe("item-9");
    expect(await missing.findItemId("package-1", "product-2")).toBeNull();
  });

  it("removes an item, rewrites totals and closes a package with schema status values", async () => {
    const client = new RecordingSqlClient();
    const repository = new PackageRepository(client);

    await repository.removeItem("item-1");
    await repository.updateTotals({ id: "package-1", itemCount: 1, totalWeightMg: 1950, updatedAt: "2026-09-10T12:00:00.000Z" });
    await repository.closePackage({ id: "package-1", closedAt: "2026-09-10T12:05:00.000Z" });

    expect(client.executeCalls[0]?.bindValues).toEqual(["item-1"]);
    expect(client.executeCalls[1]?.bindValues).toEqual([1, 1950, "2026-09-10T12:00:00.000Z", "package-1"]);
    expect(client.executeCalls[2]?.sql).toContain("status = 'closed'");
    expect(client.executeCalls[2]?.bindValues).toEqual(["2026-09-10T12:05:00.000Z", "2026-09-10T12:05:00.000Z", "package-1"]);
  });
});
