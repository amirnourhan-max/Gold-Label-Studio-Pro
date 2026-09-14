import type {
  CreatePackageInput,
  PackageItemRecord,
  PackageRecord,
  PackageStatus,
  UtcIsoString,
  WeightMg,
} from "../types/persistence";
import type { SqlClient } from "../services/database/sql-client";

export type AddPackageItemInput = Readonly<{
  id: string;
  packageId: string;
  productId: string;
  scannedAt: string;
  scannedByUserId: string | null;
  weightMgSnapshot: number;
  purityPerMilleSnapshot: number;
  createdAt: string;
}>;

/** Item row joined with the product information the packaging table displays. */
export type PackageItemDetail = Readonly<{
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  groupName: string | null;
  purityPerMille: number;
  weightMgSnapshot: number;
  scannedAt: string;
}>;

export type PackageTotals = Readonly<{
  itemCount: number;
  totalWeightMg: number;
  purityPerMille: number | null;
}>;

type RawPackageRow = {
  id: string;
  package_code: string;
  status: string;
  operator_user_id: string | null;
  item_count: number;
  total_weight_mg: number;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

type RawPackageItemRow = {
  id: string;
  package_id: string;
  product_id: string;
  scanned_at: string;
  scanned_by_user_id: string | null;
  weight_mg_snapshot: number;
  purity_per_mille_snapshot: number;
  created_at: string;
  updated_at: string;
};

type RawPackageItemDetailRow = RawPackageItemRow & {
  product_code: string;
  product_name: string;
  product_group_name: string | null;
};

type RawTotalsRow = {
  item_count: number;
  total_weight_mg: number;
  purity_per_mille: number | null;
};

const mapPackageRow = (row: RawPackageRow): PackageRecord => ({
  id: row.id as PackageRecord["id"],
  packageCode: row.package_code,
  status: row.status as PackageStatus,
  operatorUserId: row.operator_user_id as PackageRecord["operatorUserId"],
  itemCount: row.item_count,
  totalWeightMg: row.total_weight_mg as WeightMg,
  closedAt: row.closed_at as UtcIsoString | null,
  createdAt: row.created_at as UtcIsoString,
  updatedAt: row.updated_at as UtcIsoString,
});

const mapItemRow = (row: RawPackageItemRow): PackageItemRecord => ({
  id: row.id as PackageItemRecord["id"],
  packageId: row.package_id as PackageItemRecord["packageId"],
  productId: row.product_id as PackageItemRecord["productId"],
  scannedAt: row.scanned_at as UtcIsoString,
  scannedByUserId: row.scanned_by_user_id as PackageItemRecord["scannedByUserId"],
  weightMgSnapshot: row.weight_mg_snapshot as WeightMg,
  purityPerMilleSnapshot: row.purity_per_mille_snapshot,
  createdAt: row.created_at as UtcIsoString,
  updatedAt: row.updated_at as UtcIsoString,
});

export class PackageRepository {
  constructor(private readonly client: SqlClient) {}

  async listOpen(): Promise<readonly PackageRecord[]> {
    const rows = await this.client.select<RawPackageRow>(
      "SELECT * FROM packages WHERE status = 'open' ORDER BY created_at DESC, rowid DESC",
    );

    return rows.map(mapPackageRow);
  }

  async findLatestOpen(): Promise<PackageRecord | null> {
    const rows = await this.client.select<RawPackageRow>(
      "SELECT * FROM packages WHERE status = 'open' ORDER BY created_at DESC, rowid DESC LIMIT 1",
    );

    return rows.length > 0 ? mapPackageRow(rows[0] as RawPackageRow) : null;
  }

  async findLatest(): Promise<PackageRecord | null> {
    const rows = await this.client.select<RawPackageRow>(
      "SELECT * FROM packages ORDER BY created_at DESC, rowid DESC LIMIT 1",
    );

    return rows.length > 0 ? mapPackageRow(rows[0] as RawPackageRow) : null;
  }

  async listItems(packageId: string): Promise<readonly PackageItemRecord[]> {
    const rows = await this.client.select<RawPackageItemRow>(
      "SELECT * FROM package_items WHERE package_id = ? ORDER BY scanned_at, created_at",
      [packageId],
    );

    return rows.map(mapItemRow);
  }

  async listItemDetails(packageId: string): Promise<readonly PackageItemDetail[]> {
    const rows = await this.client.select<RawPackageItemDetailRow>(
      `SELECT package_items.*, products.product_code, products.name AS product_name,
        product_groups.name AS product_group_name
      FROM package_items
      INNER JOIN products ON products.id = package_items.product_id
      LEFT JOIN product_groups ON product_groups.id = products.product_group_id
      WHERE package_items.package_id = ?
      ORDER BY package_items.scanned_at, package_items.created_at`,
      [packageId],
    );

    return rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      productCode: row.product_code,
      productName: row.product_name,
      groupName: row.product_group_name,
      purityPerMille: row.purity_per_mille_snapshot,
      weightMgSnapshot: row.weight_mg_snapshot,
      scannedAt: row.scanned_at,
    }));
  }

  /** Resolves the package item already holding this product, enabling duplicate handling. */
  async findItemId(packageId: string, productId: string): Promise<string | null> {
    const rows = await this.client.select<{ id: string }>(
      "SELECT id FROM package_items WHERE package_id = ? AND product_id = ? LIMIT 1",
      [packageId, productId],
    );

    return rows.length > 0 ? (rows[0] as { id: string }).id : null;
  }

  async summarize(packageId: string): Promise<PackageTotals> {
    const rows = await this.client.select<RawTotalsRow>(
      `SELECT COUNT(*) AS item_count, COALESCE(SUM(weight_mg_snapshot), 0) AS total_weight_mg,
        MAX(purity_per_mille_snapshot) AS purity_per_mille
      FROM package_items WHERE package_id = ?`,
      [packageId],
    );

    const row = rows[0];

    return {
      itemCount: row ? Number(row.item_count) : 0,
      totalWeightMg: row ? Number(row.total_weight_mg) : 0,
      purityPerMille: row && row.purity_per_mille !== null ? Number(row.purity_per_mille) : null,
    };
  }

  async countByCodePrefix(codePrefix: string): Promise<number> {
    const rows = await this.client.select<{ total: number }>(
      "SELECT COUNT(*) AS total FROM packages WHERE package_code LIKE ?",
      [`${codePrefix}%`],
    );

    return rows.length > 0 ? Number((rows[0] as { total: number }).total) : 0;
  }

  create(input: CreatePackageInput): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO packages (
        id, package_code, status, operator_user_id, item_count, total_weight_mg,
        created_at, updated_at, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id, input.packageCode, input.status, input.operatorUserId, input.itemCount,
        input.totalWeightMg, input.createdAt, input.createdAt, input.closedAt,
      ],
    );
  }

  addItem(input: AddPackageItemInput): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO package_items (
        id, package_id, product_id, scanned_at, scanned_by_user_id, weight_mg_snapshot,
        purity_per_mille_snapshot, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id, input.packageId, input.productId, input.scannedAt, input.scannedByUserId, input.weightMgSnapshot,
        input.purityPerMilleSnapshot, input.createdAt, input.createdAt,
      ],
    );
  }

  removeItem(itemId: string): Promise<unknown> {
    return this.client.execute("DELETE FROM package_items WHERE id = ?", [itemId]);
  }

  updateTotals(input: Readonly<{ id: string; itemCount: number; totalWeightMg: number; updatedAt: string }>): Promise<unknown> {
    return this.client.execute(
      "UPDATE packages SET item_count = ?, total_weight_mg = ?, updated_at = ? WHERE id = ?",
      [input.itemCount, input.totalWeightMg, input.updatedAt, input.id],
    );
  }

  /** Completes a package. Status values are constrained by the schema, so only 'closed' is written. */
  closePackage(input: Readonly<{ id: string; closedAt: string }>): Promise<unknown> {
    return this.client.execute(
      "UPDATE packages SET status = 'closed', closed_at = ?, updated_at = ? WHERE id = ? AND status = 'open'",
      [input.closedAt, input.closedAt, input.id],
    );
  }
}
