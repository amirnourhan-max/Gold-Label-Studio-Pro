import type { MainCategoryRecord, ProductGroupRecord, UtcIsoString, WorkshopRecord } from "../types/persistence";
import type { SqlClient } from "../services/database/sql-client";

export class CatalogRepository {
  constructor(private readonly client: SqlClient) {}

  listActiveGroups(): Promise<readonly ProductGroupRecord[]> {
    return this.client.select<ProductGroupRecord>(
      "SELECT * FROM product_groups WHERE is_active = 1 AND deleted_at IS NULL ORDER BY sort_order, name",
    );
  }

  listActiveCategories(productGroupId: string): Promise<readonly MainCategoryRecord[]> {
    return this.client.select<MainCategoryRecord>(
      "SELECT * FROM main_categories WHERE product_group_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY sort_order, name",
      [productGroupId],
    );
  }

  listActiveWorkshops(): Promise<readonly WorkshopRecord[]> {
    return this.client.select<WorkshopRecord>(
      "SELECT * FROM workshops WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name",
    );
  }

  softDeleteWorkshop(id: string, deletedAt: UtcIsoString | string): Promise<unknown> {
    return this.client.execute(
      "UPDATE workshops SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      [deletedAt, deletedAt, id],
    );
  }
}
