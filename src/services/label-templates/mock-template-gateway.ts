import type { EntityId } from "../../types/persistence";
import type {
  LabelTemplateDocument,
  LabelTemplateGateway,
  SavedLabelTemplateView,
} from "./template-contract";

/**
 * The six approved saved-template cards, used as the synchronous first paint
 * and as the controlled in-memory fallback when SQLite is unavailable
 * (browser preview, tests, device-less demos).
 */
export const approvedSavedTemplateViews: readonly SavedLabelTemplateView[] = [
  "انگشتر", "دستبند", "گردنبند", "سرویس", "پلاک", "گوشواره",
].map((name, index) => ({
  id: `mock-template-${index + 1}` as EntityId,
  name,
  templateKind: "product",
  widthMm: 50,
  heightMm: 30,
  isDefault: index === 0,
}));

/**
 * Controlled in-memory fallback so the approved UI keeps rendering exactly the
 * six approved template cards when SQLite persistence is unavailable. Nothing
 * here touches the designer UI.
 */
export class MockTemplateGateway implements LabelTemplateGateway {
  private templates: Array<SavedLabelTemplateView & { document: LabelTemplateDocument }> =
    approvedSavedTemplateViews.map(view => ({
      ...view,
      document: {
        name: view.name,
        templateKind: view.templateKind,
        widthMm: view.widthMm,
        heightMm: view.heightMm,
        elements: [],
      } satisfies LabelTemplateDocument,
    }));

  async listTemplates(): Promise<readonly SavedLabelTemplateView[]> {
    return this.templates.map(({ document: _document, ...view }) => view);
  }

  async loadTemplate(id: EntityId | string): Promise<LabelTemplateDocument | null> {
    return this.templates.find(template => template.id === id)?.document ?? null;
  }

  async saveTemplate(document: LabelTemplateDocument): Promise<SavedLabelTemplateView> {
    const view: SavedLabelTemplateView = {
      id: `mock-template-${crypto.randomUUID()}` as EntityId,
      name: document.name,
      templateKind: document.templateKind,
      widthMm: document.widthMm,
      heightMm: document.heightMm,
      isDefault: false,
    };
    this.templates = [...this.templates, { ...view, document }];
    return view;
  }

  async updateTemplate(
    id: EntityId | string,
    document: LabelTemplateDocument,
  ): Promise<SavedLabelTemplateView | null> {
    const index = this.templates.findIndex(template => template.id === id);
    if (index === -1) return null;

    const isDefault = this.templates[index].isDefault;
    const view: SavedLabelTemplateView = {
      id: this.templates[index].id,
      name: document.name,
      templateKind: document.templateKind,
      widthMm: document.widthMm,
      heightMm: document.heightMm,
      isDefault,
    };
    this.templates = this.templates.map((item, itemIndex) =>
      itemIndex === index ? { ...view, document } : item,
    );
    return view;
  }

  async deleteTemplate(id: EntityId | string): Promise<boolean> {
    const index = this.templates.findIndex(template => template.id === id);
    if (index === -1) return false;
    this.templates = this.templates.filter(template => template.id !== id);
    return true;
  }
}
