import type { LabelTemplateRepository } from "../../repositories/label-template-repository";
import { asUtcIsoString, type EntityId } from "../../types/persistence";
import {
  LABEL_DOCUMENT_VERSION,
  LABEL_UNIT,
  parseLabelDocument,
  type LabelDocument,
} from "../label-designer/label-document";
import type {
  LabelTemplateDocument,
  LabelTemplateGateway,
  SavedLabelTemplateView,
} from "./template-contract";
import { CorruptLabelTemplateError } from "./template-contract";

const LAYOUT_VERSION = LABEL_DOCUMENT_VERSION;

/**
 * The stored layout is the canonical designer document: version, physical unit,
 * label size and elements. Element JSON is written exactly as the editor holds
 * it, so nothing is lost on the way to SQLite.
 */
const encodeLayout = (document: LabelTemplateDocument): string =>
  JSON.stringify({
    version: document.version ?? LAYOUT_VERSION,
    unit: LABEL_UNIT,
    widthMm: document.widthMm,
    heightMm: document.heightMm,
    elements: [...document.elements],
  });

/**
 * Decodes both complete documents and legacy top-level element arrays. Invalid
 * text is never converted into an empty design because that could later be
 * saved over the original row.
 */
const decodeLayout = (
  layoutJson: string,
  templateId: string,
  fallback: { widthMm: number; heightMm: number },
): LabelDocument => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(layoutJson);
  } catch {
    throw new CorruptLabelTemplateError(templateId, "malformed-json");
  }

  if (parsed === null || typeof parsed !== "object") {
    throw new CorruptLabelTemplateError(templateId, "invalid-layout");
  }
  if (!Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    if (record.elements !== undefined && !Array.isArray(record.elements)) {
      throw new CorruptLabelTemplateError(templateId, "invalid-layout");
    }
  }

  const result = parseLabelDocument(layoutJson, fallback);
  if (result.document === null) {
    throw new CorruptLabelTemplateError(templateId, "invalid-layout");
  }
  return result.document;
};

const toView = (
  id: EntityId,
  document: LabelTemplateDocument,
  isDefault: boolean,
): SavedLabelTemplateView => ({
  id,
  name: document.name,
  templateKind: document.templateKind,
  widthMm: document.widthMm,
  heightMm: document.heightMm,
  isDefault,
});

export class PersistenceTemplateGateway implements LabelTemplateGateway {
  constructor(private readonly repository: LabelTemplateRepository) {}

  listTemplates(): Promise<readonly SavedLabelTemplateView[]> {
    return this.repository.listActive().then(templates =>
      templates.map(template => ({
        id: template.id,
        name: template.name,
        templateKind: template.templateKind,
        widthMm: template.widthMm,
        heightMm: template.heightMm,
        isDefault: template.isDefault,
      })),
    );
  }

  async loadTemplate(id: EntityId | string): Promise<LabelTemplateDocument | null> {
    const record = await this.repository.findActiveById(id);
    if (!record) return null;

    const layout = decodeLayout(record.layoutJson, String(record.id), {
      widthMm: record.widthMm,
      heightMm: record.heightMm,
    });

    return {
      name: record.name,
      templateKind: record.templateKind,
      widthMm: layout.widthMm,
      heightMm: layout.heightMm,
      version: layout.version,
      elements: layout.elements as unknown as LabelTemplateDocument["elements"],
    };
  }

  async saveTemplate(document: LabelTemplateDocument): Promise<SavedLabelTemplateView> {
    const id = `template-${crypto.randomUUID()}` as EntityId;
    const now = asUtcIsoString(new Date().toISOString());

    await this.repository.create({
      id,
      name: document.name,
      templateKind: document.templateKind,
      widthMm: document.widthMm,
      heightMm: document.heightMm,
      layoutJson: encodeLayout(document),
      isDefault: false,
      createdAt: now,
    });

    return toView(id, document, false);
  }

  async updateTemplate(
    id: EntityId | string,
    document: LabelTemplateDocument,
  ): Promise<SavedLabelTemplateView | null> {
    const existing = await this.repository.findActiveById(id);
    if (!existing) return null;

    const updatedAt = asUtcIsoString(new Date().toISOString());
    await this.repository.update(id, {
      name: document.name,
      templateKind: document.templateKind,
      widthMm: document.widthMm,
      heightMm: document.heightMm,
      layoutJson: encodeLayout(document),
      isDefault: existing.isDefault,
      updatedAt,
    });

    return toView(id as EntityId, document, existing.isDefault);
  }

  async deleteTemplate(id: EntityId | string): Promise<boolean> {
    const deletedAt = asUtcIsoString(new Date().toISOString());
    const result = await this.repository.softDelete(id, deletedAt);
    return (result as { rowsAffected?: number }).rowsAffected !== 0;
  }
}
