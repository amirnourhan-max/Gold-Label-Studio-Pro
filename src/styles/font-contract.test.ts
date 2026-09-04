import { describe, expect, it } from "vitest";
import tokens from "./tokens.css?raw";

describe("Persian typography", () => {
  it("uses B Titr as the primary Persian UI font", () => {
    expect(tokens).toMatch(/B Titr/);
    expect(tokens).toMatch(/BTitr/);
  });
});
