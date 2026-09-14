import type { PackageStatus } from "../../types/persistence";
import type {
  PackagingFeedbackEntry,
  PackagingFeedbackView,
  PackagingGateway,
  PackagingItemView,
  PackagingScanResult,
  PackagingSessionView,
} from "./packaging-contract";
import {
  buildPackageCode,
  formatClockLabel,
  formatDurationLabel,
  formatItemCountLabel,
  formatPackageCodePrefix,
  formatWeightLabel,
  isValidProductCode,
  milligramsToGrams,
  normalizeProductCode,
} from "./packaging-validation";

const feedbackSeparator = "\u3000|\u3000";

/** Approved preview content, kept as the controlled fallback when SQLite is unavailable. */
const approvedItems: ReadonlyArray<Readonly<{ code: string; name: string; group: string; purity: number; weightMg: number }>> = [
  { code: "R-250604-00125", name: "انگشتر طرح گل", group: "انگشتر", purity: 750, weightMg: 4385 },
  { code: "B-250604-00087", name: "دستبند کارتیر", group: "دستبند", purity: 750, weightMg: 8340 },
  { code: "N-250604-00056", name: "گردنبند طلا توپ قلب", group: "گردنبند", purity: 750, weightMg: 3215 },
  { code: "G-250604-00031", name: "گوشواره حلقه‌ای", group: "گوشواره", purity: 750, weightMg: 2870 },
  { code: "R-250604-00126", name: "انگشتر طرح پیچ", group: "انگشتر", purity: 750, weightMg: 4102 },
  { code: "P-250604-00099", name: "پلاک اسم محمد", group: "پلاک", purity: 750, weightMg: 1950 },
];

/** Sample products that make manual entry explorable while the preview runs without SQLite. */
const previewCatalogue = [
  ...approvedItems,
  { code: "R-250604-00130", name: "انگشتر طرح نگین", group: "انگشتر", purity: 750, weightMg: 3480 },
  { code: "B-250604-00090", name: "دستبند طلا زنجیری", group: "دستبند", purity: 750, weightMg: 5670 },
] as const;

const approvedFeedback: PackagingFeedbackView = {
  accepted: {
    title: "اسکن موفق",
    message: "پلاک اسم محمد به بسته اضافه شد",
    detail: `P-250604-00099${feedbackSeparator}1.850 g`,
    timeLabel: "10:24:15",
  },
  error: {
    title: "اسکن تکراری",
    message: "این محصول قبلاً در بسته فعلی اسکن شده است",
    detail: "R-250604-00125",
    timeLabel: "10:24:18",
  },
};

type MockItem = Readonly<{
  id: string;
  code: string;
  name: string;
  group: string;
  purity: number;
  weightMg: number;
}>;

export type MockPackagingGatewayOptions = Readonly<{
  clock?: () => Date;
  /** Defaults to 14 minutes 37 seconds before now, matching the approved preview. */
  initialCreatedAtMs?: number;
}>;

export const createMockPackagingGateway = (options: MockPackagingGatewayOptions = {}): PackagingGateway => {
  const clock = options.clock ?? (() => new Date());

  let packageCode = "PK-250604-00125";
  let status: PackageStatus | null = "open";
  let createdAtMs = options.initialCreatedAtMs ?? null;

  /** The approved preview package is always 14 minutes 37 seconds old. */
  const currentCreatedAtMs = (): number => {
    if (createdAtMs === null) {
      createdAtMs = clock().getTime() - 877_000;
    }

    return createdAtMs;
  };
  let items: MockItem[] = approvedItems.map((item, index) => ({ id: `mock-item-${index + 1}`, ...item }));
  let feedback: PackagingFeedbackView = approvedFeedback;
  let sequence = 125;

  const toItemView = (item: MockItem, index: number): PackagingItemView => ({
    id: item.id,
    productCode: item.code,
    name: item.name,
    groupName: item.group,
    purityLabel: String(item.purity),
    weightGrams: milligramsToGrams(item.weightMg),
  });

  const session = (): PackagingSessionView => {
    const itemViews = items.map(toItemView);
    const totalWeightMg = items.reduce((total, item) => total + item.weightMg, 0);

    return {
      packageId: status === null ? null : "mock-package-1",
      createdAtMs: status === null ? null : currentCreatedAtMs(),
      items: itemViews,
      summary: {
        packageCode: status === null ? "—" : packageCode,
        status,
        statusLabel: status === "closed" ? "بسته‌بندی تکمیل شده" : status === null ? "بدون بسته فعال" : "در حال بسته‌بندی",
        itemCount: itemViews.length,
        itemCountLabel: formatItemCountLabel(itemViews.length),
        totalWeightGrams: milligramsToGrams(totalWeightMg),
        totalWeightLabel: formatWeightLabel(totalWeightMg),
        purityLabel: items[0] ? String(items[0].purity) : "—",
        purityCaption: items[0] ? `${items[0].purity} عیار` : "—",
        elapsedLabel: status === null ? "—" : formatDurationLabel(clock().getTime() - currentCreatedAtMs()),
        operatorName: "Admin",
        operatorRole: "اپراتور ارشد",
      },
      feedback,
    };
  };

  const acceptedEntryFor = (item: MockItem, at: Date): PackagingFeedbackEntry => ({
    title: "اسکن موفق",
    message: `${item.name} به بسته اضافه شد`,
    detail: `${item.code}${feedbackSeparator}${milligramsToGrams(item.weightMg)} g`,
    timeLabel: formatClockLabel(at),
  });

  const errorEntryFor = (title: string, message: string, detail: string, at: Date): PackagingFeedbackEntry => ({
    title,
    message,
    detail: detail || "—",
    timeLabel: formatClockLabel(at),
  });

  const scan = (productCode: string): PackagingScanResult => {
    const normalized = normalizeProductCode(productCode);
    const now = clock();

    if (!isValidProductCode(normalized)) {
      feedback = {
        accepted: null,
        error: errorEntryFor("کد محصول نامعتبر", "کد محصول وارد شده معتبر نیست", normalized, now),
      };
      return { outcome: "invalid-code", session: session() };
    }

    if (status === null) {
      packageCode = buildPackageCode(formatPackageCodePrefix(now), ++sequence);
      status = "open";
      createdAtMs = now.getTime();
      items = [];
    }

    const product = previewCatalogue.find((entry) => entry.code === normalized);

    if (!product) {
      feedback = {
        accepted: null,
        error: errorEntryFor("محصول یافت نشد", "محصولی با این کد در سیستم ثبت نشده است", normalized, now),
      };
      return { outcome: "unknown-product", session: session() };
    }

    if (items.some((item) => item.code === normalized)) {
      feedback = {
        accepted: null,
        error: errorEntryFor("اسکن تکراری", "این محصول قبلاً در بسته فعلی اسکن شده است", normalized, now),
      };
      return { outcome: "duplicate", session: session() };
    }

    const added: MockItem = {
      id: `mock-item-${++sequence}`,
      code: product.code,
      name: product.name,
      group: product.group,
      purity: product.purity,
      weightMg: product.weightMg,
    };

    items = [...items, added];
    feedback = { accepted: acceptedEntryFor(added, now), error: null };

    return { outcome: "accepted", session: session() };
  };

  return {
    loadSession: async () => session(),
    createPackage: async () => {
      const now = clock();

      packageCode = buildPackageCode(formatPackageCodePrefix(now), ++sequence);
      status = "open";
      createdAtMs = now.getTime();
      items = [];
      feedback = { accepted: null, error: null };

      return session();
    },
    addItemByCode: async (productCode: string) => scan(productCode),
    removeItem: async (itemId: string) => {
      if (status === "open") {
        items = items.filter((item) => item.id !== itemId);
        const last = items[items.length - 1];

        feedback = { accepted: last ? acceptedEntryFor(last, clock()) : null, error: null };
      }

      return session();
    },
    removeLastItem: async () => {
      if (status === "open") {
        items = items.slice(0, -1);
        const last = items[items.length - 1];

        feedback = { accepted: last ? acceptedEntryFor(last, clock()) : null, error: null };
      }

      return session();
    },
    completePackage: async () => {
      if (status === "open") {
        status = "closed";
      }

      return session();
    },
  };
};
