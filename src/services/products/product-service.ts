import type { ProductListRecord } from "../../repositories/product-repository";
import { asUtcIsoString, type CreateProductInput, type EntityId, type ProductId } from "../../types/persistence";
import { weightMgFromGramText } from "../database/weight";

export type ProductDraft = Readonly<{
  name: string;
  code: string;
  weightGramText: string;
  stoneWeightGramText: string;
  purity: string;
  size: string;
  quantity: string;
  imagePath: string | null;
  note: string;
  inInventory: boolean;
  productGroupId?: EntityId | null;
  mainCategoryId?: EntityId | null;
  workshopId?: EntityId | null;
  labelTemplateId?: EntityId | null;
}>;

export type ProductListItem = Readonly<{
  id: string;
  code: string;
  name: string;
  group: string;
  category: string;
  purityPerMille: number;
  weightMg: number;
  status: ProductListRecord["status"];
  imagePath: string | null;
}>;

export type ProductSnapshot = Readonly<{
  products: readonly ProductListItem[];
  source: "persistence" | "preview";
}>;

export type ProductCreateResult = Readonly<{
  persisted: boolean;
  snapshot: ProductSnapshot;
}>;

export interface ProductGateway {
  listActive(): Promise<readonly ProductListRecord[]>;
  create(input: CreateProductInput): Promise<void>;
  softDelete(id: string, deletedAt: string): Promise<void>;
}

export interface ProductWorkflowPort {
  load(): Promise<ProductSnapshot>;
  create(draft: ProductDraft): Promise<ProductCreateResult>;
  softDelete(id: string): Promise<ProductSnapshot>;
}

type ProductEnvironment = Readonly<{ now: () => string; newId: () => string }>;

export class ProductService implements ProductWorkflowPort {
  constructor(
    private readonly gateway: ProductGateway,
    private readonly environment: ProductEnvironment = {
      now: () => new Date().toISOString(),
      newId: () => crypto.randomUUID(),
    },
  ) {}

  async load(): Promise<ProductSnapshot> {
    const records = await this.gateway.listActive();
    return {
      source: "persistence",
      products: records.map(record => ({
        id: record.id,
        code: record.productCode,
        name: record.name,
        group: record.productGroupName ?? "—",
        category: record.mainCategoryName ?? "—",
        purityPerMille: record.purityPerMille,
        weightMg: record.weightMg,
        status: record.status,
        imagePath: record.imagePath,
      })),
    };
  }

  async create(draft: ProductDraft): Promise<ProductCreateResult> {
    const name = draft.name.trim();
    const productCode = draft.code.trim();
    if (!name) throw new Error("نام محصول الزامی است");
    if (!productCode) throw new Error("کد محصول الزامی است");

    const weightMg = weightMgFromGramText(draft.weightGramText);
    const stoneWeightMg = draft.stoneWeightGramText.trim()
      ? weightMgFromGramText(draft.stoneWeightGramText)
      : weightMgFromGramText("0");
    if (stoneWeightMg > weightMg) throw new Error("وزن نگین نمی‌تواند بیشتر از وزن محصول باشد");

    const purityPerMille = Number(draft.purity);
    if (!Number.isInteger(purityPerMille) || purityPerMille < 0 || purityPerMille > 1000) {
      throw new Error("عیار محصول نامعتبر است");
    }
    const quantity = Number(draft.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error("تعداد محصول نامعتبر است");

    const createdAt = asUtcIsoString(this.environment.now());
    await this.gateway.create({
      id: this.environment.newId() as ProductId,
      productCode,
      name,
      productGroupId: draft.productGroupId ?? null,
      mainCategoryId: draft.mainCategoryId ?? null,
      workshopId: draft.workshopId ?? null,
      labelTemplateId: draft.labelTemplateId ?? null,
      purityPerMille,
      weightMg,
      stoneWeightMg,
      size: draft.size.trim() || null,
      quantity,
      imagePath: draft.imagePath,
      note: draft.note.trim() || null,
      status: draft.inInventory ? "active" : "inactive",
      createdAt,
    });
    return { persisted: true, snapshot: await this.load() };
  }

  async softDelete(id: string): Promise<ProductSnapshot> {
    await this.gateway.softDelete(id, asUtcIsoString(this.environment.now()));
    return this.load();
  }
}
