import { categoryAssets } from "../../assets/reference";
import type { ProductCategory, ProductFormValues } from "../../types";

export const initialCategories: readonly ProductCategory[] = [
  { name: "انگشتر", image: categoryAssets[0], children: ["انگشتر مردانه", "انگشتر زنانه", "انگشتر نگین دار"] },
  { name: "دستبند", image: categoryAssets[1], children: ["دستبند زنانه", "دستبند مردانه"] },
  { name: "سرویس", image: categoryAssets[5], children: ["سرویس کامل", "نیم ست"] },
  { name: "گردنبند", image: categoryAssets[2], children: ["گردنبند زنانه", "گردنبند مردانه"] },
];

export const initialMakers: readonly string[] = ["کارگاه طلای پارسیان", "کارگاه مرکزی"];

export const initialFields: ProductFormValues = {
  name: "انگشتر طرح نگین خورشیدی", code: "R-250904-00125", weight: "4.385",
  manualWeight: "4.385", purity: "750", size: "54", quantity: "1",
  maker: "کارگاه طلای پارسیان", template: "default", note: "نگین اتمی درجه یک",
};

export const previewNotice = "پیش‌نمایش رابط کاربری — هیچ اطلاعاتی ذخیره یا چاپ نمی‌شود.";
