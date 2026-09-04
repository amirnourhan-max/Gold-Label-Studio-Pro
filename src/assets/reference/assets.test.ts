import { describe, expect, it } from "vitest";
import { referenceAssets } from "./index";

describe("approved reference assets", () => {
  it("uses only local packaged assets", () => {
    expect(Object.keys(referenceAssets)).toHaveLength(23);
    for (const url of Object.values(referenceAssets)) {
      expect(url).not.toMatch(/^https?:/);
    }
  });
});
