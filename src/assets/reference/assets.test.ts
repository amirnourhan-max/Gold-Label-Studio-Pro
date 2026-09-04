import { describe, expect, it } from "vitest";
import { referenceAssets } from "./index";

describe("approved reference assets", () => {
  it("uses five local packaged reference sprites", () => {
    expect(Object.keys(referenceAssets)).toHaveLength(5);
    for (const url of Object.values(referenceAssets)) expect(url).not.toMatch(/^https?:/);
  });
});