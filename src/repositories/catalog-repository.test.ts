import { describe, expect, it } from "vitest";
import { CatalogRepository } from "./catalog-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";

describe("CatalogRepository", () => {
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
});
