import { describe, expect, it } from "vitest";
import ring from "./category-ring.svg?raw";
import bracelet from "./category-bracelet.svg?raw";
import necklace from "./category-necklace.svg?raw";
import earrings from "./category-earrings.svg?raw";
import pendant from "./category-pendant.svg?raw";
import service from "./category-service.svg?raw";
import chain from "./category-chain.svg?raw";

describe("category artwork source", () => {
  it("uses clean vector artwork instead of an embedded sprite crop", () => {
    const artworks = [ring, bracelet, necklace, earrings, pendant, service, chain];
    expect(artworks).toHaveLength(7);
    for (const svg of artworks) {
      expect(svg).not.toContain("<image");
      expect(svg).not.toContain("data:image");
      expect(svg).toMatch(/<(path|circle|ellipse|rect|polyline|polygon|line)\b/);
    }
  });
});
