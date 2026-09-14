export type ProductFormValidationIssue = Readonly<{
  field: string;
  message: string;
}>;

export type ProductFormValidationResult = Readonly<{
  valid: boolean;
  issues: readonly ProductFormValidationIssue[];
}>;

export type ProductFormValidationInput = Readonly<{
  name: string;
  code: string;
  weight: string;
  stoneWeight: string;
  purity: string;
  quantity: string;
  groupId: string | null;
  categoryId: string | null;
  workshopId: string | null;
}>;

const decimalPattern = /^\d+(\.\d+)?$/;

export const validateProductForm = (input: ProductFormValidationInput): ProductFormValidationResult => {
  const issues: ProductFormValidationIssue[] = [];

  if (input.groupId === null || input.groupId.length === 0) {
    issues.push({ field: "group", message: "انتخاب گروه اصلی الزامی است" });
  }
  if (input.categoryId === null || input.categoryId.length === 0) {
    issues.push({ field: "category", message: "انتخاب زیرمجموعه الزامی است" });
  }
  if (input.name.trim().length === 0) {
    issues.push({ field: "name", message: "نام محصول الزامی است" });
  }
  if (input.code.trim().length === 0) {
    issues.push({ field: "code", message: "کد داخلی الزامی است" });
  }
  if (!decimalPattern.test(input.weight.trim()) || Number(input.weight) <= 0) {
    issues.push({ field: "weight", message: "وزن باید عددی بزرگ‌تر از صفر باشد" });
  }
  if (input.stoneWeight.trim().length > 0 && !decimalPattern.test(input.stoneWeight.trim())) {
    issues.push({ field: "stoneWeight", message: "وزن نگین باید عددی معتبر باشد" });
  }
  if (input.purity.trim().length === 0) {
    issues.push({ field: "purity", message: "عیار الزامی است" });
  }
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    issues.push({ field: "quantity", message: "تعداد باید عددی صحیح و بزرگ‌تر از صفر باشد" });
  }
  if (input.workshopId === null || input.workshopId.length === 0) {
    issues.push({ field: "workshop", message: "انتخاب کارگاه / سازنده الزامی است" });
  }

  return { valid: issues.length === 0, issues };
};
