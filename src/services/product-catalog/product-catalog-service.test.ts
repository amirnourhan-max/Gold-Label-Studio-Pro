import { describe, expect, it } from "vitest";
import type {
  CreateMainCategoryInput,
  CreateProductGroupInput,
  CreateProductInput,
  CreateWorkshopInput,
  MainCategoryRecord,
  ProductCatalogRecord,
  ProductGroupRecord,
  UtcIsoString,
  WorkshopRecord,
} from "../../types/persistence";
import {
  PersistentProductCatalogService,
  ProductCatalogValidationError,
  type CatalogPersistence,
  type ProductPersistence,
} from "./product-catalog-service";
import type { ProductImageInput, ProductImageStorage } from "./product-image-store";

const now = "2026-09-12T12:00:00.000Z" as UtcIsoString;
const audit = { createdAt: now, updatedAt: now, deletedAt: null };

class MemoryCatalogPersistence implements CatalogPersistence {
  groups: ProductGroupRecord[] = [];
  categories: MainCategoryRecord[] = [];
  workshops: WorkshopRecord[] = [];

  async listActiveGroups() { return this.groups; }
  async listActiveCategories(productGroupId: string) {
    return this.categories.filter(item => item.productGroupId === productGroupId);
  }
  async listActiveWorkshops() { return this.workshops; }
  async createGroup(input: CreateProductGroupInput) {
    this.groups.push({ ...input, isActive: true, deletedAt: null, updatedAt: input.createdAt });
  }
  async createCategory(input: CreateMainCategoryInput) {
    this.categories.push({ ...input, isActive: true, deletedAt: null, updatedAt: input.createdAt });
  }
  async createWorkshop(input: CreateWorkshopInput) {
    this.workshops.push({ ...input, isActive: true, deletedAt: null, updatedAt: input.createdAt });
  }
  async softDeleteGroup(id: string, deletedAt: string) {
    this.groups = this.groups.filter(item => item.id !== id);
    void deletedAt;
  }
  async softDeleteCategory(id: string, deletedAt: string) {
    this.categories = this.categories.filter(item => item.id !== id);
    void deletedAt;
  }
  async softDeleteWorkshop(id: string, deletedAt: string) {
    this.workshops = this.workshops.filter(item => item.id !== id);
    void deletedAt;
  }
}

class MemoryProductPersistence implements ProductPersistence {
  created: CreateProductInput[] = [];
  rows: ProductCatalogRecord[] = [];
  deleted: Readonly<{ id: string; at: string }> | null = null;
  createError: Error | null = null;

  async listActiveCatalog() { return this.rows; }
  async findActiveByCode(code: string) {
    return this.rows.filter(item => item.productCode === code);
  }
  async create(input: CreateProductInput) {
    if (this.createError) throw this.createError;
    this.created.push(input);
  }
  async softDelete(id: string, deletedAt: string) {
    this.deleted = { id, at: deletedAt };
  }
}

class MemoryImageStorage implements ProductImageStorage {
  saved: string[] = [];
  removed: string[] = [];
  async save(productId: string, _image: ProductImageInput) {
    const reference = `product-images/${productId}.webp`;
    this.saved.push(reference);
    return reference;
  }
  async load(reference: string) { return `preview:${reference}`; }
  async remove(reference: string) { this.removed.push(reference); }
}

const image: ProductImageInput = {
  name: "ring.webp", type: "image/webp", size: 3,
  arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
};

describe("PersistentProductCatalogService", () => {
  it("seeds the approved starter catalog once when the native database is empty", async () => {
    const catalog = new MemoryCatalogPersistence();
    const service = new PersistentProductCatalogService({
      catalog, products: new MemoryProductPersistence(), images: new MemoryImageStorage(),
      now: () => now, createId: (() => { let index = 0; return () => `id-${++index}`; })(),
    });

    await service.initialize();
    await service.initialize();
    const snapshot = await service.loadCatalog();

    expect(snapshot.groups.map(group => group.name)).toEqual(["انگشتر", "دستبند", "سرویس", "گردنبند"]);
    expect(snapshot.groups[0]?.categories.map(category => category.name)).toEqual([
      "انگشتر مردانه", "انگشتر زنانه", "انگشتر نگین دار",
    ]);
    expect(snapshot.workshops.map(workshop => workshop.name)).toEqual(["کارگاه طلای پارسیان", "کارگاه مرکزی"]);
    expect(catalog.groups).toHaveLength(4);
  });

  it("repairs a partially initialized catalog without duplicating existing workshops", async () => {
    const catalog = new MemoryCatalogPersistence();
    catalog.workshops = [{ id: "existing-workshop", name: "کارگاه موجود", isActive: true, ...audit } as WorkshopRecord];
    const service = new PersistentProductCatalogService({
      catalog, products: new MemoryProductPersistence(), images: new MemoryImageStorage(),
      now: () => now, createId: (() => { let index = 0; return () => `repair-${++index}`; })(),
    });

    await service.initialize();
    const snapshot = await service.loadCatalog();

    expect(snapshot.groups).toHaveLength(4);
    expect(snapshot.workshops.map(workshop => workshop.name)).toEqual(["کارگاه موجود"]);
  });

  it("validates and creates a product with exact integer milligrams and a durable image reference", async () => {
    const products = new MemoryProductPersistence();
    const images = new MemoryImageStorage();
    const service = new PersistentProductCatalogService({
      catalog: new MemoryCatalogPersistence(), products, images,
      now: () => now, createId: () => "product-1",
    });

    await service.createProduct({
      code: " R-001 ", name: " انگشتر طرح گل ", groupId: "group-1", categoryId: "category-1",
      workshopId: "workshop-1", purity: "750", weight: "4.385", stoneWeight: "0.250",
      size: "54", quantity: "1", note: "نمونه", inInventory: true, image,
    });

    expect(products.created[0]).toMatchObject({
      productCode: "R-001", name: "انگشتر طرح گل", purityPerMille: 750,
      weightMg: 4385, stoneWeightMg: 250, imagePath: "product-images/product-1.webp",
      status: "active", createdAt: now,
    });
  });

  it("rejects invalid form values before writing product or image data", async () => {
    const products = new MemoryProductPersistence();
    const images = new MemoryImageStorage();
    const service = new PersistentProductCatalogService({
      catalog: new MemoryCatalogPersistence(), products, images, now: () => now, createId: () => "product-1",
    });

    await expect(service.createProduct({
      code: "", name: "انگشتر", groupId: "group-1", categoryId: "category-1", workshopId: "workshop-1",
      purity: "750", weight: "4.385", stoneWeight: "4.386", size: "", quantity: "1",
      note: "", inInventory: true, image,
    })).rejects.toBeInstanceOf(ProductCatalogValidationError);
    expect(products.created).toHaveLength(0);
    expect(images.saved).toHaveLength(0);
  });

  it("removes a newly stored image when the database insert fails", async () => {
    const products = new MemoryProductPersistence();
    products.createError = new Error("UNIQUE constraint failed: products.product_code");
    const images = new MemoryImageStorage();
    const service = new PersistentProductCatalogService({
      catalog: new MemoryCatalogPersistence(), products, images, now: () => now, createId: () => "product-1",
    });

    await expect(service.createProduct({
      code: "R-001", name: "انگشتر", groupId: "group-1", categoryId: "category-1",
      workshopId: "workshop-1", purity: "750", weight: "4.385", stoneWeight: "0",
      size: "", quantity: "1", note: "", inInventory: true, image,
    })).rejects.toThrow("کد محصول");
    expect(images.removed).toEqual(["product-images/product-1.webp"]);
  });

  it("maps persistent products into display rows and performs UTC soft delete", async () => {
    const products = new MemoryProductPersistence();
    products.rows = [{
      id: "product-1", productCode: "R-001", name: "انگشتر طرح گل",
      productGroupId: "group-1", mainCategoryId: "category-1", workshopId: "workshop-1",
      labelTemplateId: null, purityPerMille: 750, weightMg: 4385, stoneWeightMg: 0,
      size: "54", quantity: 1, imagePath: "product-images/product-1.webp", note: null,
      status: "active", groupName: "انگشتر", categoryName: "انگشتر زنانه",
      workshopName: "کارگاه مرکزی", ...audit,
    } as ProductCatalogRecord];
    const service = new PersistentProductCatalogService({
      catalog: new MemoryCatalogPersistence(), products, images: new MemoryImageStorage(),
      now: () => now, createId: () => "unused",
    });

    const rows = await service.listProducts();
    await service.softDeleteProduct("product-1");

    expect(rows[0]).toMatchObject({
      id: "product-1", code: "R-001", group: "انگشتر", category: "انگشتر زنانه",
      purity: 750, weightMg: 4385, image: "preview:product-images/product-1.webp",
    });
    expect(products.deleted).toEqual({ id: "product-1", at: now });
  });
});
