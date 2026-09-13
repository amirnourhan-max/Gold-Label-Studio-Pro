import { describe, expect, it } from "vitest";
import { MockTemplateGateway } from "./mock-template-gateway";
import { PersistenceTemplateGateway } from "./persistence-template-gateway";
import type { LabelTemplateRepository } from "../../repositories/label-template-repository";
import type { LabelTemplateRecord } from "../../types/persistence";
import type { LabelTemplateDocument } from "./template-contract";

const document: LabelTemplateDocument = {
  name: "قالب آزمایشی",
  templateKind: "product",
  widthMm: 50,
  heightMm: 30,
  elements: [{ type: "qr", x: 54.1, y: 12.3, w: 22, h: 22, ecc: "m" }],
};

describe("MockTemplateGateway", () => {
  it("starts with the six approved template cards", async () => {
    const gateway = new MockTemplateGateway();

    const templates = await gateway.listTemplates();

    expect(templates.map(template => template.name)).toEqual([
      "انگشتر", "دستبند", "گردنبند", "سرویس", "پلاک", "گوشواره",
    ]);
    expect(templates[0]?.isDefault).toBe(true);
  });

  it("supports save, update and delete in memory with list refresh", async () => {
    const gateway = new MockTemplateGateway();

    const saved = await gateway.saveTemplate(document);
    expect((await gateway.listTemplates()).map(template => template.name)).toContain("قالب آزمایشی");

    const updated = await gateway.updateTemplate(saved.id, { ...document, name: "قالب ویرایش‌شده" });
    expect(updated?.name).toBe("قالب ویرایش‌شده");
    expect((await gateway.listTemplates()).map(template => template.name)).toContain("قالب ویرایش‌شده");

    expect(await gateway.deleteTemplate(saved.id)).toBe(true);
    expect((await gateway.listTemplates()).map(template => template.name)).not.toContain("قالب ویرایش‌شده");
  });

  it("loads the stored document for a saved template", async () => {
    const gateway = new MockTemplateGateway();

    const saved = await gateway.saveTemplate(document);

    expect(await gateway.loadTemplate(saved.id)).toEqual(document);
    expect(await gateway.loadTemplate("missing")).toBeNull();
  });
});

describe("PersistenceTemplateGateway", () => {
  const record = (overrides: Partial<LabelTemplateRecord> = {}): LabelTemplateRecord => ({
    id: "template-1" as LabelTemplateRecord["id"],
    name: "قالب انگشتر",
    templateKind: "product",
    widthMm: 50,
    heightMm: 30,
    layoutJson: JSON.stringify({ version: 1, widthMm: 50, heightMm: 30, elements: [{ type: "qr" }] }),
    isDefault: true,
    isActive: true,
    createdAt: "2026-09-13T10:00:00.000Z" as LabelTemplateRecord["createdAt"],
    updatedAt: "2026-09-13T10:00:00.000Z" as LabelTemplateRecord["updatedAt"],
    ...overrides,
  });

  const gatewayWith = (overrides: Partial<LabelTemplateRepository> = {}) => {
    const repository = {
      listActive: async () => [record()],
      findActiveById: async () => record(),
      create: async () => undefined,
      update: async () => undefined,
      softDelete: async () => ({ rowsAffected: 1 }),
      ...overrides,
    } as unknown as LabelTemplateRepository;
    return new PersistenceTemplateGateway(repository);
  };

  it("projects records into list views", async () => {
    const templates = await gatewayWith().listTemplates();

    expect(templates).toEqual([
      {
        id: "template-1",
        name: "قالب انگشتر",
        templateKind: "product",
        widthMm: 50,
        heightMm: 30,
        isDefault: true,
      },
    ]);
  });

  it("loads a document by decoding the persisted layout JSON", async () => {
    const loaded = await gatewayWith().loadTemplate("template-1");

    expect(loaded).toEqual({
      name: "قالب انگشتر",
      templateKind: "product",
      widthMm: 50,
      heightMm: 30,
      elements: [{ type: "qr" }],
    });
  });

  it("saves a template through the repository with generated id and UTC timestamp", async () => {
    const createCalls: unknown[] = [];
    const gateway = gatewayWith({
      create: async input => {
        createCalls.push(input);
        return undefined;
      },
    });

    const saved = await gateway.saveTemplate(document);

    expect(createCalls).toHaveLength(1);
    expect(createCalls[0]).toMatchObject({
      name: "قالب آزمایشی",
      templateKind: "product",
      widthMm: 50,
      heightMm: 30,
      layoutJson: expect.stringContaining('"elements":[{"type":"qr"'),
      isDefault: false,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    });
    expect(saved.name).toBe("قالب آزمایشی");
    expect(saved.isDefault).toBe(false);
  });

  it("keeps the existing default flag and confirms updates of active templates", async () => {
    const updateCalls: unknown[] = [];
    const gateway = gatewayWith({
      update: async (_id, input) => {
        updateCalls.push(input);
        return undefined;
      },
    });

    const updated = await gateway.updateTemplate("template-1", { ...document, name: "ویرایش" });

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({ name: "ویرایش", isDefault: true });
    expect(updated?.name).toBe("ویرایش");
  });

  it("reports a missing template instead of updating it", async () => {
    const gateway = gatewayWith({ findActiveById: async () => null });

    expect(await gateway.updateTemplate("missing", document)).toBeNull();
  });

  it("maps rowsAffected to a boolean delete confirmation", async () => {
    const gateway = gatewayWith();

    expect(await gateway.deleteTemplate("template-1")).toBe(true);

    const unchanged = gatewayWith({ softDelete: async () => ({ rowsAffected: 0 }) });
    expect(await unchanged.deleteTemplate("missing")).toBe(false);
  });
});
