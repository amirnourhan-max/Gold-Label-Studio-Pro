import { describe, expect, it } from "vitest";

const uiModules = import.meta.glob(
  [
    "../../app/**/*.{ts,tsx}",
    "../../components/**/*.{ts,tsx}",
    "../../features/**/*.{ts,tsx}",
    "../../services/display-data.ts",
  ],
  { eager: true, import: "default", query: "?raw" },
) as Record<string, string>;

describe("persistence architecture boundary", () => {
  it("keeps React and display-data modules independent from SQLite", () => {
    for (const [path, source] of Object.entries(uiModules)) {
      expect(source, path).not.toContain("@tauri-apps/plugin-sql");
      expect(source, path).not.toContain("openPersistenceDatabase");
    }
  });
});
