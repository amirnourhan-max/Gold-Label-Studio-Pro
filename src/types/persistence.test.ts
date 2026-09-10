import { describe, expect, it } from "vitest";
import { asUtcIsoString } from "./persistence";

describe("persistence UTC contract", () => {
  it("accepts only normalized UTC ISO timestamps", () => {
    expect(asUtcIsoString("2026-09-09T14:45:53.000Z")).toBe("2026-09-09T14:45:53.000Z");
    expect(() => asUtcIsoString("2026-09-09 14:45:53")).toThrow("UTC ISO-8601");
  });
});
