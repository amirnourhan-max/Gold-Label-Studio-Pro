import { describe, expect, it } from "vitest";
import { RecordingSqlClient } from "../../repositories/test-support/recording-sql-client";
import { SqlReturnProductLookup } from "./sql-return-product-lookup";

describe("SqlReturnProductLookup", () => {
  it("loads only non-deleted products and preserves integer milligram weight", async () => {
    const client = new RecordingSqlClient().returns([
      { id: "product-1", code: "R-001", name: "انگشتر", groupName: "حلقه", weightMg: 4385 },
    ]);

    const product = await new SqlReturnProductLookup(client).findReturnProduct("R-001");

    expect(product?.weightMg).toBe(4385);
    expect(client.selectCalls[0]?.sql).toContain("p.weight_mg AS weightMg");
    expect(client.selectCalls[0]?.sql).toContain("p.deleted_at IS NULL");
    expect(client.selectCalls[0]?.bindValues).toEqual(["R-001"]);
  });
});
