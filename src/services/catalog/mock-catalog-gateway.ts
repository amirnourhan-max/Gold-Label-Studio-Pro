import type { EntityId } from "../../types/persistence";
import type { CatalogEntry, CatalogGateway, CatalogGroupView } from "./catalog-contract";

const mockGroups: CatalogGroupView[] = [
  {
    id: "mock-group-rings" as EntityId,
    name: "انگشتر",
    imageIndex: 0,
    categories: [
      { id: "mock-category-ring-men" as EntityId, productGroupId: "mock-group-rings" as EntityId, name: "انگشتر مردانه" },
      { id: "mock-category-ring-women" as EntityId, productGroupId: "mock-group-rings" as EntityId, name: "انگشتر زنانه" },
      { id: "mock-category-ring-stone" as EntityId, productGroupId: "mock-group-rings" as EntityId, name: "انگشتر نگین دار" },
    ],
  },
  {
    id: "mock-group-bracelets" as EntityId,
    name: "دستبند",
    imageIndex: 1,
    categories: [
      { id: "mock-category-bracelet-women" as EntityId, productGroupId: "mock-group-bracelets" as EntityId, name: "دستبند زنانه" },
      { id: "mock-category-bracelet-men" as EntityId, productGroupId: "mock-group-bracelets" as EntityId, name: "دستبند مردانه" },
    ],
  },
  {
    id: "mock-group-sets" as EntityId,
    name: "سرویس",
    imageIndex: 5,
    categories: [
      { id: "mock-category-set-full" as EntityId, productGroupId: "mock-group-sets" as EntityId, name: "سرویس کامل" },
      { id: "mock-category-set-half" as EntityId, productGroupId: "mock-group-sets" as EntityId, name: "نیم ست" },
    ],
  },
  {
    id: "mock-group-necklaces" as EntityId,
    name: "گردنبند",
    imageIndex: 2,
    categories: [
      { id: "mock-category-necklace-women" as EntityId, productGroupId: "mock-group-necklaces" as EntityId, name: "گردنبند زنانه" },
      { id: "mock-category-necklace-men" as EntityId, productGroupId: "mock-group-necklaces" as EntityId, name: "گردنبند مردانه" },
    ],
  },
];

const mockEntry: { groups: CatalogGroupView[]; workshops: CatalogEntry["workshops"] } = {
  groups: mockGroups.map(group => ({ ...group })),
  workshops: [
    { id: "mock-workshop-parsian" as EntityId, name: "کارگاه طلای پارسیان" },
    { id: "mock-workshop-central" as EntityId, name: "کارگاه مرکزی" },
  ],
};

const cloneEntry = (): CatalogEntry => ({
  groups: mockEntry.groups.map(group => ({ ...group, categories: group.categories.map(category => ({ ...category })) })),
  workshops: mockEntry.workshops.map(workshop => ({ ...workshop })),
});

const nextMockId = (prefix: string): EntityId =>
  `${prefix}-mock-${Date.now()}-${Math.random().toString(16).slice(2)}` as EntityId;

/**
 * Fallback gateway with the approved preview catalog. It is only selected when
 * the persistence-backed gateway reports the database as unavailable.
 */
export class MockCatalogGateway implements CatalogGateway {
  async loadCatalog(): Promise<CatalogEntry> {
    return cloneEntry();
  }

  peekCatalog(): CatalogEntry {
    return cloneEntry();
  }

  async addGroup(name: string): Promise<EntityId> {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new Error("Product group name must not be empty");
    const id = nextMockId("group");
    mockEntry.groups = [
      ...mockEntry.groups,
      { id, name: trimmed, categories: [{ id: nextMockId("category"), productGroupId: id, name: "دسته جدید" }] },
    ];
    return id;
  }

  async removeGroup(id: EntityId): Promise<void> {
    mockEntry.groups = mockEntry.groups.filter(group => group.id !== id);
  }

  async addCategory(productGroupId: EntityId, name: string): Promise<void> {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new Error("Main category name must not be empty");
    if (!mockEntry.groups.some(group => group.id === productGroupId)) throw new Error("Unknown product group");
    mockEntry.groups = mockEntry.groups.map(group =>
      group.id === productGroupId
        ? { ...group, categories: [...group.categories, { id: nextMockId("category"), productGroupId, name: trimmed }] }
        : group,
    );
  }

  async removeCategory(id: EntityId): Promise<void> {
    mockEntry.groups = mockEntry.groups.map(group => ({
      ...group,
      categories: group.categories.filter(category => category.id !== id),
    }));
  }

  async addWorkshop(name: string): Promise<void> {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new Error("Workshop name must not be empty");
    mockEntry.workshops = [...mockEntry.workshops, { id: nextMockId("workshop"), name: trimmed }];
  }

  async removeWorkshop(id: EntityId): Promise<void> {
    mockEntry.workshops = mockEntry.workshops.filter(workshop => workshop.id !== id);
  }
}
