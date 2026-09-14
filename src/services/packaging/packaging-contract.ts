import type { PackageStatus } from "../../types/persistence";

/** One row of the approved scanned-items table. */
export type PackagingItemView = Readonly<{
  id: string;
  productCode: string;
  name: string;
  groupName: string;
  purityLabel: string;
  /** Gram label with three decimals, e.g. "4.385". */
  weightGrams: string;
}>;

export type PackagingFeedbackEntry = Readonly<{
  title: string;
  message: string;
  detail: string;
  timeLabel: string;
}>;

/**
 * The approved screen shows two feedback cards side by side: the red one carries
 * the latest rejected/duplicate scan, the green one the latest accepted scan.
 */
export type PackagingFeedbackView = Readonly<{
  accepted: PackagingFeedbackEntry | null;
  error: PackagingFeedbackEntry | null;
}>;

export type PackagingSummaryView = Readonly<{
  packageCode: string;
  status: PackageStatus | null;
  statusLabel: string;
  itemCount: number;
  itemCountLabel: string;
  totalWeightGrams: string;
  totalWeightLabel: string;
  purityLabel: string;
  purityCaption: string;
  elapsedLabel: string;
  operatorName: string;
  operatorRole: string;
}>;

export type PackagingSessionView = Readonly<{
  packageId: string | null;
  createdAtMs: number | null;
  items: readonly PackagingItemView[];
  summary: PackagingSummaryView;
  feedback: PackagingFeedbackView;
}>;

export type PackagingScanOutcome = "accepted" | "duplicate" | "unknown-product" | "invalid-code";

export type PackagingScanResult = Readonly<{
  outcome: PackagingScanOutcome;
  session: PackagingSessionView;
}>;

export interface PackagingGateway {
  /** Loads the newest open package, or an empty session when no package is open. */
  loadSession(): Promise<PackagingSessionView>;
  /** Creates a real package row and returns its session. */
  createPackage(): Promise<PackagingSessionView>;
  addItemByCode(productCode: string): Promise<PackagingScanResult>;
  removeItem(itemId: string): Promise<PackagingSessionView>;
  removeLastItem(): Promise<PackagingSessionView>;
  /** Completes the open package using the schema status values. */
  completePackage(): Promise<PackagingSessionView>;
}

/** Product data the packaging flow needs. Product persistence itself belongs to another boundary. */
export type PackagingProductSnapshot = Readonly<{
  id: string;
  code: string;
  name: string;
  purityPerMille: number;
  weightMg: number;
}>;

export interface PackagingProductLookup {
  findByCode(productCode: string): Promise<PackagingProductSnapshot | null>;
}
