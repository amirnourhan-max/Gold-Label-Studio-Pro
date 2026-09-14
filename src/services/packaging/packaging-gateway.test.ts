import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecordingSqlClient } from "../../repositories/test-support/recording-sql-client";
import type { SqlClient } from "../database/sql-client";

const connection = vi.hoisted(() => ({
  open: (async () => {
    throw new Error("sqlite is unavailable in this runtime");
  }) as () => Promise<SqlClient>,
  attempts: 0,
}));

vi.mock("../database/database-bootstrap", () => ({
  openPersistenceDatabase: async () => {
    connection.attempts += 1;

    return connection.open();
  },
}));

const { createDefaultPackagingGateway, createProductLookup } = await import("./packaging-gateway");

const packageRow = {
  id: "package-1", package_code: "PK-260910-00001", status: "open", operator_user_id: null,
  item_count: 1, total_weight_mg: 4385, closed_at: null,
  created_at: "2026-09-10T10:00:00.000Z", updated_at: "2026-09-10T10:00:00.000Z",
};

const detailRow = {
  id: "item-1", package_id: "package-1", product_id: "product-1", scanned_at: "2026-09-10T10:00:00.000Z",
  scanned_by_user_id: null, weight_mg_snapshot: 4385, purity_per_mille_snapshot: 750,
  created_at: "2026-09-10T10:00:00.000Z", updated_at: "2026-09-10T10:00:00.000Z",
  product_code: "R-250604-00125", product_name: "انگشتر طرح گل", product_group_name: "انگشتر",
};

beforeEach(() => {
  connection.attempts = 0;
  connection.open = async () => {
    throw new Error("sqlite is unavailable in this runtime");
  };
});

describe("packaging gateway selection", () => {
  it("falls back to the approved preview session when SQLite cannot open", async () => {
    const session = await createDefaultPackagingGateway().loadSession();

    expect(connection.attempts).toBe(1);
    expect(session.summary.packageCode).toBe("PK-250604-00125");
    expect(session.items).toHaveLength(6);
    expect(session.summary.totalWeightLabel).toBe("24.862 g");
  });

  it("uses SQLite persistence as soon as the database opens", async () => {
    const client = new RecordingSqlClient().returnsInOrder([packageRow], [detailRow]);
    connection.open = async () => client;

    const gateway = createDefaultPackagingGateway();
    const session = await gateway.loadSession();

    await gateway.loadSession();

    expect(connection.attempts).toBe(1);
    expect(session.summary.packageCode).toBe("PK-260910-00001");
    expect(session.items).toHaveLength(1);
    expect(session.items[0]?.weightGrams).toBe("4.385");
  });

  it("maps product rows through the narrow lookup boundary", async () => {
    const client = new RecordingSqlClient().returns([
      { id: "product-1", product_code: "R-250604-00125", name: "انگشتر طرح گل", purity_per_mille: 750, weight_mg: 4385 },
    ]);

    const lookup = createProductLookup(client);

    expect(await lookup.findByCode("R-250604-00125")).toEqual({
      id: "product-1", code: "R-250604-00125", name: "انگشتر طرح گل", purityPerMille: 750, weightMg: 4385,
    });

    const missingClient = new RecordingSqlClient().returns([]);

    expect(await createProductLookup(missingClient).findByCode("X-260604-00001")).toBeNull();
  });
});
