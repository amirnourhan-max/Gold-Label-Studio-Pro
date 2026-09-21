import type { EntityId } from "../../types/persistence";

export type CorruptLabelTemplateReason = "malformed-json" | "invalid-layout";

/** Safe load failure: identifies the row and category, never its raw contents. */
export class CorruptLabelTemplateError extends Error {
  readonly code = "corrupt-label-template" as const;

  constructor(
    readonly templateId: string,
    readonly reason: CorruptLabelTemplateReason,
  ) {
    super(reason === "malformed-json"
      ? "محتوای قالب ذخیره‌شده قابل خواندن نیست"
      : "ساختار قالب ذخیره‌شده نامعتبر است");
    this.name = "CorruptLabelTemplateError";
  }
}

/** One designer element as stored inside the template document JSON. */
export type LabelTemplateElement = Readonly<Record<string, unknown>>;

/**
 * The persisted designer model. The label_templates columns carry the name,
 * kind and physical dimensions; the designer elements travel inside layout_json
 * together with the document format version.
 */
export type LabelTemplateDocument = Readonly<{
  name: string;
  templateKind: string;
  widthMm: number;
  heightMm: number;
  /** Format version of the persisted layout document. */
  version?: number;
  elements: readonly LabelTemplateElement[];
}>;

/** List-card projection of a saved template. */
export type SavedLabelTemplateView = Readonly<{
  id: EntityId;
  name: string;
  templateKind: string;
  widthMm: number;
  heightMm: number;
  isDefault: boolean;
}>;

export type LabelTemplateGateway = Readonly<{
  listTemplates(): Promise<readonly SavedLabelTemplateView[]>;
  loadTemplate(id: EntityId | string): Promise<LabelTemplateDocument | null>;
  saveTemplate(document: LabelTemplateDocument): Promise<SavedLabelTemplateView>;
  updateTemplate(id: EntityId | string, document: LabelTemplateDocument): Promise<SavedLabelTemplateView | null>;
  deleteTemplate(id: EntityId | string): Promise<boolean>;
}>;
