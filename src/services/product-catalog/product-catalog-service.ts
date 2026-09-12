import type { CatalogRepository } from "../../repositories/catalog-repository";
import type { ProductRepository } from "../../repositories/product-repository";
import {
  asUtcIsoString,
  type CreateMainCategoryInput,
  type CreateProductGroupInput,
  type CreateProductInput,
  type CreateWorkshopInput,
  type MainCategoryRecord,
  type ProductCatalogRecord,
  type ProductGroupRecord,
  type ProductRecord,
  type UtcIsoString,
  type WorkshopRecord,
} from "../../types/persistence";
import { formatWeightMg, weightMgFromGramText } from "../database/weight";
import type { ProductImageStorage } from "./product-image-store";
import { starterCatalogSeed, starterWorkshops } from "./product-catalog-seed";
import type {
  CatalogSnapshot,
  ProductCatalogService,
  ProductDraft,
  ProductListItem,
} from "./product-catalog-types";

export interface CatalogPersistence {
  listActiveGroups(): Promise<readonly ProductGroupRecord[]>;
  listActiveCategories(productGroupId: string): Promise<readonly MainCategoryRecord[]>;
  listActiveWorkshops(): Promise<readonly WorkshopRecord[]>;
  createGroup(input: CreateProductGroupInput): Promise<unknown>;
  createCategory(input: CreateMainCategoryInput): Promise<unknown>;
  createWorkshop(input: CreateWorkshopInput): Promise<unknown>;
  softDeleteGroup(id: string, deletedAt: UtcIsoString | string): Promise<unknown>;
  softDeleteCategory(id: string, deletedAt: UtcIsoString | string): Promise<unknown>;
  softDeleteWorkshop(id: string, deletedAt: UtcIsoString | string): Promise<unknown>;
}

export interface ProductPersistence {
  listActiveCatalog(): Promise<readonly ProductCatalogRecord[]>;
  findActiveByCode(code: string): Promise<readonly ProductRecord[]>;
  create(input: CreateProductInput): Promise<unknown>;
  softDelete(id: string, deletedAt: UtcIsoString | string): Promise<unknown>;
}

type Dependencies = Readonly<{
  catalog: CatalogPersistence | CatalogRepository;
  products: ProductPersistence | ProductRepository;
  images: ProductImageStorage;
  now?: () => UtcIsoString;
  createId?: () => string;
}>;

export class ProductCatalogValidationError extends Error {}

const defaultNow = (): UtcIsoString => asUtcIsoString(new Date().toISOString());
const defaultCreateId = (): string => crypto.randomUUID();

const requiredName = (value: string, message: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new ProductCatalogValidationError(message);
  return normalized;
};

const translatePersistenceError = (error: unknown): Error => {
  const message = error instanceof Error ? error.message : String(error);
  if (/products\.product_code|products_active_code_unique/i.test(message)) {
    return new ProductCatalogValidationError("کد محصول قبلاً ثبت شده است.");
  }
  if (/product_groups.*name|main_categories.*name|workshops.*name/i.test(message)) {
    return new ProductCatalogValidationError("این نام قبلاً ثبت شده است.");
  }
  return error instanceof Error ? error : new Error(message);
};

export class PersistentProductCatalogService implements ProductCatalogService {
  readonly source = "sqlite" as const;
  private initialized = false;
  private readonly now: () => UtcIsoString;
  private readonly createId: () => string;

  constructor(private readonly dependencies: Dependencies) {
    this.now = dependencies.now ?? defaultNow;
    this.createId = dependencies.createId ?? defaultCreateId;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const [groups, workshops] = await Promise.all([
      this.dependencies.catalog.listActiveGroups(),
      this.dependencies.catalog.listActiveWorkshops(),
    ]);
    if (groups.length === 0 || workshops.length === 0) {
      await this.seedStarterCatalog(groups.length === 0, workshops.length === 0);
    }
    this.initialized = true;
  }

  async loadCatalog(): Promise<CatalogSnapshot> {
    const [groups, workshops] = await Promise.all([
      this.dependencies.catalog.listActiveGroups(),
      this.dependencies.catalog.listActiveWorkshops(),
    ]);
    const categories = await Promise.all(
      groups.map(group => this.dependencies.catalog.listActiveCategories(group.id)),
    );
    return {
      groups: groups.map((group, index) => ({
        id: group.id,
        name: group.name,
        sortOrder: group.sortOrder,
        categories: categories[index]!.map(category => ({ id: category.id, name: category.name })),
      })),
      workshops: workshops.map(workshop => ({ id: workshop.id, name: workshop.name })),
    };
  }

  async addGroup(name: string): Promise<CatalogSnapshot> {
    const groups = await this.dependencies.catalog.listActiveGroups();
    const normalized = requiredName(name, "نام گروه را وارد کنید.");
    if (groups.some(group => group.name === normalized)) {
      throw new ProductCatalogValidationError("این گروه قبلاً ثبت شده است.");
    }
    const createdAt = this.now();
    try {
      await this.dependencies.catalog.createGroup({
        id: this.createId() as CreateProductGroupInput["id"],
        name: normalized,
        sortOrder: groups.length,
        createdAt,
      });
      return this.loadCatalog();
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async softDeleteGroup(id: string): Promise<CatalogSnapshot> {
    await this.dependencies.catalog.softDeleteGroup(id, this.now());
    return this.loadCatalog();
  }

  async addCategory(groupId: string, name: string): Promise<CatalogSnapshot> {
    const normalized = requiredName(name, "نام دسته اصلی را وارد کنید.");
    const categories = await this.dependencies.catalog.listActiveCategories(groupId);
    if (categories.some(category => category.name === normalized)) {
      throw new ProductCatalogValidationError("این دسته اصلی قبلاً ثبت شده است.");
    }
    const createdAt = this.now();
    try {
      await this.dependencies.catalog.createCategory({
        id: this.createId() as CreateMainCategoryInput["id"],
        productGroupId: groupId as CreateMainCategoryInput["productGroupId"],
        name: normalized,
        sortOrder: categories.length,
        createdAt,
      });
      return this.loadCatalog();
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async softDeleteCategory(id: string): Promise<CatalogSnapshot> {
    await this.dependencies.catalog.softDeleteCategory(id, this.now());
    return this.loadCatalog();
  }

  async addWorkshop(name: string): Promise<CatalogSnapshot> {
    const workshops = await this.dependencies.catalog.listActiveWorkshops();
    const normalized = requiredName(name, "نام کارگاه را وارد کنید.");
    if (workshops.some(workshop => workshop.name === normalized)) {
      throw new ProductCatalogValidationError("این کارگاه قبلاً ثبت شده است.");
    }
    const createdAt = this.now();
    try {
      await this.dependencies.catalog.createWorkshop({
        id: this.createId() as CreateWorkshopInput["id"],
        name: normalized,
        createdAt,
      });
      return this.loadCatalog();
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async softDeleteWorkshop(id: string): Promise<CatalogSnapshot> {
    await this.dependencies.catalog.softDeleteWorkshop(id, this.now());
    return this.loadCatalog();
  }

  async createProduct(draft: ProductDraft): Promise<void> {
    const code = requiredName(draft.code, "کد محصول را وارد کنید.");
    const name = requiredName(draft.name, "نام محصول را وارد کنید.");
    requiredName(draft.groupId, "گروه محصول را انتخاب کنید.");
    requiredName(draft.categoryId, "دسته اصلی را انتخاب کنید.");
    requiredName(draft.workshopId, "کارگاه سازنده را انتخاب کنید.");
    const purity = Number(draft.purity);
    const quantity = Number(draft.quantity);
    if (!Number.isInteger(purity) || purity < 0 || purity > 1000) {
      throw new ProductCatalogValidationError("عیار محصول معتبر نیست.");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ProductCatalogValidationError("تعداد باید یک عدد صحیح بزرگ‌تر از صفر باشد.");
    }

    let weightMg;
    let stoneWeightMg;
    try {
      weightMg = weightMgFromGramText(draft.weight);
      stoneWeightMg = weightMgFromGramText(draft.stoneWeight || "0");
    } catch {
      throw new ProductCatalogValidationError("وزن باید عددی معتبر با حداکثر دقت میلی‌گرم باشد.");
    }
    if (weightMg <= 0) throw new ProductCatalogValidationError("وزن محصول باید بزرگ‌تر از صفر باشد.");
    if (stoneWeightMg > weightMg) {
      throw new ProductCatalogValidationError("وزن نگین نمی‌تواند بیشتر از وزن محصول باشد.");
    }
    if ((await this.dependencies.products.findActiveByCode(code)).length > 0) {
      throw new ProductCatalogValidationError("کد محصول قبلاً ثبت شده است.");
    }

    const id = this.createId();
    let imageReference: string | null = null;
    try {
      if (draft.image) imageReference = await this.dependencies.images.save(id, draft.image);
      await this.dependencies.products.create({
        id: id as CreateProductInput["id"],
        productCode: code,
        name,
        productGroupId: draft.groupId as CreateProductInput["productGroupId"],
        mainCategoryId: draft.categoryId as CreateProductInput["mainCategoryId"],
        workshopId: draft.workshopId as CreateProductInput["workshopId"],
        labelTemplateId: null,
        purityPerMille: purity,
        weightMg,
        stoneWeightMg,
        size: draft.size.trim() || null,
        quantity,
        imagePath: imageReference,
        note: draft.note.trim() || null,
        status: draft.inInventory ? "active" : "inactive",
        createdAt: this.now(),
      });
    } catch (error) {
      if (imageReference) await this.dependencies.images.remove(imageReference);
      throw translatePersistenceError(error);
    }
  }

  async listProducts(): Promise<readonly ProductListItem[]> {
    const rows = await this.dependencies.products.listActiveCatalog();
    return Promise.all(rows.map(async row => ({
      id: row.id,
      code: row.productCode,
      name: row.name,
      group: row.groupName ?? "—",
      category: row.categoryName ?? "—",
      workshop: row.workshopName ?? "—",
      purity: row.purityPerMille,
      weightMg: row.weightMg,
      status: row.status,
      image: row.imagePath
        ? await this.dependencies.images.load(row.imagePath).catch(() => null)
        : null,
    })));
  }

  async softDeleteProduct(id: string): Promise<void> {
    await this.dependencies.products.softDelete(id, this.now());
  }

  private async seedStarterCatalog(seedGroups: boolean, seedWorkshops: boolean): Promise<void> {
    if (seedGroups) for (let groupIndex = 0; groupIndex < starterCatalogSeed.length; groupIndex += 1) {
      const seed = starterCatalogSeed[groupIndex]!;
      const groupId = this.createId();
      await this.dependencies.catalog.createGroup({
        id: groupId as CreateProductGroupInput["id"],
        name: seed.name,
        sortOrder: groupIndex,
        createdAt: this.now(),
      });
      for (let categoryIndex = 0; categoryIndex < seed.categories.length; categoryIndex += 1) {
        await this.dependencies.catalog.createCategory({
          id: this.createId() as CreateMainCategoryInput["id"],
          productGroupId: groupId as CreateMainCategoryInput["productGroupId"],
          name: seed.categories[categoryIndex]!,
          sortOrder: categoryIndex,
          createdAt: this.now(),
        });
      }
    }
    if (seedWorkshops) for (const workshop of starterWorkshops) {
      await this.dependencies.catalog.createWorkshop({
        id: this.createId() as CreateWorkshopInput["id"],
        name: workshop,
        createdAt: this.now(),
      });
    }
  }
}

export const productWeightForDisplay = (weightMg: number): string => formatWeightMg(weightMg);
