import { describe, expect, it } from "vitest";
import { referenceAssets } from "./index";

describe("approved reference assets", () => {
  it("packages every approved dashboard artwork as a local asset", () => {
    expect(Object.keys(referenceAssets)).toHaveLength(31);
    for (const url of Object.values(referenceAssets)) {
      expect(url).not.toMatch(/^https?:/);
      expect(url).toBeTruthy();
    }
  });
});
