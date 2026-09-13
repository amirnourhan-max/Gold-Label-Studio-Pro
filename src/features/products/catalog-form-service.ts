import { categoryAssets } from "../../assets/reference";
import type { CatalogCategoryView, CatalogEntry, CatalogGroupView } from "../../services/catalog/catalog-contract";

export type RegistrationGroupOption = Readonly<{
  id: string;
  name: string;
  image: string;
  children: readonly CatalogCategoryView[];
}>;

export type RegistrationCatalogModel = Readonly<{
  groups: readonly RegistrationGroupOption[];
  workshops: readonly { id: string; name: string }[];
}>;

const groupImage = (group: CatalogGroupView, fallbackIndex: number): string =>
  categoryAssets[group.imageIndex ?? fallbackIndex] ?? categoryAssets[0];

/**
 * Builds the UI-ready catalog model for the approved registration form.
 * Pure mapping only — no React, no SQL.
 */
export const buildRegistrationCatalog = (entry: CatalogEntry): RegistrationCatalogModel => ({
  groups: entry.groups.map((group, index) => ({
    id: group.id,
    name: group.name,
    image: groupImage(group, index),
    children: group.categories,
  })),
  workshops: entry.workshops.map(workshop => ({ id: workshop.id, name: workshop.name })),
});

export const findGroupOption = (model: RegistrationCatalogModel, groupId: string | null): RegistrationGroupOption | undefined =>
  model.groups.find(group => group.id === groupId);

export const findCategoryOption = (
  model: RegistrationCatalogModel,
  categoryId: string | null,
): CatalogCategoryView | undefined => {
  for (const group of model.groups) {
    const match = group.children.find(category => category.id === categoryId);
    if (match !== undefined) return match;
  }
  return undefined;
};

export const defaultCategoryForGroup = (
  group: Readonly<{ name: string; children: readonly CatalogCategoryView[] }> | undefined,
): CatalogCategoryView | undefined => group?.children[0];

export const groupLabel = (model: RegistrationCatalogModel, groupId: string | null): string =>
  findGroupOption(model, groupId)?.name ?? "";

export const categoryLabel = (model: RegistrationCatalogModel, categoryId: string | null): string =>
  findCategoryOption(model, categoryId)?.name ?? "";

export const workshopLabel = (model: RegistrationCatalogModel, workshopId: string | null): string =>
  model.workshops.find(workshop => workshop.id === workshopId)?.name ?? "";

export const workshopIdByName = (model: RegistrationCatalogModel, name: string): string | null =>
  model.workshops.find(workshop => workshop.name === name)?.id ?? null;

export const isCatalogEmpty = (model: RegistrationCatalogModel): boolean =>
  model.groups.length === 0 && model.workshops.length === 0;
