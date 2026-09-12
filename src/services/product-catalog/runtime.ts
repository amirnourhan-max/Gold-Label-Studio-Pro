import { CatalogRepository } from "../../repositories/catalog-repository";
import { ProductRepository } from "../../repositories/product-repository";
import { openPersistenceDatabase } from "../database/database-bootstrap";
import { PersistentProductCatalogService } from "./product-catalog-service";
import type { ProductCatalogService } from "./product-catalog-types";
import { ProductImageStore } from "./product-image-store";
import { PreviewProductCatalogService } from "./preview-product-catalog-service";
import { TauriProductImageFileAdapter } from "./tauri-product-image-store";

let runtimePromise: Promise<ProductCatalogService> | null = null;

export const loadProductCatalogService = (): Promise<ProductCatalogService> => {
  runtimePromise ??= (async () => {
    try {
      const client = await openPersistenceDatabase();
      const service = new PersistentProductCatalogService({
        catalog: new CatalogRepository(client),
        products: new ProductRepository(client),
        images: new ProductImageStore(new TauriProductImageFileAdapter()),
      });
      await service.initialize();
      return service;
    } catch {
      const preview = new PreviewProductCatalogService();
      await preview.initialize();
      return preview;
    }
  })();
  return runtimePromise;
};
