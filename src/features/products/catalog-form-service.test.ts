import { describe, expect, it } from "vitest";
import type { CatalogEntry } from "../../services/catalog/catalog-contract";
import type { EntityId } from "../../types/persistence";
import {
  buildRegistrationCatalog,
  categoryLabel,
  isCatalogEmpty,
  workshopIdByName,
  workshopLabel,
} from "./catalog-form-service";

const entry: CatalogEntry = {
  groups: [
    {
      id: "group-1" as EntityId,
      name: "انگشتر",
      imageIndex: 3,
      categories: [{ id: "category-1" as EntityId, productGroupId: "group-1" as EntityId, name: "انگشتر مردانه" }],
    },
    { id: "group-2" as EntityId, name: "دستبند", categories: [] },
  ],
  workshops: [
    { id: "workshop-1" as EntityId, name: "کارگاه مرکزی" },
    { id: "workshop-2" as EntityId, name: "کارگاه طلای پارسیان" },
  ],
};

describe("registration catalog builder", () => {
  it("maps entries into UI-ready options with resolved images", () => {
    const model = buildRegistrationCatalog(entry);

    expect(model.groups).toHaveLength(2);
    expect(model.groups[0]?.name).toBe("انگشتر");
    expect(model.groups[0]?.children[0]?.name).toBe("انگشتر مردانه");
    expect(model.groups[0]?.image).toBeTruthy();
    expect(model.workshops.map(workshop => workshop.name)).toEqual(["کارگاه مرکزی", "کارگاه طلای پارسیان"]);
  });

  it("resolves labels and workshop ids from the built model", () => {
    const model = buildRegistrationCatalog(entry);

    expect(workshopLabel(model, "workshop-2")).toBe("کارگاه طلای پارسیان");
    expect(workshopLabel(model, null)).toBe("");
    expect(workshopIdByName(model, "کارگاه مرکزی")).toBe("workshop-1");
    expect(categoryLabel(model, "category-1")).toBe("انگشتر مردانه");
    expect(categoryLabel(model, "missing")).toBe("");
  });

  it("detects an empty catalog", () => {
    expect(isCatalogEmpty(buildRegistrationCatalog({ groups: [], workshops: [] }))).toBe(true);
    expect(isCatalogEmpty(buildRegistrationCatalog(entry))).toBe(false);
  });
});
