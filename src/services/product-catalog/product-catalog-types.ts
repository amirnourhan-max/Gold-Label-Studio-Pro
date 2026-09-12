import type { ProductPersistenceStatus, WeightMg } from "../../types/persistence";
import type { ProductImageInput } from "./product-image-store";

export type ProductCatalogSource = "sqlite" | "preview";

export type CatalogCategory = Readonly<{ id: string; name: string }>;
export type CatalogGroup = Readonly<{
  id: string;
  name: string;
  sortOrder: number;
  categories: readonly CatalogCategory[];
}>;
export type WorkshopOption = Readonly<{ id: string; name: string }>;

export type CatalogSnapshot = Readonly<{
  groups: readonly CatalogGroup[];
  workshops: readonly WorkshopOption[];
}>;

export type ProductDraft = Readonly<{
  code: string;
  name: string;
  groupId: string;
  categoryId: string;
  workshopId: string;
  purity: string;
  weight: string;
  stoneWeight: string;
  size: string;
  quantity: string;
  note: string;
  inInventory: boolean;
  image: ProductImageInput | null;
}>;

export type ProductListItem = Readonly<{
  id: string;
  code: string;
  name: string;
  group: string;
  category: string;
  workshop: string;
  purity: number;
  weightMg: WeightMg;
  status: ProductPersistenceStatus;
  image: string | null;
}>;

export interface ProductCatalogService {
  readonly source: ProductCatalogSource;
  initialize(): Promise<void>;
  loadCatalog(): Promise<CatalogSnapshot>;
  addGroup(name: string): Promise<CatalogSnapshot>;
  softDeleteGroup(id: string): Promise<CatalogSnapshot>;
  addCategory(groupId: string, name: string): Promise<CatalogSnapshot>;
  softDeleteCategory(id: string): Promise<CatalogSnapshot>;
  addWorkshop(name: string): Promise<CatalogSnapshot>;
  softDeleteWorkshop(id: string): Promise<CatalogSnapshot>;
  createProduct(draft: ProductDraft): Promise<void>;
  listProducts(): Promise<readonly ProductListItem[]>;
  softDeleteProduct(id: string): Promise<void>;
}
