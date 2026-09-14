import { ProductRepository } from "../../repositories/product-repository";
import type { CreateProductInput } from "../../types/persistence";
import type { ProductGateway } from "./product-service";

export class PersistenceProductGateway implements ProductGateway {
  constructor(private readonly repository: ProductRepository) {}

  listActive() {
    return this.repository.listActiveWithCatalog();
  }

  async create(input: CreateProductInput): Promise<void> {
    await this.repository.create(input);
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    await this.repository.softDelete(id, deletedAt);
  }
}
