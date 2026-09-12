export type Brand<Value, Name extends string> = Value & Readonly<{ readonly __brand: Name }>;

export type UtcIsoString = Brand<string, "UtcIsoString">;
export type WeightMg = Brand<number, "WeightMg">;

export type EntityId = Brand<string, "EntityId">;
export type ProductId = Brand<string, "ProductId">;
export type PackageId = Brand<string, "PackageId">;
export type ReturnSessionId = Brand<string, "ReturnSessionId">;
export type UserId = Brand<string, "UserId">;

const utcIsoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const asUtcIsoString = (value: string): UtcIsoString => {
  if (!utcIsoPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error("Timestamp must be a normalized UTC ISO-8601 value");
  }

  return value as UtcIsoString;
};

export type AuditFields = Readonly<{
  createdAt: UtcIsoString;
  updatedAt: UtcIsoString;
}>;

export type SoftDeleteFields = Readonly<{
  deletedAt: UtcIsoString | null;
}>;

export type ProductPersistenceStatus = "active" | "pending_print" | "inactive" | "packaged" | "returned";
export type PackageStatus = "open" | "closed" | "cancelled";
export type ReturnSessionStatus = "open" | "stopped" | "completed";
export type ReturnScanStatus = "accepted" | "duplicate" | "rejected";
export type UserRole = "admin" | "operator";

export type ProductGroupRecord = Readonly<{
  id: EntityId;
  name: string;
  sortOrder: number;
  isActive: boolean;
} & AuditFields & SoftDeleteFields>;

export type MainCategoryRecord = Readonly<{
  id: EntityId;
  productGroupId: EntityId;
  name: string;
  sortOrder: number;
  isActive: boolean;
} & AuditFields & SoftDeleteFields>;

export type WorkshopRecord = Readonly<{
  id: EntityId;
  name: string;
  isActive: boolean;
} & AuditFields & SoftDeleteFields>;

export type LabelTemplateRecord = Readonly<{
  id: EntityId;
  name: string;
  templateKind: string;
  widthMm: number;
  heightMm: number;
  layoutJson: string;
  isDefault: boolean;
  isActive: boolean;
} & AuditFields>;

export type ProductRecord = Readonly<{
  id: ProductId;
  productCode: string;
  name: string;
  productGroupId: EntityId | null;
  mainCategoryId: EntityId | null;
  workshopId: EntityId | null;
  labelTemplateId: EntityId | null;
  purityPerMille: number;
  weightMg: WeightMg;
  stoneWeightMg: WeightMg;
  size: string | null;
  quantity: number;
  imagePath: string | null;
  note: string | null;
  status: ProductPersistenceStatus;
} & AuditFields & SoftDeleteFields>;

export type PackageRecord = Readonly<{
  id: PackageId;
  packageCode: string;
  status: PackageStatus;
  operatorUserId: UserId | null;
  itemCount: number;
  totalWeightMg: WeightMg;
  closedAt: UtcIsoString | null;
} & AuditFields>;

export type PackageItemRecord = Readonly<{
  id: EntityId;
  packageId: PackageId;
  productId: ProductId;
  scannedAt: UtcIsoString;
  scannedByUserId: UserId | null;
  weightMgSnapshot: WeightMg;
  purityPerMilleSnapshot: number;
} & AuditFields>;

export type ReturnSessionRecord = Readonly<{
  id: ReturnSessionId;
  status: ReturnSessionStatus;
  operatorUserId: UserId | null;
  startedAt: UtcIsoString;
  endedAt: UtcIsoString | null;
} & AuditFields>;

export type ReturnScanRecord = Readonly<{
  id: EntityId;
  returnSessionId: ReturnSessionId;
  productId: ProductId | null;
  scannedCode: string;
  scanStatus: ReturnScanStatus;
  weightMgSnapshot: WeightMg | null;
  scannedAt: UtcIsoString;
} & AuditFields>;

export type UserRecord = Readonly<{
  id: UserId;
  displayName: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  passwordHash: string | null;
  passwordAlgorithm: string | null;
  passwordVersion: number | null;
} & AuditFields & SoftDeleteFields>;

export type CreateProductInput = Readonly<{
  id: ProductId;
  productCode: string;
  name: string;
  productGroupId: EntityId | null;
  mainCategoryId: EntityId | null;
  workshopId: EntityId | null;
  labelTemplateId: EntityId | null;
  purityPerMille: number;
  weightMg: WeightMg;
  stoneWeightMg: WeightMg;
  size: string | null;
  quantity: number;
  imagePath: string | null;
  note: string | null;
  status: ProductPersistenceStatus;
  createdAt: UtcIsoString;
}>;

export type CreateProductGroupInput = Readonly<{
  id: EntityId;
  name: string;
  sortOrder: number;
  createdAt: UtcIsoString;
}>;

export type CreateMainCategoryInput = Readonly<{
  id: EntityId;
  productGroupId: EntityId;
  name: string;
  sortOrder: number;
  createdAt: UtcIsoString;
}>;

export type CreateWorkshopInput = Readonly<{
  id: EntityId;
  name: string;
  createdAt: UtcIsoString;
}>;

export type ProductCatalogRecord = ProductRecord & Readonly<{
  groupName: string | null;
  categoryName: string | null;
  workshopName: string | null;
}>;

export type CreateUserInput = Readonly<{
  id: UserId;
  displayName: string;
  username: string;
  role: UserRole;
  passwordHash: string | null;
  passwordAlgorithm: string | null;
  passwordVersion: number | null;
  createdAt: UtcIsoString;
}>;
