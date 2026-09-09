import { categoryAssets, referenceAssets } from "../../assets/reference";
import type { ProductRecord } from "../../types";

export const productRows: readonly ProductRecord[] = [
  { id: 1, code: "R-250904-00125", name: "انگشتر طرح گل", group: "انگشتر", category: "انگشتر زنانه", purity: "۷۵۰", weight: "۴.۳۸۵ g", status: "فعال", image: referenceAssets.productRegistrationRing },
  { id: 2, code: "B-250904-00124", name: "دستبند کارتیه", group: "دستبند", category: "دستبند طلا", purity: "۷۵۰", weight: "۸.۳۴۰ g", status: "فعال", image: categoryAssets[1] },
  { id: 3, code: "N-250904-00123", name: "گردنبند طرح قلب", group: "گردنبند", category: "گردنبند زنانه", purity: "۷۵۰", weight: "۳.۲۱۵ g", status: "در انتظار چاپ", image: categoryAssets[2] },
  { id: 4, code: "S-250904-00122", name: "سرویس طرح نگین", group: "سرویس", category: "سرویس عروس", purity: "۷۵۰", weight: "۱۵.۸۵۰ g", status: "فعال", image: categoryAssets[5] },
  { id: 5, code: "P-250904-00121", name: "پلاک اسم محمد", group: "پلاک", category: "پلاک سفارشی", purity: "۷۵۰", weight: "۱.۹۵۰ g", status: "غیرفعال", image: categoryAssets[4] },
  { id: 6, code: "E-250904-00120", name: "گوشواره مروارید", group: "گوشواره", category: "گوشواره آویزی", purity: "۷۵۰", weight: "۲.۴۵۰ g", status: "فعال", image: categoryAssets[3] },
  { id: 7, code: "C-250904-00119", name: "زنجیر طلایی", group: "سایر", category: "زنجیر", purity: "۷۵۰", weight: "۷.۱۲۰ g", status: "فعال", image: categoryAssets[6] },
];
