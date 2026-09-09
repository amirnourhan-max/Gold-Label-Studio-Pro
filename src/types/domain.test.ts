import { describe, expect, it } from "vitest";
import { isShellRoute, shellRoutes } from "./routes";

describe("shell route contract", () => {
  it("accepts the supported visible routes and rejects retired report routes", () => {
    expect(shellRoutes).toContain("returns");
    expect(isShellRoute("returns")).toBe(true);
    expect(isShellRoute("reports")).toBe(false);
  });
});
