import { describe, expect, it } from "vitest";
import { ProductRepository } from "../../repositories/product-repository";
import { RecordingSqlClient } from "../../repositories/test-support/recording-sql-client";
import { PersistenceProductGateway } from "./persistence-product-gateway";

describe("PersistenceProductGateway", () => {
  it("loads active product rows with catalog display joins", async () => {
    const client = new RecordingSqlClient().returns([]);

    await new PersistenceProductGateway(new ProductRepository(client)).listActive();

    expect(client.selectCalls[0]?.sql).toContain("LEFT JOIN product_groups");
    expect(client.selectCalls[0]?.sql).toContain("p.deleted_at IS NULL");
    expect(client.selectCalls[0]?.sql).toContain("weightMg");
  });

  it("delegates soft-delete to ProductRepository", async () => {
    const client = new RecordingSqlClient();
    await new PersistenceProductGateway(new ProductRepository(client)).softDelete(
      "product-1", "2026-09-10T00:00:00.000Z",
    );
    expect(client.executeCalls[0]?.sql).toContain("deleted_at = ?");
    expect(client.executeCalls[0]?.sql).not.toContain("DELETE FROM");
  });
});
