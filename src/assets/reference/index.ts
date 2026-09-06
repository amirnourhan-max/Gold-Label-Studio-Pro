import brandDiamond from "./brand-diamond.webp";
import heroJewelry from "./hero-jewelry.webp";
import categories from "./categories.webp";
import devices from "./devices.webp";
import trustArtwork from "./trust-artwork.webp";
import productRegistrationRing from "./product-registration-ring.webp";
import productRegistrationLabel from "./product-registration-label.webp";
import designerLabel from "./designer-label.webp";
import packageLabel from "./package-label.webp";
import designerFullLabel from "./designer-full-label.webp";
import designerTemplateRing from "./designer-template-ring.webp";
import designerTemplateBracelet from "./designer-template-bracelet.webp";
import designerTemplateNecklace from "./designer-template-necklace.webp";
import designerTemplateService from "./designer-template-service.webp";
import designerTemplatePlaque from "./designer-template-plaque.webp";
import designerTemplateEarrings from "./designer-template-earrings.webp";
import barcodeScannerReference from "./barcode-scanner-reference.png";

import categoryRing from "./category-ring.webp";
import categoryBracelet from "./category-bracelet.webp";
import categoryNecklace from "./category-necklace.webp";
import categoryEarrings from "./category-earrings.webp";
import categoryPendant from "./category-pendant.webp";
import categoryService from "./category-service.webp";
import categoryChain from "./category-chain.webp";

export const referenceAssets = {
  brandDiamond,
  heroJewelry,
  categories,
  devices,
  trustArtwork,
  productRegistrationRing,
  productRegistrationLabel,
  designerLabel,
  packageLabel,
  designerFullLabel,
  barcodeScannerReference,
} as const;

export const designerTemplates = [designerTemplateRing, designerTemplateBracelet, designerTemplateNecklace, designerTemplateService, designerTemplatePlaque, designerTemplateEarrings] as const;

export const categoryAssets = [
  categoryRing,
  categoryBracelet,
  categoryNecklace,
  categoryEarrings,
  categoryPendant,
  categoryService,
  categoryChain,
] as const;
