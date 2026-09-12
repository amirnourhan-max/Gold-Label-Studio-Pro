import {
  asUtcIsoString,
  type CreateMainCategoryInput,
  type CreateProductGroupInput,
  type CreateWorkshopInput,
  type EntityId,
  type MainCategoryRecord,
  type ProductGroupRecord,
  type UtcIsoString,
  type WorkshopRecord,
} from "../types/persistence";
import type { SqlClient } from "../services/database/sql-client";

type AuditRow = Readonly<{
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}>;

type ProductGroupRow = AuditRow & Readonly<{
  id: string;
  name: string;
  sort_order: number;
  is_active: number;
}>;

type MainCategoryRow = ProductGroupRow & Readonly<{ product_group_id: string }>;
type WorkshopRow = AuditRow & Readonly<{ id: string; name: string; is_active: number }>;

const mapAudit = (row: AuditRow) => ({
  createdAt: asUtcIsoString(row.created_at),
  updatedAt: asUtcIsoString(row.updated_at),
  deletedAt: row.deleted_at === null ? null : asUtcIsoString(row.deleted_at),
});

const mapGroup = (row: ProductGroupRow): ProductGroupRecord => ({
  id: row.id as EntityId,
  name: row.name,
  sortOrder: row.sort_order,
  isActive: row.is_active === 1,
  ...mapAudit(row),
});

const mapCategory = (row: MainCategoryRow): MainCategoryRecord => ({
  id: row.id as EntityId,
  productGroupId: row.product_group_id as EntityId,
  name: row.name,
  sortOrder: row.sort_order,
  isActive: row.is_active === 1,
  ...mapAudit(row),
});

const mapWorkshop = (row: WorkshopRow): WorkshopRecord => ({
  id: row.id as EntityId,
  name: row.name,
  isActive: row.is_active === 1,
  ...mapAudit(row),
});

export class CatalogRepository {
  constructor(private readonly client: SqlClient) {}

  async listActiveGroups(): Promise<readonly ProductGroupRecord[]> {
    const rows = await this.client.select<ProductGroupRow>(
      "SELECT * FROM product_groups WHERE is_active = 1 AND deleted_at IS NULL ORDER BY sort_order, name",
    );
    return rows.map(mapGroup);
  }

  async listActiveCategories(productGroupId: string): Promise<readonly MainCategoryRecord[]> {
    const rows = await this.client.select<MainCategoryRow>(
      "SELECT * FROM main_categories WHERE product_group_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY sort_order, name",
      [productGroupId],
    );
    return rows.map(mapCategory);
  }

  async listActiveWorkshops(): Promise<readonly WorkshopRecord[]> {
    const rows = await this.client.select<WorkshopRow>(
      "SELECT * FROM workshops WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name",
    );
    return rows.map(mapWorkshop);
  }

  createGroup(input: CreateProductGroupInput): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO product_groups (id, name, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [input.id, input.name, input.sortOrder, input.createdAt, input.createdAt],
    );
  }

  createCategory(input: CreateMainCategoryInput): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO main_categories (id, product_group_id, name, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.id, input.productGroupId, input.name, input.sortOrder, input.createdAt, input.createdAt],
    );
  }

  createWorkshop(input: CreateWorkshopInput): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO workshops (id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      [input.id, input.name, input.createdAt, input.createdAt],
    );
  }

  softDeleteGroup(id: string, deletedAt: UtcIsoString | string): Promise<unknown> {
    return this.client.execute(
      "UPDATE product_groups SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      [deletedAt, deletedAt, id],
    );
  }

  softDeleteCategory(id: string, deletedAt: UtcIsoString | string): Promise<unknown> {
    return this.client.execute(
      "UPDATE main_categories SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      [deletedAt, deletedAt, id],
    );
  }

  softDeleteWorkshop(id: string, deletedAt: UtcIsoString | string): Promise<unknown> {
    return this.client.execute(
      "UPDATE workshops SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      [deletedAt, deletedAt, id],
    );
  }
}
