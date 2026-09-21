import { formatWeightMg } from "../database/weight";

/**
 * The typed field-binding model. A dynamic element persists the binding key
 * (`product.code`), never the rendered text, so the same template prints
 * correct data for every product.
 */
export const LABEL_FIELD_KEYS = [
  "product.name",
  "product.code",
  "product.group",
  "product.mainCategory",
  "product.workshop",
  "product.purity",
  "product.weight",
  "product.stoneWeight",
  "product.size",
  "product.quantity",
  "product.status",
  "product.date",
  "package.code",
  "package.itemCount",
  "package.totalWeight",
] as const;

export type LabelFieldKey = (typeof LABEL_FIELD_KEYS)[number];

/** Every value a template binding can resolve against, already formatted. */
export type LabelDataContext = Readonly<{
  productName: string;
  productCode: string;
  productGroup: string;
  mainCategory: string;
  workshop: string;
  purityPerMille: number | null;
  weightMg: number | null;
  stoneWeightMg: number | null;
  size: string;
  quantity: number | null;
  status: string;
  date: string;
  packageCode: string;
  packageItemCount: number | null;
  packageTotalWeightMg: number | null;
}>;

export const EMPTY_LABEL_DATA_CONTEXT: LabelDataContext = {
  productName: "",
  productCode: "",
  productGroup: "",
  mainCategory: "",
  workshop: "",
  purityPerMille: null,
  weightMg: null,
  stoneWeightMg: null,
  size: "",
  quantity: null,
  status: "",
  date: "",
  packageCode: "",
  packageItemCount: null,
  packageTotalWeightMg: null,
};

/** Approved sample values so the designer preview shows a real-looking label. */
export const SAMPLE_LABEL_DATA_CONTEXT: LabelDataContext = {
  productName: "انگشتر طرح گل",
  productCode: "R-250904-00125",
  productGroup: "انگشتر",
  mainCategory: "انگشتر طلا",
  workshop: "کارگاه مرکزی",
  purityPerMille: 750,
  weightMg: 4385,
  stoneWeightMg: 120,
  size: "12",
  quantity: 1,
  status: "active",
  date: "2026-09-21",
  packageCode: "PK-250604-00125",
  packageItemCount: 6,
  packageTotalWeightMg: 24_862,
};

export type LabelFieldDefinition = Readonly<{
  key: LabelFieldKey;
  /** Persian label shown in the properties panel. */
  label: string;
  /** Grouping used by the properties panel. */
  scope: "product" | "package";
}>;

export const LABEL_FIELD_DEFINITIONS: readonly LabelFieldDefinition[] = [
  { key: "product.name", label: "نام محصول", scope: "product" },
  { key: "product.code", label: "کد محصول", scope: "product" },
  { key: "product.group", label: "گروه محصول", scope: "product" },
  { key: "product.mainCategory", label: "دسته اصلی", scope: "product" },
  { key: "product.workshop", label: "کارگاه سازنده", scope: "product" },
  { key: "product.purity", label: "عیار", scope: "product" },
  { key: "product.weight", label: "وزن (گرم)", scope: "product" },
  { key: "product.stoneWeight", label: "وزن سنگ (گرم)", scope: "product" },
  { key: "product.size", label: "سایز", scope: "product" },
  { key: "product.quantity", label: "تعداد", scope: "product" },
  { key: "product.status", label: "وضعیت", scope: "product" },
  { key: "product.date", label: "تاریخ ثبت", scope: "product" },
  { key: "package.code", label: "کد بسته", scope: "package" },
  { key: "package.itemCount", label: "تعداد اقلام بسته", scope: "package" },
  { key: "package.totalWeight", label: "وزن کل بسته (گرم)", scope: "package" },
];

export const isLabelFieldKey = (value: string): value is LabelFieldKey =>
  (LABEL_FIELD_KEYS as readonly string[]).includes(value);

export const labelFieldLabel = (key: LabelFieldKey): string =>
  LABEL_FIELD_DEFINITIONS.find(definition => definition.key === key)?.label ?? key;

const STATUS_LABELS: Readonly<Record<string, string>> = {
  active: "فعال",
  pending_print: "در انتظار چاپ",
  inactive: "غیرفعال",
  packaged: "بسته‌بندی‌شده",
  returned: "مرجوعی",
};

/** Grams with milligram precision: 4385 mg -> "4.385". */
export const formatWeightGrams = (weightMg: number | null): string =>
  weightMg === null || !Number.isInteger(weightMg) || weightMg < 0 ? "" : formatWeightMg(weightMg);

/** ISO-8601 timestamp -> calendar date, without a locale dependency. */
export const formatLabelDate = (value: string): string =>
  /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";

export const resolveLabelField = (key: LabelFieldKey, context: LabelDataContext): string => {
  switch (key) {
    case "product.name": return context.productName;
    case "product.code": return context.productCode;
    case "product.group": return context.productGroup;
    case "product.mainCategory": return context.mainCategory;
    case "product.workshop": return context.workshop;
    case "product.purity": return context.purityPerMille === null ? "" : `${context.purityPerMille}`;
    case "product.weight": return formatWeightGrams(context.weightMg);
    case "product.stoneWeight": return formatWeightGrams(context.stoneWeightMg);
    case "product.size": return context.size;
    case "product.quantity": return context.quantity === null ? "" : `${context.quantity}`;
    case "product.status": return STATUS_LABELS[context.status] ?? context.status;
    case "product.date": return formatLabelDate(context.date);
    case "package.code": return context.packageCode;
    case "package.itemCount": return context.packageItemCount === null ? "" : `${context.packageItemCount}`;
    case "package.totalWeight": return formatWeightGrams(context.packageTotalWeightMg);
    default: return "";
  }
};

/**
 * Resolves the printable text of an element: the bound field when it has a
 * value, otherwise the stored fallback text.
 */
export const resolveLabelText = (
  element: Readonly<{ text: string; binding: LabelFieldKey | null }>,
  context: LabelDataContext,
  options: { fallbackToPlaceholder?: boolean } = {},
): string => {
  if (element.binding === null) return element.text;
  const resolved = resolveLabelField(element.binding, context).trim();
  if (resolved.length > 0) return resolved;
  if (element.text.trim().length > 0) return element.text;
  return options.fallbackToPlaceholder === false ? "" : `{${labelFieldLabel(element.binding)}}`;
};
