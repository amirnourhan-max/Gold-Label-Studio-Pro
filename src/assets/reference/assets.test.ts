import { describe, expect, it } from "vitest";
import { referenceAssets } from "./index";

describe("approved reference assets", () => {
  it("keeps all runtime artwork local", () => {
    expect(Object.keys(referenceAssets)).toHaveLength(6);
    for (const url of Object.values(referenceAssets)) {
      expect(url).not.toMatch(/^https?:/);
      expect(url).toBeTruthy();
    }
  });
});
