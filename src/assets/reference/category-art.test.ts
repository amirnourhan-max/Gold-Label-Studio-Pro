import { describe, expect, it } from "vitest";
import { categoryAssets } from "./index";

describe("category artwork source", () => {
  it("uses seven clean independent local WebP assets", () => {
    expect(categoryAssets).toHaveLength(7);
    expect(new Set(categoryAssets).size).toBe(7);
    for (const asset of categoryAssets) {
      expect(asset).toContain("category-");
      expect(asset).toContain(".webp");
      expect(asset).not.toMatch(/^https?:/);
    }
  });
});
