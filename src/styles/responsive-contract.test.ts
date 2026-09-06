import { describe, expect, it } from "vitest";
import dashboardCss from "./dashboard.css?raw";
import responsiveCss from "./responsive.css?raw";
import returnsCss from "../features/operations/returns-page.css?raw";

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

  it("keeps Dashboard and return-session details reachable in compact-height desktop windows", () => {
    expect(dashboardCss).toContain("@media(max-height:850px)");
    expect(returnsCss).toContain("@media (max-height: 850px)");
    expect(returnsCss).toContain(".returns-details");
  });
});
