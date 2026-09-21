import { describe, expect, it } from "vitest";
import { LabelTemplateRepository } from "../../repositories/label-template-repository";
import { InMemoryTemplateStore } from "./test-support/in-memory-template-store";
import { PersistenceTemplateGateway } from "./persistence-template-gateway";
import type { LabelTemplateDocument } from "./template-contract";
import { LABEL_DOCUMENT_VERSION, parseLabelDocument } from "../label-designer/label-document";

const designerDocument: LabelTemplateDocument = {
  name: "قالب انگشتر کارگاه",
  templateKind: "product",
  widthMm: 40,
  heightMm: 25,
  version: LABEL_DOCUMENT_VERSION,
  elements: [
    {
      id: "frame-1",
      kind: "frame",
      xMm: 1,
      yMm: 1,
      widthMm: 38,
      heightMm: 23,
      rotation: 0,
      zIndex: 0,
      visible: true,
      text: "",
      binding: null,
      paddingMm: 0.5,
      showFrame: false,
      barcodeType: "code128",
      humanReadable: false,
      imagePath: null,
      errorCorrection: "M",
      style: {
        fontSizeMm: 3.2,
        fontWeight: "normal",
        align: "left",
        color: "#000000",
        backgroundColor: "#FFFFFF",
        borderWidthMm: 0.2,
        borderRadiusMm: 0,
      },
    },
    {
      id: "text-1",
      kind: "text",
      xMm: 3,
      yMm: 3,
      widthMm: 22,
      heightMm: 6,
      rotation: 0,
      zIndex: 1,
      visible: true,
      text: "گالری طلا",
      binding: null,
      paddingMm: 0.5,
      showFrame: false,
      barcodeType: "code128",
      humanReadable: false,
      imagePath: null,
      errorCorrection: "M",
      style: {
        fontSizeMm: 3,
        fontWeight: "bold",
        align: "center",
        color: "#101010",
        backgroundColor: "#FFFFFF",
        borderWidthMm: 0.2,
        borderRadiusMm: 1.5,
      },
    },
    {
      id: "field-1",
      kind: "field",
      xMm: 3,
      yMm: 10,
      widthMm: 22,
      heightMm: 5,
      rotation: 90,
      zIndex: 2,
      visible: true,
      text: "کد جایگزین",
      binding: "product.code",
      paddingMm: 0.5,
      showFrame: false,
      barcodeType: "code128",
      humanReadable: false,
      imagePath: null,
      errorCorrection: "M",
      style: {
        fontSizeMm: 2.6,
        fontWeight: "normal",
        align: "right",
        color: "#000000",
        backgroundColor: "#FFFFFF",
        borderWidthMm: 0.2,
        borderRadiusMm: 0,
      },
    },
    {
      id: "qr-1",
      kind: "qr",
      xMm: 26,
      yMm: 3,
      widthMm: 12,
      heightMm: 12,
      rotation: 0,
      zIndex: 3,
      visible: true,
      text: "",
      binding: "product.code",
      paddingMm: 0.5,
      showFrame: false,
      barcodeType: "code128",
      humanReadable: false,
      imagePath: null,
      errorCorrection: "Q",
      style: {
        fontSizeMm: 3.2,
        fontWeight: "normal",
        align: "left",
        color: "#000000",
        backgroundColor: "#FFFFFF",
        borderWidthMm: 0.2,
        borderRadiusMm: 0,
      },
    },
  ],
};

const repositoryOver = (store: InMemoryTemplateStore): PersistenceTemplateGateway =>
  new PersistenceTemplateGateway(new LabelTemplateRepository(store));

describe("label template document persistence", () => {
  it("stores the complete designer document and reconstructs it after a restart", async () => {
    const store = new InMemoryTemplateStore();

    const saved = await repositoryOver(store).saveTemplate(designerDocument);

    // "Restart": a brand new gateway and repository over the same stored rows.
    const restarted = repositoryOver(store);
    const listed = await restarted.listTemplates();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ name: designerDocument.name, widthMm: 40, heightMm: 25 });

    const loaded = await restarted.loadTemplate(saved.id);
    expect(loaded?.version).toBe(LABEL_DOCUMENT_VERSION);
    expect(loaded?.widthMm).toBe(40);
    expect(loaded?.heightMm).toBe(25);
    expect(loaded?.elements).toEqual(designerDocument.elements);
  });

  it("rebuilds the exact canvas model from the persisted document", async () => {
    const store = new InMemoryTemplateStore();
    const saved = await repositoryOver(store).saveTemplate(designerDocument);
    const loaded = await repositoryOver(store).loadTemplate(saved.id);

    const parsed = parseLabelDocument(
      JSON.stringify({
        version: loaded?.version,
        widthMm: loaded?.widthMm,
        heightMm: loaded?.heightMm,
        elements: [...(loaded?.elements ?? [])],
      }),
      { widthMm: 0, heightMm: 0 },
    );

    expect(parsed.issues).toEqual([]);
    const elements = parsed.document!.elements;
    expect(elements).toHaveLength(4);
    expect(elements.map(element => element.id)).toEqual(["frame-1", "text-1", "field-1", "qr-1"]);
    expect(elements[2]).toMatchObject({ kind: "field", binding: "product.code", rotation: 90, xMm: 3, yMm: 10 });
    expect(elements[3]).toMatchObject({ kind: "qr", errorCorrection: "Q", xMm: 26, yMm: 3, widthMm: 12, heightMm: 12 });
    expect(elements[1]!.style).toMatchObject({ fontWeight: "bold", align: "center", borderRadiusMm: 1.5 });
  });

  it("persists an update without inserting a second row", async () => {
    const store = new InMemoryTemplateStore();
    const gateway = repositoryOver(store);
    const saved = await gateway.saveTemplate(designerDocument);

    const moved = {
      ...designerDocument,
      elements: designerDocument.elements.map(element =>
        element.id === "text-1" ? { ...element, xMm: 9, yMm: 12 } : element),
    };
    const updated = await gateway.updateTemplate(saved.id, moved);

    expect(updated).not.toBeNull();
    expect(store.snapshot()).toHaveLength(1);

    const reloaded = await repositoryOver(store).loadTemplate(saved.id);
    const text = reloaded?.elements.find(element => (element as { id?: string }).id === "text-1");
    expect(text).toMatchObject({ xMm: 9, yMm: 12 });
  });

  it("never writes a pixel coordinate into the stored document", async () => {
    const store = new InMemoryTemplateStore();
    await repositoryOver(store).saveTemplate(designerDocument);

    const stored = JSON.stringify(store.snapshot());
    expect(stored).not.toMatch(/\d+px/);
    expect(stored).not.toContain("\"zoom\"");
    expect(stored).not.toContain("\"screenX\"");
  });

  it("leaves a corrupt stored layout untouched instead of overwriting it", async () => {
    const store = new InMemoryTemplateStore([{
      id: "template-broken",
      name: "قالب خراب",
      template_kind: "product",
      width_mm: 50,
      height_mm: 30,
      layout_json: "{ this is not json",
      is_default: 0,
      is_active: 1,
      created_at: "2026-09-13T10:00:00.000Z",
      updated_at: "2026-09-13T10:00:00.000Z",
    }]);

    const gateway = repositoryOver(store);
    const loaded = await gateway.loadTemplate("template-broken");

    // The stored text is preserved byte for byte and the caller gets an empty layout.
    expect(store.snapshot()[0]!.layout_json).toBe("{ this is not json");
    expect(loaded?.elements).toEqual([]);
    expect(parseLabelDocument("{ this is not json", { widthMm: 50, heightMm: 30 }).issues).toHaveLength(1);
  });

  it("does not surface a soft-deleted template in the active list", async () => {
    const store = new InMemoryTemplateStore();
    const gateway = repositoryOver(store);
    const saved = await gateway.saveTemplate(designerDocument);

    expect(await gateway.deleteTemplate(saved.id)).toBe(true);
    expect(await repositoryOver(store).listTemplates()).toEqual([]);
    expect(await repositoryOver(store).loadTemplate(saved.id)).toBeNull();
    expect(store.snapshot()).toHaveLength(1);
  });
});
