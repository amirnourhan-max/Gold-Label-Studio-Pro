import type { PackageItemRecord, PackageRecord } from "../types/persistence";
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

export class PackageRepository {
  constructor(private readonly client: SqlClient) {}

  listOpen(): Promise<readonly PackageRecord[]> {
    return this.client.select<PackageRecord>("SELECT * FROM packages WHERE status = 'open' ORDER BY created_at DESC");
  }

  listItems(packageId: string): Promise<readonly PackageItemRecord[]> {
    return this.client.select<PackageItemRecord>("SELECT * FROM package_items WHERE package_id = ? ORDER BY scanned_at", [packageId]);
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
}
