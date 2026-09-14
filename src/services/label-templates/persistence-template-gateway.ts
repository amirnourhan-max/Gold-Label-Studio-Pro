import type { LabelTemplateRepository } from "../../repositories/label-template-repository";
import { asUtcIsoString, type EntityId } from "../../types/persistence";
import type {
  LabelTemplateDocument,
  LabelTemplateGateway,
  SavedLabelTemplateView,
} from "./template-contract";

const LAYOUT_VERSION = 1;

const encodeLayout = (document: LabelTemplateDocument): string =>
  JSON.stringify({
    version: LAYOUT_VERSION,
    widthMm: document.widthMm,
    heightMm: document.heightMm,
    elements: [...document.elements],
  });

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

    const layout = JSON.parse(record.layoutJson) as {
      widthMm?: number;
      heightMm?: number;
      elements?: readonly Record<string, unknown>[];
    };

    return {
      name: record.name,
      templateKind: record.templateKind,
      widthMm: typeof layout.widthMm === "number" ? layout.widthMm : record.widthMm,
      heightMm: typeof layout.heightMm === "number" ? layout.heightMm : record.heightMm,
      elements: Array.isArray(layout.elements) ? layout.elements : [],
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
