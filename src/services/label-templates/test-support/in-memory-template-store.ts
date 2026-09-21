import type { SqlClient, SqlStatementResult, SqlValue } from "../../database/sql-client";

type Row = Record<string, SqlValue>;

const asNumber = (value: SqlValue): number => (typeof value === "number" ? value : Number(value ?? 0));

/**
 * Minimal in-memory stand-in for the SQLite `label_templates` table. It answers
 * exactly the statements `LabelTemplateRepository` issues and keeps the raw
 * layout JSON, which lets a test close a gateway and reopen it over the same
 * rows to prove a restart round trip.
 */
export class InMemoryTemplateStore implements SqlClient {
  private readonly rows = new Map<string, Row>();

  constructor(seed: readonly Row[] = []) {
    for (const row of seed) this.rows.set(String(row.id), { ...row });
  }

  /** Raw stored rows, so a test can assert nothing was overwritten. */
  snapshot(): readonly Row[] {
    return [...this.rows.values()].map(row => ({ ...row }));
  }

  async select<T>(sql: string, bindValues: readonly SqlValue[] = []): Promise<readonly T[]> {
    if (!sql.includes("FROM label_templates")) return [];

    const byId = /WHERE id = \?/.test(sql);
    const byKind = /template_kind = \?/.test(sql);
    let rows = [...this.rows.values()].filter(row => asNumber(row.is_active) === 1);

    if (byId) rows = rows.filter(row => row.id === bindValues[0]);
    if (byKind) rows = rows.filter(row => row.template_kind === bindValues[0]);

    rows.sort((left, right) =>
      String(left.created_at).localeCompare(String(right.created_at)) || String(left.name).localeCompare(String(right.name)));

    const selected = rows.map(row => ({ ...row }));
    return (byId ? selected.slice(0, 1) : selected) as unknown as readonly T[];
  }

  async execute(sql: string, bindValues: readonly SqlValue[] = []): Promise<SqlStatementResult> {
    if (sql.includes("INSERT INTO label_templates")) {
      const [id, name, templateKind, widthMm, heightMm, layoutJson, isDefault, createdAt] = bindValues;
      this.rows.set(String(id), {
        id: String(id),
        name,
        template_kind: templateKind,
        width_mm: widthMm,
        height_mm: heightMm,
        layout_json: layoutJson,
        is_default: isDefault,
        is_active: 1,
        created_at: createdAt,
        updated_at: createdAt,
      });
      return { rowsAffected: 1 };
    }

    if (sql.includes("is_active = 0")) {
      const [updatedAt, id] = bindValues;
      const existing = this.rows.get(String(id));
      if (!existing || asNumber(existing.is_active) !== 1) return { rowsAffected: 0 };
      this.rows.set(String(id), { ...existing, is_active: 0, updated_at: updatedAt });
      return { rowsAffected: 1 };
    }

    if (sql.includes("UPDATE label_templates")) {
      const [name, templateKind, widthMm, heightMm, layoutJson, isDefault, updatedAt, id] = bindValues;
      const existing = this.rows.get(String(id));
      if (!existing || asNumber(existing.is_active) !== 1) return { rowsAffected: 0 };
      this.rows.set(String(id), {
        ...existing,
        name,
        template_kind: templateKind,
        width_mm: widthMm,
        height_mm: heightMm,
        layout_json: layoutJson,
        is_default: isDefault,
        updated_at: updatedAt,
      });
      return { rowsAffected: 1 };
    }

    return { rowsAffected: 0 };
  }

  async transaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T> {
    return work(this);
  }

  async close(): Promise<void> {}
}
