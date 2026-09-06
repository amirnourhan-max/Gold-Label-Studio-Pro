import { describe, expect, it } from "vitest";
import responsiveCss from "./responsive.css?raw";

describe("responsive layout contract", () => {
  it("defines shared compact and narrow viewport rules for every application surface", () => {
    expect(responsiveCss).toContain("@media (max-width: 1100px)");
    expect(responsiveCss).toContain("@media (max-width: 760px)");
    for (const selector of [
      ".dashboard",
      ".product-registration",
      ".label-designer-page",
      ".packaging-workspace",
      ".returns-workspace",
      ".ops-page",
    ]) {
      expect(responsiveCss).toContain(selector);
    }
  });
});
