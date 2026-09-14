import { describe, expect, it } from "vitest";
import { RecordingSqlClient } from "../../repositories/test-support/recording-sql-client";
import type { SqlClient, SqlStatementResult } from "../database/sql-client";
import type { PackagingProductLookup } from "./packaging-contract";
import { createMockPackagingGateway } from "./mock-packaging-gateway";
import { createPersistencePackagingGateway } from "./persistence-packaging-gateway";

const feedbackSeparator = "\u3000|\u3000";
const fixedNow = new Date("2026-09-10T10:00:00.000Z");
const clock = () => new Date(fixedNow);

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

const ringProduct = {
  id: "product-1", code: "R-250604-00125", name: "انگشتر طرح گل", purityPerMille: 750, weightMg: 4385,
};

const productLookup = (product = ringProduct): PackagingProductLookup => ({
  findByCode: async (productCode) => (productCode === product.code ? product : null),
});

const gatewayFor = (client: SqlClient, ids: readonly string[] = ["item-1", "package-2"]) => {
  let index = 0;

  return createPersistencePackagingGateway({
    client,
    productLookup: productLookup(),
    clock,
    createId: () => ids[index++] ?? `generated-${index}`,
  });
};

describe("persistence packaging gateway", () => {
  it("loads an empty session while no package is open", async () => {
    const session = await gatewayFor(new RecordingSqlClient().returnsInOrder([])).loadSession();

    expect(session.packageId).toBeNull();
    expect(session.items).toEqual([]);
    expect(session.summary.statusLabel).toBe("بدون بسته فعال");
    expect(session.summary.itemCountLabel).toBe("۰ قلم");
    expect(session.summary.totalWeightLabel).toBe("0.000 g");
    expect(session.summary.packageCode).toBe("—");
  });

  it("creates a real package row with a generated PK code", async () => {
    const client = new RecordingSqlClient().returnsInOrder([{ total: 0 }], []);

    const session = await gatewayFor(client).createPackage();

    expect(client.executeCalls[0]?.sql).toContain("INSERT INTO packages");
    expect(client.executeCalls[0]?.bindValues).toEqual([
      "item-1", "PK-260910-00001", "open", null, 0, 0,
      "2026-09-10T10:00:00.000Z", "2026-09-10T10:00:00.000Z", null,
    ]);
    expect(session.summary.packageCode).toBe("PK-260910-00001");
    expect(session.summary.statusLabel).toBe("در حال بسته‌بندی");
    expect(session.summary.itemCountLabel).toBe("۰ قلم");
  });

  it("adds an item with a milligram snapshot and rewrites the package totals", async () => {
    const client = new RecordingSqlClient().returnsInOrder(
      [packageRow],
      [],
      [{ item_count: 1, total_weight_mg: 4385, purity_per_mille: 750 }],
      [detailRow],
    );

    const result = await gatewayFor(client).addItemByCode(" r-250604-00125 ");

    expect(result.outcome).toBe("accepted");
    expect(client.executeCalls[0]?.sql).toContain("INSERT INTO package_items");
    expect(client.executeCalls[0]?.bindValues).toEqual([
      "item-1", "package-1", "product-1", "2026-09-10T10:00:00.000Z", null, 4385, 750,
      "2026-09-10T10:00:00.000Z", "2026-09-10T10:00:00.000Z",
    ]);
    expect(client.executeCalls[1]?.bindValues).toEqual([1, 4385, "2026-09-10T10:00:00.000Z", "package-1"]);
    expect(result.session.items).toEqual([
      {
        id: "item-1", productCode: "R-250604-00125", name: "انگشتر طرح گل", groupName: "انگشتر",
        purityLabel: "750", weightGrams: "4.385",
      },
    ]);
    expect(result.session.summary.itemCountLabel).toBe("۱ قلم");
    expect(result.session.summary.totalWeightLabel).toBe("4.385 g");
    expect(result.session.summary.purityLabel).toBe("750");
    expect(result.session.feedback.error).toBeNull();
    expect(result.session.feedback.accepted?.title).toBe("اسکن موفق");
    expect(result.session.feedback.accepted?.message).toBe("انگشتر طرح گل به بسته اضافه شد");
    expect(result.session.feedback.accepted?.detail).toBe(`R-250604-00125${feedbackSeparator}4.385 g`);
  });

  it("refuses to add the same product twice to one package", async () => {
    const client = new RecordingSqlClient().returnsInOrder([packageRow], [{ id: "item-1" }], []);

    const result = await gatewayFor(client).addItemByCode("R-250604-00125");

    expect(result.outcome).toBe("duplicate");
    expect(client.executeCalls).toHaveLength(0);
    expect(result.session.feedback.accepted).toBeNull();
    expect(result.session.feedback.error?.title).toBe("اسکن تکراری");
    expect(result.session.feedback.error?.message).toBe("این محصول قبلاً در بسته فعلی اسکن شده است");
    expect(result.session.feedback.error?.detail).toBe("R-250604-00125");
  });

  it("maps a unique-constraint violation to the duplicate state", async () => {
    const client = new RecordingSqlClient().returnsInOrder([packageRow], [], []);
    client.execute = async (): Promise<SqlStatementResult> => {
      throw new Error("UNIQUE constraint failed: package_items.package_id, package_items.product_id");
    };

    const result = await gatewayFor(client).addItemByCode("R-250604-00125");

    expect(result.outcome).toBe("duplicate");
    expect(result.session.feedback.error?.title).toBe("اسکن تکراری");
  });

  it("reports invalid codes and unknown products without writing anything", async () => {
    const invalidClient = new RecordingSqlClient().returnsInOrder([]);
    const unknownClient = new RecordingSqlClient().returnsInOrder([packageRow], []);

    const invalid = await gatewayFor(invalidClient).addItemByCode("!!");
    const unknown = await gatewayFor(unknownClient).addItemByCode("X-260604-00001");

    expect(invalid.outcome).toBe("invalid-code");
    expect(invalid.session.feedback.error?.title).toBe("کد محصول نامعتبر");
    expect(unknown.outcome).toBe("unknown-product");
    expect(unknown.session.feedback.error?.title).toBe("محصول یافت نشد");
    expect(invalidClient.executeCalls).toHaveLength(0);
    expect(unknownClient.executeCalls).toHaveLength(0);
  });

  it("removes an item and keeps the totals consistent", async () => {
    const client = new RecordingSqlClient().returnsInOrder(
      [packageRow],
      [detailRow],
      [detailRow],
      [{ item_count: 1, total_weight_mg: 1950, purity_per_mille: 750 }],
      [{ ...detailRow, weight_mg_snapshot: 1950, product_code: "P-250604-00099", product_name: "پلاک اسم محمد" }],
    );

    const session = await gatewayFor(client).removeLastItem();

    expect(client.executeCalls[0]?.sql).toContain("DELETE FROM package_items");
    expect(client.executeCalls[0]?.bindValues).toEqual(["item-1"]);
    expect(client.executeCalls[1]?.bindValues).toEqual([1, 1950, "2026-09-10T10:00:00.000Z", "package-1"]);
    expect(session.items).toHaveLength(1);
    expect(session.summary.totalWeightLabel).toBe("1.950 g");
  });

  it("completes a package using the schema closed status", async () => {
    const client = new RecordingSqlClient().returnsInOrder([packageRow], [detailRow], [detailRow]);

    const session = await gatewayFor(client).completePackage();

    expect(client.executeCalls[0]?.sql).toContain("status = 'closed'");
    expect(client.executeCalls[0]?.bindValues).toEqual([
      "2026-09-10T10:00:00.000Z", "2026-09-10T10:00:00.000Z", "package-1",
    ]);
    expect(session.summary.status).toBe("closed");
    expect(session.summary.statusLabel).toBe("بسته‌بندی تکمیل شده");
    expect(session.items).toHaveLength(1);
  });

  it("keeps the package and its items after persistence is reopened", async () => {
    const firstClient = new RecordingSqlClient().returnsInOrder(
      [{ total: 0 }],
      [],
      [packageRow],
      [],
      [{ item_count: 1, total_weight_mg: 4385, purity_per_mille: 750 }],
      [detailRow],
    );
    const firstGateway = gatewayFor(firstClient);

    const created = await firstGateway.createPackage();
    const scanned = await firstGateway.addItemByCode("R-250604-00125");

    expect(created.summary.packageCode).toBe("PK-260910-00001");
    expect(scanned.outcome).toBe("accepted");

    const packageInsert = firstClient.executeCalls[0]?.bindValues as readonly unknown[];
    const totalsUpdate = firstClient.executeCalls[2]?.bindValues as readonly unknown[];
    const itemsInsert = firstClient.executeCalls[1]?.bindValues as readonly unknown[];

    // Reopening the database reads the rows the first session actually wrote.
    const persistedPackageRow = {
      id: packageInsert[0], package_code: packageInsert[1], status: packageInsert[2],
      operator_user_id: packageInsert[3], item_count: totalsUpdate[0], total_weight_mg: totalsUpdate[1],
      closed_at: packageInsert[8], created_at: packageInsert[6], updated_at: totalsUpdate[2],
    };
    const persistedItemRow = {
      id: itemsInsert[0], package_id: itemsInsert[1], product_id: itemsInsert[2], scanned_at: itemsInsert[3],
      scanned_by_user_id: itemsInsert[4], weight_mg_snapshot: itemsInsert[5], purity_per_mille_snapshot: itemsInsert[6],
      created_at: itemsInsert[7], updated_at: itemsInsert[8],
      product_code: detailRow.product_code, product_name: detailRow.product_name,
      product_group_name: detailRow.product_group_name,
    };
    const reopenedClient = new RecordingSqlClient().returnsInOrder([persistedPackageRow], [persistedItemRow]);

    const reopened = await gatewayFor(reopenedClient).loadSession();

    expect(reopened.summary.packageCode).toBe("PK-260910-00001");
    expect(reopened.summary.status).toBe("open");
    expect(reopened.items).toHaveLength(1);
    expect(reopened.items[0]?.productCode).toBe("R-250604-00125");
    expect(reopened.summary.totalWeightLabel).toBe("4.385 g");
    expect(reopened.summary.itemCountLabel).toBe("۱ قلم");
  });
});

describe("mock packaging gateway", () => {
  it("serves the approved preview session", async () => {
    const session = await createMockPackagingGateway({ clock, initialCreatedAtMs: fixedNow.getTime() - 877_000 }).loadSession();

    expect(session.summary.packageCode).toBe("PK-250604-00125");
    expect(session.items).toHaveLength(6);
    expect(session.summary.itemCountLabel).toBe("۶ قلم");
    expect(session.summary.totalWeightLabel).toBe("24.862 g");
    expect(session.summary.operatorName).toBe("Admin");
    expect(session.summary.operatorRole).toBe("اپراتور ارشد");
    expect(session.items[0]?.weightGrams).toBe("4.385");
    expect(session.feedback.accepted?.timeLabel).toBe("10:24:15");
    expect(session.feedback.error?.timeLabel).toBe("10:24:18");
  });

  it("applies the same scan rules as the persistence gateway", async () => {
    const gateway = createMockPackagingGateway({ clock, initialCreatedAtMs: fixedNow.getTime() - 877_000 });

    const duplicate = await gateway.addItemByCode("R-250604-00125");
    const accepted = await gateway.addItemByCode("R-250604-00130");
    const unknown = await gateway.addItemByCode("X-260604-00001");

    expect(duplicate.outcome).toBe("duplicate");
    expect(accepted.outcome).toBe("accepted");
    expect(accepted.session.items).toHaveLength(7);
    expect(accepted.session.summary.totalWeightLabel).toBe("28.342 g");
    expect(accepted.session.summary.itemCountLabel).toBe("۷ قلم");
    expect(unknown.outcome).toBe("unknown-product");
  });

  it("creates, empties and completes a preview package", async () => {
    const gateway = createMockPackagingGateway({ clock, initialCreatedAtMs: fixedNow.getTime() - 877_000 });

    const created = await gateway.createPackage();
    const completed = await gateway.completePackage();

    expect(created.items).toHaveLength(0);
    expect(created.summary.itemCountLabel).toBe("۰ قلم");
    expect(created.summary.packageCode).toMatch(/^PK-\d{6}-\d{5}$/);
    expect(completed.summary.status).toBe("closed");
  });
});
