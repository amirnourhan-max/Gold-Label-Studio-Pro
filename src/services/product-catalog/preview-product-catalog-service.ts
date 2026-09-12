import { categoryAssets } from "../../assets/reference";
import { displayData } from "../display-data";
import { weightMgFromGramText } from "../database/weight";
import { ProductCatalogValidationError } from "./product-catalog-service";
import type {
  CatalogSnapshot,
  ProductCatalogService,
  ProductDraft,
  ProductListItem,
} from "./product-catalog-types";

const faToEn = (value: string): string => value
  .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
  .replace(/[٬,]/g, "")
  .replace(/[^0-9.]/g, "");

const statusMap = {
  "فعال": "active",
  "در انتظار چاپ": "pending_print",
  "غیرفعال": "inactive",
  "بسته‌بندی‌شده": "packaged",
  "مرجوع‌شده": "returned",
} as const;

export class PreviewProductCatalogService implements ProductCatalogService {
  readonly source = "preview" as const;
  private catalog: CatalogSnapshot;
  private products: ProductListItem[];
  private nextId = 1;

  constructor() {
    const registration = displayData.getProductRegistration();
    this.catalog = {
      groups: registration.initialCategories.map((group, groupIndex) => ({
        id: `preview-group-${groupIndex}`,
        name: group.name,
        sortOrder: groupIndex,
        categories: group.children.map((name, categoryIndex) => ({
          id: `preview-category-${groupIndex}-${categoryIndex}`,
          name,
        })),
      })),
      workshops: registration.initialMakers.map((name, index) => ({
        id: `preview-workshop-${index}`,
        name,
      })),
    };
    this.products = displayData.listProducts().map(row => ({
      id: `preview-product-${row.id}`,
      code: row.code,
      name: row.name,
      group: row.group,
      category: row.category,
      workshop: "—",
      purity: Number(faToEn(row.purity)),
      weightMg: weightMgFromGramText(faToEn(row.weight)),
      status: statusMap[row.status],
      image: row.image,
    }));
  }

  async initialize(): Promise<void> {}
  async loadCatalog(): Promise<CatalogSnapshot> { return this.catalog; }

  async addGroup(name: string): Promise<CatalogSnapshot> {
    const normalized = name.trim();
    this.catalog = {
      ...this.catalog,
      groups: [...this.catalog.groups, {
        id: `preview-group-new-${this.nextId++}`, name: normalized,
        sortOrder: this.catalog.groups.length,
        categories: [{ id: `preview-category-new-${this.nextId++}`, name: "دسته جدید" }],
      }],
    };
    return this.catalog;
  }

  async softDeleteGroup(id: string): Promise<CatalogSnapshot> {
    this.catalog = { ...this.catalog, groups: this.catalog.groups.filter(group => group.id !== id) };
    return this.catalog;
  }

  async addCategory(groupId: string, name: string): Promise<CatalogSnapshot> {
    this.catalog = {
      ...this.catalog,
      groups: this.catalog.groups.map(group => group.id === groupId
        ? { ...group, categories: [...group.categories, { id: `preview-category-new-${this.nextId++}`, name: name.trim() }] }
        : group),
    };
    return this.catalog;
  }

  async softDeleteCategory(id: string): Promise<CatalogSnapshot> {
    this.catalog = {
      ...this.catalog,
      groups: this.catalog.groups.map(group => ({
        ...group,
        categories: group.categories.filter(category => category.id !== id),
      })),
    };
    return this.catalog;
  }

  async addWorkshop(name: string): Promise<CatalogSnapshot> {
    this.catalog = {
      ...this.catalog,
      workshops: [...this.catalog.workshops, { id: `preview-workshop-new-${this.nextId++}`, name: name.trim() }],
    };
    return this.catalog;
  }

  async softDeleteWorkshop(id: string): Promise<CatalogSnapshot> {
    this.catalog = { ...this.catalog, workshops: this.catalog.workshops.filter(item => item.id !== id) };
    return this.catalog;
  }

  async createProduct(draft: ProductDraft): Promise<void> {
    if (!draft.code.trim()) throw new ProductCatalogValidationError("کد محصول را وارد کنید.");
    if (!draft.name.trim()) throw new ProductCatalogValidationError("نام محصول را وارد کنید.");
    if (!draft.groupId || !draft.categoryId || !draft.workshopId) {
      throw new ProductCatalogValidationError("گروه، دسته اصلی و کارگاه را انتخاب کنید.");
    }
    const quantity = Number(draft.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ProductCatalogValidationError("تعداد باید یک عدد صحیح بزرگ‌تر از صفر باشد.");
    }
    if (this.products.some(product => product.code === draft.code.trim())) {
      throw new ProductCatalogValidationError("کد محصول قبلاً ثبت شده است.");
    }
    const group = this.catalog.groups.find(item => item.id === draft.groupId);
    const category = group?.categories.find(item => item.id === draft.categoryId);
    this.products.unshift({
      id: `preview-product-new-${this.nextId++}`,
      code: draft.code.trim(),
      name: draft.name.trim(),
      group: group?.name ?? "—",
      category: category?.name ?? "—",
      workshop: this.catalog.workshops.find(item => item.id === draft.workshopId)?.name ?? "—",
      purity: Number(draft.purity),
      weightMg: weightMgFromGramText(draft.weight),
      status: draft.inInventory ? "active" : "inactive",
      image: null,
    });
  }

  async listProducts(): Promise<readonly ProductListItem[]> { return this.products; }
  async softDeleteProduct(id: string): Promise<void> {
    this.products = this.products.filter(item => item.id !== id);
  }
}
