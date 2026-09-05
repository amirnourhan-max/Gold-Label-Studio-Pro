import { describe, expect, it } from "vitest";
import { referenceAssets } from "./index";

describe("approved reference assets", () => {
  it("keeps all runtime artwork local", () => {
    expect(referenceAssets).toHaveProperty("productRegistrationRing", expect.stringContaining("product-registration-ring.webp"));
    expect(referenceAssets).toHaveProperty("productRegistrationLabel", expect.stringContaining("product-registration-label.webp"));
    expect(referenceAssets).toHaveProperty("designerLabel", expect.stringContaining("designer-label.webp"));
    expect(referenceAssets).toHaveProperty("packageLabel", expect.stringContaining("package-label.webp"));
    for (const url of Object.values(referenceAssets)) {
      expect(url).not.toMatch(/^https?:/);
      expect(url).toBeTruthy();
    }
  });
});
