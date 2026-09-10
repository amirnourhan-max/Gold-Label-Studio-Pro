import { describe, expect, it } from "vitest";
import { PackageRepository } from "./package-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";

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
});
