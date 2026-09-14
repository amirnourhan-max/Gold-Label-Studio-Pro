import type { CreateProductInput, ProductRecord, UtcIsoString } from "../types/persistence";
import type { SqlClient } from "../services/database/sql-client";

export type ProductListRecord = ProductRecord & Readonly<{
  productGroupName: string | null;
  mainCategoryName: string | null;
}>;

const productColumns = `
  p.id, p.product_code AS productCode, p.name, p.product_group_id AS productGroupId,
  p.main_category_id AS mainCategoryId, p.workshop_id AS workshopId,
  p.label_template_id AS labelTemplateId, p.purity_per_mille AS purityPerMille,
  p.weight_mg AS weightMg, p.stone_weight_mg AS stoneWeightMg, p.size, p.quantity,
  p.image_path AS imagePath, p.note, p.status, p.created_at AS createdAt,
  p.updated_at AS updatedAt, p.deleted_at AS deletedAt`;

export class ProductRepository {
  constructor(private readonly client: SqlClient) {}

  listActive(): Promise<readonly ProductRecord[]> {
    return this.client.select<ProductRecord>(
      `SELECT ${productColumns} FROM products p
       WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC, p.product_code`,
    );
  }

  listActiveWithCatalog(): Promise<readonly ProductListRecord[]> {
    return this.client.select<ProductListRecord>(
      `SELECT ${productColumns}, pg.name AS productGroupName, mc.name AS mainCategoryName
       FROM products p
       LEFT JOIN product_groups pg ON pg.id = p.product_group_id
       LEFT JOIN main_categories mc ON mc.id = p.main_category_id
       WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC, p.product_code`,
    );
  }

  findActiveByCode(productCode: string): Promise<readonly ProductRecord[]> {
    return this.client.select<ProductRecord>(
      `SELECT ${productColumns} FROM products p
       WHERE p.product_code = ? AND p.deleted_at IS NULL LIMIT 1`,
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
