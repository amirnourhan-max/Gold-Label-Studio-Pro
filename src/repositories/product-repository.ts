import type { CreateProductInput, ProductRecord, UtcIsoString } from "../types/persistence";
import type { SqlClient } from "../services/database/sql-client";

export class ProductRepository {
  constructor(private readonly client: SqlClient) {}

  listActive(): Promise<readonly ProductRecord[]> {
    return this.client.select<ProductRecord>(
      "SELECT * FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC, product_code",
    );
  }

  findActiveByCode(productCode: string): Promise<readonly ProductRecord[]> {
    return this.client.select<ProductRecord>(
      "SELECT * FROM products WHERE product_code = ? AND deleted_at IS NULL LIMIT 1",
      [productCode],
    );
  }

  create(input: CreateProductInput): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO products (
        id, product_code, name, product_group_id, main_category_id, workshop_id, label_template_id,
        purity_per_mille, weight_mg, stone_weight_mg, size, quantity, image_path, note, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id, input.productCode, input.name, input.productGroupId, input.mainCategoryId, input.workshopId,
        input.labelTemplateId, input.purityPerMille, input.weightMg, input.stoneWeightMg, input.size,
        input.quantity, input.imagePath, input.note, input.status, input.createdAt, input.createdAt,
      ],
    );
  }

  softDelete(id: string, deletedAt: UtcIsoString | string): Promise<unknown> {
    return this.client.execute(
      "UPDATE products SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      [deletedAt, deletedAt, id],
    );
  }
}
