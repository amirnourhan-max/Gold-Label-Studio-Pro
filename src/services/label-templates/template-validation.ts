import type { LabelTemplateDocument } from "./template-contract";

export type LabelTemplateValidationIssue = Readonly<{
  field: "name" | "widthMm" | "heightMm" | "layout" | "elements";
  message: string;
}>;

const NAME_MAX_LENGTH = 80;
const MAX_DIMENSION_MM = 500;

/**
 * Schema-aligned validation for a template document before it reaches the
 * repository: non-empty name, positive physical dimensions and JSON-safe
 * designer elements. Persian messages keep the approved UI language.
 */
export const validateLabelTemplate = (document: LabelTemplateDocument): readonly LabelTemplateValidationIssue[] => {
  const issues: LabelTemplateValidationIssue[] = [];

  const name = document.name.trim();
  if (name.length === 0) {
    issues.push({ field: "name", message: "نام قالب نمی‌تواند خالی باشد" });
  } else if (name.length > NAME_MAX_LENGTH) {
    issues.push({ field: "name", message: `نام قالب حداکثر ${NAME_MAX_LENGTH} کاراکتر است` });
  }

  if (!Number.isFinite(document.widthMm) || document.widthMm <= 0 || document.widthMm > MAX_DIMENSION_MM) {
    issues.push({ field: "widthMm", message: "عرض لیبل باید عددی بین ۰ تا ۵۰۰ میلی‌متر باشد" });
  }

  if (!Number.isFinite(document.heightMm) || document.heightMm <= 0 || document.heightMm > MAX_DIMENSION_MM) {
    issues.push({ field: "heightMm", message: "ارتفاع لیبل باید عددی بین ۰ تا ۵۰۰ میلی‌متر باشد" });
  }

  try {
    JSON.stringify([...document.elements]);
  } catch {
    issues.push({ field: "elements", message: "عناصر طراحی قابل ذخیره‌سازی نیستند" });
  }

  return issues;
};

export const isLabelTemplateValid = (document: LabelTemplateDocument): boolean =>
  validateLabelTemplate(document).length === 0;
