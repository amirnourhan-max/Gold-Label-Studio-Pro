import { asUtcIsoString, type EntityId, type MainCategoryRecord, type ProductGroupRecord, type UtcIsoString, type WorkshopRecord } from "../types/persistence";
import type { SqlClient } from "../services/database/sql-client";

type RawProductGroupRow = {
  id: string;
  name: string;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type RawMainCategoryRow = RawProductGroupRow & {
  product_group_id: string;
};

type RawWorkshopRow = {
  id: string;
  name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const mapGroupRow = (row: RawProductGroupRow): ProductGroupRecord => ({
  id: row.id as EntityId,
  name: row.name,
  sortOrder: row.sort_order,
  isActive: row.is_active === 1,
  createdAt: asUtcIsoString(row.created_at),
  updatedAt: asUtcIsoString(row.updated_at),
  deletedAt: row.deleted_at === null ? null : asUtcIsoString(row.deleted_at),
});

const mapCategoryRow = (row: RawMainCategoryRow): MainCategoryRecord => ({
  ...mapGroupRow(row),
  productGroupId: row.product_group_id as EntityId,
});

const mapWorkshopRow = (row: RawWorkshopRow): WorkshopRecord => ({
  id: row.id as EntityId,
  name: row.name,
  isActive: row.is_active === 1,
  createdAt: asUtcIsoString(row.created_at),
  updatedAt: asUtcIsoString(row.updated_at),
  deletedAt: row.deleted_at === null ? null : asUtcIsoString(row.deleted_at),
});

const newEntityId = (): EntityId =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `catalog-${Date.now()}-${Math.random().toString(16).slice(2)}`) as EntityId;

export class CatalogRepository {
  constructor(private readonly client: SqlClient) {}

  listActiveGroups(): Promise<readonly ProductGroupRecord[]> {
    return this.client
      .select<RawProductGroupRow>(
        "SELECT * FROM product_groups WHERE is_active = 1 AND deleted_at IS NULL ORDER BY sort_order, name",
      )
      .then(rows => rows.map(mapGroupRow));
  }

  listActiveCategories(productGroupId: string): Promise<readonly MainCategoryRecord[]> {
    return this.client
      .select<RawMainCategoryRow>(
        "SELECT * FROM main_categories WHERE product_group_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY sort_order, name",
        [productGroupId],
      )
      .then(rows => rows.map(mapCategoryRow));
  }

  listActiveWorkshops(): Promise<readonly WorkshopRecord[]> {
    return this.client
      .select<RawWorkshopRow>(
        "SELECT * FROM workshops WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name",
      )
      .then(rows => rows.map(mapWorkshopRow));
  }

  createGroup(name: string, now: UtcIsoString | string): Promise<unknown> {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return Promise.reject(new Error("Product group name must not be empty"));
    }
    const timestamp = asUtcIsoString(now);
    return this.client.execute(
      "INSERT INTO product_groups (id, name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [newEntityId(), trimmedName, 0, 1, timestamp, timestamp],
    );
  }

  createCategory(productGroupId: string, name: string, now: UtcIsoString | string): Promise<unknown> {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return Promise.reject(new Error("Main category name must not be empty"));
    }
    const timestamp = asUtcIsoString(now);
    return this.client.execute(
      "INSERT INTO main_categories (id, product_group_id, name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [newEntityId(), productGroupId, trimmedName, 0, 1, timestamp, timestamp],
    );
  }

  createWorkshop(name: string, now: UtcIsoString | string): Promise<unknown> {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return Promise.reject(new Error("Workshop name must not be empty"));
    }
    const timestamp = asUtcIsoString(now);
    return this.client.execute(
      "INSERT INTO workshops (id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [newEntityId(), trimmedName, 1, timestamp, timestamp],
    );
  }

  softDeleteGroup(id: string, deletedAt: UtcIsoString | string): Promise<unknown> {
    const timestamp = asUtcIsoString(deletedAt);
    return this.client.execute(
      "UPDATE product_groups SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      [timestamp, timestamp, id],
    );
  }

  softDeleteCategory(id: string, deletedAt: UtcIsoString | string): Promise<unknown> {
    const timestamp = asUtcIsoString(deletedAt);
    return this.client.execute(
      "UPDATE main_categories SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      [timestamp, timestamp, id],
    );
  }

  softDeleteWorkshop(id: string, deletedAt: UtcIsoString | string): Promise<unknown> {
    const timestamp = asUtcIsoString(deletedAt);
    return this.client.execute(
      "UPDATE workshops SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      [timestamp, timestamp, id],
    );
  }
}
