import { isLabelFieldKey } from "../label-designer/label-bindings";
import {
  LABEL_DOCUMENT_VERSION,
  LABEL_ELEMENT_KINDS,
  normalizeLabelElement,
} from "../label-designer/label-document";
import type { LabelTemplateDocument } from "./template-contract";

export type LabelTemplateValidationIssue = Readonly<{
  field: "name" | "widthMm" | "heightMm" | "layout" | "elements" | "version";
  message: string;
}>;

const NAME_MAX_LENGTH = 80;
const MAX_DIMENSION_MM = 500;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/**
 * Schema-aligned validation for a template document before it reaches the
 * repository: non-empty name, positive physical dimensions, a supported
 * document version and designer elements that survive normalisation. Persian
 * messages keep the approved UI language.
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

  if (document.version !== undefined && document.version > LABEL_DOCUMENT_VERSION) {
    issues.push({
      field: "version",
      message: `این قالب با نسخه جدیدتر (${document.version}) ساخته شده است`,
    });
  }

  let serializable = true;
  try {
    JSON.stringify([...document.elements]);
  } catch {
    serializable = false;
    issues.push({ field: "elements", message: "عناصر طراحی قابل ذخیره‌سازی نیستند" });
  }

  if (serializable) {
    document.elements.forEach((element, index) => {
      const normalized = normalizeLabelElement(element, `element-${index + 1}`);
      if (normalized === null) {
        issues.push({ field: "elements", message: `عنصر شماره ${index + 1} ساختار معتبری ندارد` });
        return;
      }
      if (!LABEL_ELEMENT_KINDS.includes(normalized.kind)) {
        issues.push({ field: "elements", message: `نوع عنصر شماره ${index + 1} پشتیبانی نمی‌شود` });
      }

      const record = asRecord(element);
      const rawBinding = record === null ? null : record.binding ?? record.field ?? record.fieldKey;
      if (typeof rawBinding === "string" && !isLabelFieldKey(rawBinding)) {
        issues.push({ field: "elements", message: `متغیر متصل عنصر شماره ${index + 1} شناسایی نشد` });
      }
    });
  }

  return issues;
};

export const isLabelTemplateValid = (document: LabelTemplateDocument): boolean =>
  validateLabelTemplate(document).length === 0;
