import type { EntityId } from "../../types/persistence";

export type CatalogGroupView = Readonly<{
  id: EntityId;
  name: string;
  /** Optional approved asset hint so the fallback preview keeps its exact look. */
  imageIndex?: number;
  categories: readonly CatalogCategoryView[];
}>;

export type CatalogCategoryView = Readonly<{
  id: EntityId;
  productGroupId: EntityId;
  name: string;
}>;

export type CatalogWorkshopView = Readonly<{
  id: EntityId;
  name: string;
}>;

export type CatalogEntry = Readonly<{
  groups: readonly CatalogGroupView[];
  workshops: readonly CatalogWorkshopView[];
}>;

export type CatalogGateway = Readonly<{
  loadCatalog(): Promise<CatalogEntry>;
  /** Synchronous snapshot for gateways that keep the catalog in memory. */
  peekCatalog?(): CatalogEntry | undefined;
  addGroup(name: string): Promise<EntityId>;
  removeGroup(id: EntityId): Promise<void>;
  addCategory(productGroupId: EntityId, name: string): Promise<void>;
  removeCategory(id: EntityId): Promise<void>;
  addWorkshop(name: string): Promise<void>;
  removeWorkshop(id: EntityId): Promise<void>;
}>;
