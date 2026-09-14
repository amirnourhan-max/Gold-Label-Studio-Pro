import type { PackageRecord, PackageStatus, UtcIsoString, WeightMg } from "../../types/persistence";
import { asUtcIsoString } from "../../types/persistence";
import { PackageRepository, type PackageItemDetail } from "../../repositories/package-repository";
import type { SqlClient } from "../database/sql-client";
import type {
  PackagingFeedbackEntry,
  PackagingFeedbackView,
  PackagingGateway,
  PackagingItemView,
  PackagingProductLookup,
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

/** The approved feedback cards separate the two values with an ideographic space. */
const feedbackSeparator = "\u3000|\u3000";

export type PersistencePackagingGatewayOptions = Readonly<{
  client: SqlClient;
  productLookup: PackagingProductLookup;
  clock?: () => Date;
  createId?: () => string;
}>;

const statusLabels: Readonly<Record<PackageStatus, string>> = {
  open: "در حال بسته‌بندی",
  closed: "بسته‌بندی تکمیل شده",
  cancelled: "بسته لغو شده",
};

const emptyFeedback: PackagingFeedbackView = { accepted: null, error: null };

const asWeightMg = (value: number): WeightMg => value as WeightMg;

const defaultCreateId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toItemView = (detail: PackageItemDetail): PackagingItemView => ({
  id: detail.id,
  productCode: detail.productCode,
  name: detail.productName,
  groupName: detail.groupName ?? "—",
  purityLabel: String(detail.purityPerMille),
  weightGrams: milligramsToGrams(detail.weightMgSnapshot),
});

const acceptedFeedbackFor = (item: PackagingItemView, scannedAt: string): PackagingFeedbackEntry => ({
  title: "اسکن موفق",
  message: `${item.name} به بسته اضافه شد`,
  detail: `${item.productCode}${feedbackSeparator}${item.weightGrams} g`,
  timeLabel: formatClockLabel(scannedAt),
});

const errorFeedback = (title: string, message: string, detail: string, at: Date): PackagingFeedbackEntry => ({
  title,
  message,
  detail: detail || "—",
  timeLabel: formatClockLabel(at),
});

const derivedFeedback = (details: readonly PackageItemDetail[]): PackagingFeedbackView => {
  const last = details[details.length - 1];

  return { accepted: last ? acceptedFeedbackFor(toItemView(last), last.scannedAt) : null, error: null };
};

const buildSession = (
  packageRecord: PackageRecord | null,
  details: readonly PackageItemDetail[],
  feedback: PackagingFeedbackView,
  nowMs: number,
): PackagingSessionView => {
  const items = details.map(toItemView);
  const totalWeightMg = details.reduce((total, detail) => total + detail.weightMgSnapshot, 0);
  const purityPerMille = details[0]?.purityPerMille ?? null;

  return {
    packageId: packageRecord?.id ?? null,
    createdAtMs: packageRecord ? Date.parse(packageRecord.createdAt) : null,
    items,
    summary: {
      packageCode: packageRecord?.packageCode ?? "—",
      status: packageRecord?.status ?? null,
      statusLabel: packageRecord ? statusLabels[packageRecord.status] : "بدون بسته فعال",
      itemCount: items.length,
      itemCountLabel: formatItemCountLabel(items.length),
      totalWeightGrams: milligramsToGrams(totalWeightMg),
      totalWeightLabel: formatWeightLabel(totalWeightMg),
      purityLabel: purityPerMille === null ? "—" : String(purityPerMille),
      purityCaption: purityPerMille === null ? "—" : `${purityPerMille} عیار`,
      elapsedLabel: packageRecord ? formatDurationLabel(nowMs - Date.parse(packageRecord.createdAt)) : "—",
      operatorName: "—",
      operatorRole: "بدون اپراتور",
    },
    feedback,
  };
};

const isDuplicateConstraintError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);

  return /unique/i.test(message) || /constraint failed/i.test(message);
};

export const createPersistencePackagingGateway = (options: PersistencePackagingGatewayOptions): PackagingGateway => {
  const { client, productLookup } = options;
  const clock = options.clock ?? (() => new Date());
  const createId = options.createId ?? defaultCreateId;
  const packages = new PackageRepository(client);

  /** Session views always carry the elapsed time measured against the persisted creation stamp. */
  const toSession = (
    packageRecord: PackageRecord | null,
    details: readonly PackageItemDetail[],
    feedback: PackagingFeedbackView,
  ): PackagingSessionView => buildSession(packageRecord, details, feedback, clock().getTime());

  const createPackageRecord = async (): Promise<PackageRecord> => {
    const nowIso = asUtcIsoString(clock().toISOString());
    const codePrefix = formatPackageCodePrefix(new Date(nowIso));
    const sequence = (await packages.countByCodePrefix(codePrefix)) + 1;
    const record: PackageRecord = {
      id: createId() as PackageRecord["id"],
      packageCode: buildPackageCode(codePrefix, sequence),
      status: "open",
      operatorUserId: null,
      itemCount: 0,
      totalWeightMg: asWeightMg(0),
      closedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await packages.create({
      id: record.id,
      packageCode: record.packageCode,
      status: record.status,
      operatorUserId: null,
      itemCount: record.itemCount,
      totalWeightMg: record.totalWeightMg,
      closedAt: null,
      createdAt: nowIso,
    });

    return record;
  };

  const sessionFor = async (
    packageRecord: PackageRecord,
    feedback: PackagingFeedbackView,
  ): Promise<PackagingSessionView> => toSession(packageRecord, await packages.listItemDetails(packageRecord.id), feedback);

  const loadSession = async (): Promise<PackagingSessionView> => {
    const open = await packages.findLatestOpen();

    if (!open) {
      return toSession(null, [], emptyFeedback);
    }

    const details = await packages.listItemDetails(open.id);

    return toSession(open, details, derivedFeedback(details));
  };

  const createPackage = async (): Promise<PackagingSessionView> => sessionFor(await createPackageRecord(), emptyFeedback);

  const addItemByCode = async (productCode: string): Promise<PackagingScanResult> => {
    const normalized = normalizeProductCode(productCode);
    const now = clock();
    const nowIso = asUtcIsoString(now.toISOString());

    if (!isValidProductCode(normalized)) {
      const session = await loadSession();

      return {
        outcome: "invalid-code",
        session: {
          ...session,
          feedback: { accepted: null, error: errorFeedback("کد محصول نامعتبر", "کد محصول وارد شده معتبر نیست", normalized, now) },
        },
      };
    }

    const open = (await packages.findLatestOpen()) ?? (await createPackageRecord());
    const product = await productLookup.findByCode(normalized);

    if (!product) {
      const session = await sessionFor(open, emptyFeedback);

      return {
        outcome: "unknown-product",
        session: {
          ...session,
          feedback: {
            accepted: null,
            error: errorFeedback("محصول یافت نشد", "محصولی با این کد در سیستم ثبت نشده است", normalized, now),
          },
        },
      };
    }

    const duplicateFeedback = (): PackagingFeedbackEntry =>
      errorFeedback("اسکن تکراری", "این محصول قبلاً در بسته فعلی اسکن شده است", normalized, now);

    if (await packages.findItemId(open.id, product.id)) {
      const session = await sessionFor(open, emptyFeedback);

      return { outcome: "duplicate", session: { ...session, feedback: { accepted: null, error: duplicateFeedback() } } };
    }

    try {
      await client.transaction(async () => {
        await packages.addItem({
          id: createId(),
          packageId: open.id,
          productId: product.id,
          scannedAt: nowIso,
          scannedByUserId: open.operatorUserId,
          weightMgSnapshot: product.weightMg,
          purityPerMilleSnapshot: product.purityPerMille,
          createdAt: nowIso,
        });

        const totals = await packages.summarize(open.id);

        await packages.updateTotals({
          id: open.id,
          itemCount: totals.itemCount,
          totalWeightMg: totals.totalWeightMg,
          updatedAt: nowIso,
        });
      });
    } catch (error) {
      if (!isDuplicateConstraintError(error)) {
        throw error;
      }

      const session = await sessionFor(open, emptyFeedback);

      return { outcome: "duplicate", session: { ...session, feedback: { accepted: null, error: duplicateFeedback() } } };
    }

    const details = await packages.listItemDetails(open.id);

    return { outcome: "accepted", session: toSession(open, details, derivedFeedback(details)) };
  };

  const mutateRemoval = async (packageRecord: PackageRecord, itemId: string): Promise<PackagingSessionView> => {
    const details = await packages.listItemDetails(packageRecord.id);

    if (packageRecord.status !== "open") {
      return toSession(packageRecord, details, derivedFeedback(details));
    }

    const nowIso = asUtcIsoString(clock().toISOString());

    await client.transaction(async () => {
      await packages.removeItem(itemId);

      const totals = await packages.summarize(packageRecord.id);

      await packages.updateTotals({
        id: packageRecord.id,
        itemCount: totals.itemCount,
        totalWeightMg: totals.totalWeightMg,
        updatedAt: nowIso,
      });
    });

    const remaining = await packages.listItemDetails(packageRecord.id);

    return toSession(packageRecord, remaining, derivedFeedback(remaining));
  };

  const resolveRemovalTarget = async (): Promise<PackageRecord | null> =>
    (await packages.findLatestOpen()) ?? (await packages.findLatest());

  const completePackage = async (): Promise<PackagingSessionView> => {
    const open = await packages.findLatestOpen();

    if (!open) {
      return loadSession();
    }

    const nowIso: UtcIsoString = asUtcIsoString(clock().toISOString());

    await packages.closePackage({ id: open.id, closedAt: nowIso });

    const details = await packages.listItemDetails(open.id);

    return toSession(
      { ...open, status: "closed", closedAt: nowIso, updatedAt: nowIso },
      details,
      derivedFeedback(details),
    );
  };

  return {
    loadSession,
    createPackage,
    addItemByCode,
    removeItem: async (itemId: string) => {
      const target = await resolveRemovalTarget();

      return target ? mutateRemoval(target, itemId) : loadSession();
    },
    removeLastItem: async () => {
      const target = await resolveRemovalTarget();

      if (!target) {
        return loadSession();
      }

      const details = await packages.listItemDetails(target.id);
      const last = details[details.length - 1];

      return last ? mutateRemoval(target, last.id) : toSession(target, details, derivedFeedback(details));
    },
    completePackage,
  };
};
