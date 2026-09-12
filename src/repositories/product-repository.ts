import {
  asUtcIsoString,
  type CreateProductInput,
  type EntityId,
  type ProductCatalogRecord,
  type ProductId,
  type ProductPersistenceStatus,
  type ProductRecord,
  type UtcIsoString,
  type WeightMg,
} from "../types/persistence";
import type { SqlClient } from "../services/database/sql-client";

type ProductRow = Readonly<{
  id: string;
  product_code: string;
  name: string;
  product_group_id: string | null;
  main_category_id: string | null;
  workshop_id: string | null;
  label_template_id: string | null;
  purity_per_mille: number;
  weight_mg: number;
  stone_weight_mg: number;
  size: string | null;
  quantity: number;
  image_path: string | null;
  note: string | null;
  status: ProductPersistenceStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}>;

type ProductCatalogRow = ProductRow & Readonly<{
  group_name: string | null;
  category_name: string | null;
  workshop_name: string | null;
}>;

const mapProduct = (row: ProductRow): ProductRecord => ({
  id: row.id as ProductId,
  productCode: row.product_code,
  name: row.name,
  productGroupId: row.product_group_id as EntityId | null,
  mainCategoryId: row.main_category_id as EntityId | null,
  workshopId: row.workshop_id as EntityId | null,
  labelTemplateId: row.label_template_id as EntityId | null,
  purityPerMille: row.purity_per_mille,
  weightMg: row.weight_mg as WeightMg,
  stoneWeightMg: row.stone_weight_mg as WeightMg,
  size: row.size,
  quantity: row.quantity,
  imagePath: row.image_path,
  note: row.note,
  status: row.status,
  createdAt: asUtcIsoString(row.created_at),
  updatedAt: asUtcIsoString(row.updated_at),
  deletedAt: row.deleted_at === null ? null : asUtcIsoString(row.deleted_at),
});

export class ProductRepository {
  constructor(private readonly client: SqlClient) {}

  async listActive(): Promise<readonly ProductRecord[]> {
    const rows = await this.client.select<ProductRow>(
      "SELECT * FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC, product_code",
    );
    return rows.map(mapProduct);
  }

  async findActiveByCode(productCode: string): Promise<readonly ProductRecord[]> {
    const rows = await this.client.select<ProductRow>(
      "SELECT * FROM products WHERE product_code = ? AND deleted_at IS NULL LIMIT 1",
      [productCode],
    );
    return rows.map(mapProduct);
  }

  async listActiveCatalog(): Promise<readonly ProductCatalogRecord[]> {
    const rows = await this.client.select<ProductCatalogRow>(
      `SELECT products.*,
              product_groups.name AS group_name,
              main_categories.name AS category_name,
              workshops.name AS workshop_name
       FROM products
       LEFT JOIN product_groups ON product_groups.id = products.product_group_id
       LEFT JOIN main_categories ON main_categories.id = products.main_category_id
       LEFT JOIN workshops ON workshops.id = products.workshop_id
       WHERE products.deleted_at IS NULL
       ORDER BY products.created_at DESC, products.product_code`,
    );
    return rows.map(row => ({
      ...mapProduct(row),
      groupName: row.group_name,
      categoryName: row.category_name,
      workshopName: row.workshop_name,
    }));
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
