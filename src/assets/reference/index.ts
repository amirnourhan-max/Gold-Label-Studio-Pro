import brandDiamond from "./brand-diamond.webp";
import heroJewelry from "./hero-jewelry.webp";
import categories from "./categories.webp";
import devices from "./devices.webp";
import trustArtwork from "./trust-artwork.webp";

import categoryRing from "./category-ring.svg";
import categoryBracelet from "./category-bracelet.svg";
import categoryNecklace from "./category-necklace.svg";
import categoryEarrings from "./category-earrings.svg";
import categoryPendant from "./category-pendant.svg";
import categoryService from "./category-service.svg";
import categoryChain from "./category-chain.svg";

export const referenceAssets = {
  brandDiamond,
  heroJewelry,
  categories,
  devices,
  trustArtwork,
} as const;

export const categoryAssets = [
  categoryRing,
  categoryBracelet,
  categoryNecklace,
  categoryEarrings,
  categoryPendant,
  categoryService,
  categoryChain,
] as const;
