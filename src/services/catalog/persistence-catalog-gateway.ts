import { CatalogRepository } from "../../repositories/catalog-repository";
import { asUtcIsoString, type EntityId } from "../../types/persistence";
import type { CatalogEntry, CatalogGateway, CatalogGroupView } from "./catalog-contract";

const utcNow = (): string => asUtcIsoString(new Date().toISOString());

export class PersistenceCatalogGateway implements CatalogGateway {
  constructor(private readonly repository: CatalogRepository) {}

  async loadCatalog(): Promise<CatalogEntry> {
    const [groups, workshops] = await Promise.all([
      this.repository.listActiveGroups(),
      this.repository.listActiveWorkshops(),
    ]);

    const groupViews: CatalogGroupView[] = await Promise.all(
      groups.map(async group => ({
        id: group.id,
        name: group.name,
        categories: (await this.repository.listActiveCategories(group.id)).map(category => ({
          id: category.id,
          productGroupId: category.productGroupId,
          name: category.name,
        })),
      })),
    );

    return {
      groups: groupViews,
      workshops: workshops.map(workshop => ({ id: workshop.id, name: workshop.name })),
    };
  }

  async addGroup(name: string): Promise<EntityId> {
    await this.repository.createGroup(name, utcNow());
    const rows = await this.repository.listActiveGroups();
    const created = rows.find(group => group.name === name.trim());
    if (created === undefined) {
      throw new Error("Created product group could not be reloaded");
    }
    return created.id;
  }

  async removeGroup(id: EntityId): Promise<void> {
    await this.repository.softDeleteGroup(id, utcNow());
  }

  async addCategory(productGroupId: EntityId, name: string): Promise<void> {
    await this.repository.createCategory(productGroupId, name, utcNow());
  }

  async removeCategory(id: EntityId): Promise<void> {
    await this.repository.softDeleteCategory(id, utcNow());
  }

  async addWorkshop(name: string): Promise<void> {
    await this.repository.createWorkshop(name, utcNow());
  }

  async removeWorkshop(id: EntityId): Promise<void> {
    await this.repository.softDeleteWorkshop(id, utcNow());
  }
}
