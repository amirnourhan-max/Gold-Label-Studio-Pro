import { describe, expect, it } from "vitest";
import { LabelTemplateRepository } from "./label-template-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";
import type {
  CreateLabelTemplateInput,
  UpdateLabelTemplateInput,
} from "../types/persistence";

const createInput: CreateLabelTemplateInput = {
  id: "template-1" as CreateLabelTemplateInput["id"],
  name: "قالب انگشتر",
  templateKind: "product",
  widthMm: 50,
  heightMm: 30,
  layoutJson: '{"version":1,"elements":[]}',
  isDefault: false,
  createdAt: "2026-09-13T10:00:00.000Z" as CreateLabelTemplateInput["createdAt"],
};

const updateInput: UpdateLabelTemplateInput = {
  name: "قالب انگشتر ویرایش‌شده",
  templateKind: "product",
  widthMm: 50,
  heightMm: 30,
  layoutJson: '{"version":1,"elements":[{"id":"qr"}]}',
  isDefault: true,
  updatedAt: "2026-09-13T11:00:00.000Z" as UpdateLabelTemplateInput["updatedAt"],
};

const activeRow = {
  id: "template-1",
  name: "قالب انگشتر",
  template_kind: "product",
  width_mm: 50,
  height_mm: 30,
  layout_json: '{"version":1,"elements":[]}',
  is_default: 1,
  is_active: 1,
  created_at: "2026-09-13T10:00:00.000Z",
  updated_at: "2026-09-13T10:00:00.000Z",
};

describe("LabelTemplateRepository", () => {
  it("inserts a template with its layout JSON and active flag bound as parameters", async () => {
    const client = new RecordingSqlClient();

    await new LabelTemplateRepository(client).create(createInput);

    expect(client.executeCalls[0]).toMatchObject({
      sql: expect.stringContaining("INSERT INTO label_templates"),
      bindValues: [
        "template-1",
        "قالب انگشتر",
        "product",
        50,
        30,
        '{"version":1,"elements":[]}',
        0,
        "2026-09-13T10:00:00.000Z",
        "2026-09-13T10:00:00.000Z",
      ],
    });
  });

  it("updates an active template in place without inserting a duplicate row", async () => {
    const client = new RecordingSqlClient();

    await new LabelTemplateRepository(client).update("template-1", updateInput);

    expect(client.executeCalls[0]).toMatchObject({
      sql: expect.stringContaining("UPDATE label_templates"),
      bindValues: [
        "قالب انگشتر ویرایش‌شده",
        "product",
        50,
        30,
        '{"version":1,"elements":[{"id":"qr"}]}',
        1,
        "2026-09-13T11:00:00.000Z",
        "template-1",
      ],
    });
    expect(client.executeCalls[0]?.sql).toContain("is_active = 1");
  });

  it("deactivates a template instead of physically deleting it", async () => {
    const client = new RecordingSqlClient();

    await new LabelTemplateRepository(client).softDelete("template-1", "2026-09-13T12:00:00.000Z");

    expect(client.executeCalls[0]).toMatchObject({
      sql: expect.stringContaining("SET is_active = 0"),
      bindValues: ["2026-09-13T12:00:00.000Z", "template-1"],
    });
  });

  it("maps snake_case rows to camelCase records with boolean flags", async () => {
    const client = new RecordingSqlClient().returns([activeRow]);

    const records = await new LabelTemplateRepository(client).listActive();

    expect(records).toEqual([
      {
        id: "template-1",
        name: "قالب انگشتر",
        templateKind: "product",
        widthMm: 50,
        heightMm: 30,
        layoutJson: '{"version":1,"elements":[]}',
        isDefault: true,
        isActive: true,
        createdAt: "2026-09-13T10:00:00.000Z",
        updatedAt: "2026-09-13T10:00:00.000Z",
      },
    ]);
    expect(client.selectCalls[0]?.sql).toContain("is_active = 1");
    expect(client.selectCalls[0]?.sql).toContain("ORDER BY created_at, name");
  });

  it("filters by template kind and finds a single active template by id", async () => {
    const client = new RecordingSqlClient().returns([activeRow]);
    const repository = new LabelTemplateRepository(client);

    await repository.listActiveByKind("package");
    expect(client.selectCalls[0]).toMatchObject({
      sql: expect.stringContaining("template_kind = ?"),
      bindValues: ["package"],
    });

    await repository.findActiveById("template-1");
    expect(client.selectCalls[1]).toMatchObject({
      sql: expect.stringContaining("id = ?"),
      bindValues: ["template-1"],
    });
  });

  it("returns null when no active template matches the id", async () => {
    const client = new RecordingSqlClient().returns([]);

    const record = await new LabelTemplateRepository(client).findActiveById("missing");

    expect(record).toBeNull();
  });
});
