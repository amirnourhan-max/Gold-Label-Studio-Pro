import { describe, expect, it } from "vitest";
import categoryAtlas from "./category-clean-atlas.webp";

describe("category artwork source", () => {
  it("uses one clean local jewelry-only atlas", () => {
    expect(categoryAtlas).toContain("category-clean-atlas");
    expect(categoryAtlas).not.toMatch(/^https?:/);
  });
});
