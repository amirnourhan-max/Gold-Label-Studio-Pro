import { productRows } from "../../data/mock/products";
import { ProductRepository } from "../../repositories/product-repository";
import { openPersistenceDatabase } from "../database/database-bootstrap";
import { PersistenceProductGateway } from "./persistence-product-gateway";
import {
  ProductService,
  type ProductCreateResult,
  type ProductDraft,
  type ProductListItem,
  type ProductSnapshot,
  type ProductWorkflowPort,
} from "./product-service";

const faToEn = (value: string) => value.replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
const statusMap = {
  "فعال": "active",
  "در انتظار چاپ": "pending_print",
  "غیرفعال": "inactive",
} as const;

const previewProducts: readonly ProductListItem[] = productRows.map(product => ({
  id: String(product.id),
  code: product.code,
  name: product.name,
  group: product.group,
  category: product.category,
  purityPerMille: Number(faToEn(product.purity)),
  weightMg: Math.round(Number(faToEn(product.weight).replace(" g", "")) * 1000),
  status: statusMap[product.status],
  imagePath: product.image,
}));

export const previewProductSnapshot: ProductSnapshot = { source: "preview", products: previewProducts };

const previewWorkflow: ProductWorkflowPort = {
  load: async () => previewProductSnapshot,
  create: async (_draft: ProductDraft): Promise<ProductCreateResult> => ({
    persisted: false,
    snapshot: previewProductSnapshot,
  }),
  softDelete: async () => previewProductSnapshot,
};

let realWorkflow: Promise<ProductWorkflowPort> | null = null;

async function resolveWorkflow(): Promise<ProductWorkflowPort> {
  if (!("__TAURI_INTERNALS__" in globalThis)) return previewWorkflow;
  realWorkflow ??= openPersistenceDatabase().then(client =>
    new ProductService(new PersistenceProductGateway(new ProductRepository(client))),
  );
  return realWorkflow;
}

export const productWorkflow: ProductWorkflowPort = {
  load: async () => (await resolveWorkflow()).load(),
  create: async draft => (await resolveWorkflow()).create(draft),
  softDelete: async id => (await resolveWorkflow()).softDelete(id),
};
