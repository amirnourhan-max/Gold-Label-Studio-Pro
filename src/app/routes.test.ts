import { describe, expect, it } from "vitest";
import { resolveShellRoute } from "./routes";

describe("application route registry", () => {
  it("uses the approved returns route and protects the dashboard from removed routes", () => {
    expect(resolveShellRoute("returns")).toBe("returns");
    expect(resolveShellRoute("reports")).toBe("dashboard");
    expect(resolveShellRoute(null)).toBe("dashboard");
  });
});
