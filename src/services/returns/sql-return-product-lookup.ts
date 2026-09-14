import type { SqlClient } from "../database/sql-client";
import type { ReturnProduct, ReturnProductLookup } from "./return-workflow-service";

export class SqlReturnProductLookup implements ReturnProductLookup {
  constructor(private readonly client: SqlClient) {}

  async findReturnProduct(code: string): Promise<ReturnProduct | null> {
    const rows = await this.client.select<ReturnProduct>(
      `SELECT p.id, p.product_code AS code, p.name, pg.name AS groupName, p.weight_mg AS weightMg
       FROM products p LEFT JOIN product_groups pg ON pg.id = p.product_group_id
       WHERE p.product_code = ? AND p.deleted_at IS NULL LIMIT 1`,
      [code],
    );
    return rows[0] ?? null;
  }
}
