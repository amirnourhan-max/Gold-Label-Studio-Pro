import { useMemo } from "react";
import { AppShell } from "../layouts/AppShell";
import { LabelDesignerPage } from "../features/operations/LabelDesignerPage";
import {
  LABEL_DOCUMENT_VERSION,
  createLabelDocument,
  createLabelElement,
  type LabelElement,
} from "../services/label-designer/label-document";
import type {
  LabelTemplateDocument,
  LabelTemplateGateway,
  SavedLabelTemplateView,
} from "../services/label-templates/template-contract";
import type { EntityId } from "../types/persistence";

const VISUAL_TEMPLATE_ID = "visual-label-designer" as EntityId;

const visualDocument = (): LabelTemplateDocument => {
  const elements: LabelElement[] = [];
  elements.push(createLabelElement("text", elements, { xMm: 4, yMm: 4, text: "لیبل نمونه طلا" }));
  elements.push(createLabelElement("qr", elements, { xMm: 29, yMm: 4, widthMm: 15, heightMm: 15, text: "GLSP-VISUAL" }));
  elements.push(createLabelElement("barcode", elements, { xMm: 4, yMm: 16, widthMm: 27, heightMm: 9, text: "GLSP-2026", humanReadable: true }));
  const document = createLabelDocument({
    version: LABEL_DOCUMENT_VERSION,
    widthMm: 50,
    heightMm: 30,
    elements,
  });
  return {
    name: "قالب بررسی تصویری",
    templateKind: "product",
    widthMm: document.widthMm,
    heightMm: document.heightMm,
    version: document.version,
    elements: document.elements as unknown as LabelTemplateDocument["elements"],
  };
};

const visualGateway = (): LabelTemplateGateway => {
  let document = visualDocument();
  let view: SavedLabelTemplateView = {
    id: VISUAL_TEMPLATE_ID,
    name: document.name,
    templateKind: document.templateKind,
    widthMm: document.widthMm,
    heightMm: document.heightMm,
    isDefault: true,
  };

  return {
    listTemplates: async () => [view],
    loadTemplate: async id => String(id) === String(view.id) ? document : null,
    saveTemplate: async next => {
      document = next;
      view = { ...view, name: next.name, widthMm: next.widthMm, heightMm: next.heightMm };
      return view;
    },
    updateTemplate: async (id, next) => {
      if (String(id) !== String(view.id)) return null;
      document = next;
      view = { ...view, name: next.name, widthMm: next.widthMm, heightMm: next.heightMm };
      return view;
    },
    deleteTemplate: async id => String(id) === String(view.id),
  };
};

/** Deterministic test-only app used by Windows visual CI. */
export function VisualTestApp() {
  const gateway = useMemo(visualGateway, []);
  return (
    <AppShell activePage="label-designer" onNavigate={() => {}}>
      <LabelDesignerPage templateGateway={gateway} />
    </AppShell>
  );
}

