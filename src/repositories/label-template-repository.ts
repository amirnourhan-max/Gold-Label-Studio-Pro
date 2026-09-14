import type {
  CreateLabelTemplateInput,
  EntityId,
  LabelTemplateRecord,
  UpdateLabelTemplateInput,
  UtcIsoString,
} from "../types/persistence";
import type { SqlClient } from "../services/database/sql-client";

type LabelTemplateRow = Readonly<{
  id: string;
  name: string;
  template_kind: string;
  width_mm: number;
  height_mm: number;
  layout_json: string;
  is_default: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}>;

const mapRow = (row: LabelTemplateRow): LabelTemplateRecord => ({
  id: row.id as EntityId,
  name: row.name,
  templateKind: row.template_kind,
  widthMm: row.width_mm,
  heightMm: row.height_mm,
  layoutJson: row.layout_json,
  isDefault: row.is_default === 1,
  isActive: row.is_active === 1,
  createdAt: row.created_at as UtcIsoString,
  updatedAt: row.updated_at as UtcIsoString,
});

export class LabelTemplateRepository {
  constructor(private readonly client: SqlClient) {}

  async listActive(): Promise<readonly LabelTemplateRecord[]> {
    const rows = await this.client.select<LabelTemplateRow>(
      "SELECT * FROM label_templates WHERE is_active = 1 ORDER BY created_at, name",
    );
    return rows.map(mapRow);
  }

  async listActiveByKind(templateKind: string): Promise<readonly LabelTemplateRecord[]> {
    const rows = await this.client.select<LabelTemplateRow>(
      "SELECT * FROM label_templates WHERE is_active = 1 AND template_kind = ? ORDER BY created_at, name",
      [templateKind],
    );
    return rows.map(mapRow);
  }

  async findActiveById(id: string): Promise<LabelTemplateRecord | null> {
    const rows = await this.client.select<LabelTemplateRow>(
      "SELECT * FROM label_templates WHERE id = ? AND is_active = 1 LIMIT 1",
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  create(input: CreateLabelTemplateInput): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO label_templates (id, name, template_kind, width_mm, height_mm, layout_json, is_default, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        input.id,
        input.name,
        input.templateKind,
        input.widthMm,
        input.heightMm,
        input.layoutJson,
        input.isDefault ? 1 : 0,
        input.createdAt,
        input.createdAt,
      ],
    );
  }

  update(id: string, input: UpdateLabelTemplateInput): Promise<unknown> {
    return this.client.execute(
      `UPDATE label_templates
       SET name = ?, template_kind = ?, width_mm = ?, height_mm = ?, layout_json = ?, is_default = ?, updated_at = ?
       WHERE id = ? AND is_active = 1`,
      [
        input.name,
        input.templateKind,
        input.widthMm,
        input.heightMm,
        input.layoutJson,
        input.isDefault ? 1 : 0,
        input.updatedAt,
        id,
      ],
    );
  }

  softDelete(id: string, deletedAt: UtcIsoString | string): Promise<unknown> {
    // The approved schema has no deleted_at column on label_templates; deletion
    // of a template is therefore deactivation (is_active = 0).
    return this.client.execute(
      "UPDATE label_templates SET is_active = 0, updated_at = ? WHERE id = ? AND is_active = 1",
      [deletedAt, id],
    );
  }
}
