export type ProductStatus = "فعال" | "در انتظار چاپ" | "غیرفعال" | "بسته‌بندی‌شده" | "مرجوع‌شده";

export type ProductRecord = Readonly<{
  id: number;
  code: string;
  name: string;
  group: string;
  category: string;
  purity: string;
  weight: string;
  status: ProductStatus;
  image: string;
}>;

export type ProductCategory = Readonly<{
  name: string;
  image: string;
  children: readonly string[];
}>;

export type ProductFormValues = Readonly<{
  name: string;
  code: string;
  weight: string;
  manualWeight: string;
  purity: string;
  size: string;
  quantity: string;
  maker: string;
  template: string;
  note: string;
}>;

export type PackageItem = readonly [
  code: string,
  name: string,
  group: string,
  purity: string,
  weight: string,
];

export type ReturnScan = readonly [
  row: string,
  time: string,
  code: string,
  name: string,
  group: string,
  weight: string,
  status: "موفق" | "بارکد تکراری",
];

export type DisplayUser = readonly [
  name: string,
  role: "مدیر سیستم" | "اپراتور",
  username: string,
  status: "فعال" | "غیرفعال",
];

export type LabelPrintQueueItem = readonly [
  code: string,
  name: string,
  count: string,
  state: string,
  tone: "active" | "waiting",
];
