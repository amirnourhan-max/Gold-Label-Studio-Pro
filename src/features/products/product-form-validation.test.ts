import { describe, expect, it } from "vitest";
import { validateProductForm } from "./product-form-validation";

const validInput = {
  name: "انگشتر نگین دار",
  code: "R-250904-00125",
  weight: "4.385",
  stoneWeight: "0.5",
  purity: "750",
  quantity: "1",
  groupId: "group-1",
  categoryId: "category-1",
  workshopId: "workshop-1",
};

describe("product form validation", () => {
  it("accepts a complete form", () => {
    expect(validateProductForm(validInput)).toEqual({ valid: true, issues: [] });
  });

  it("requires group, category, workshop, name, code and purity", () => {
    const result = validateProductForm({
      ...validInput,
      groupId: null,
      categoryId: null,
      workshopId: null,
      name: "   ",
      code: "",
      purity: "",
    });

    const fields = result.issues.map(issue => issue.field);
    expect(fields).toEqual(expect.arrayContaining(["group", "category", "workshop", "name", "code", "purity"]));
    expect(result.valid).toBe(false);
  });

  it("rejects non-positive or non-numeric weights", () => {
    const result = validateProductForm({ ...validInput, weight: "0", stoneWeight: "abc" });
    const fields = result.issues.map(issue => issue.field);
    expect(fields).toContain("weight");
    expect(fields).toContain("stoneWeight");
  });

  it("rejects zero, fractional and negative quantities", () => {
    for (const quantity of ["0", "1.5", "-1", ""]) {
      const result = validateProductForm({ ...validInput, quantity });
      expect(result.issues.map(issue => issue.field)).toContain("quantity");
    }
  });

  it("allows an empty stone weight but reports Persian messages", () => {
    expect(validateProductForm({ ...validInput, stoneWeight: "" }).valid).toBe(true);
    const result = validateProductForm({ ...validInput, weight: "" });
    expect(result.issues[0]?.message).toContain("وزن");
  });
});
