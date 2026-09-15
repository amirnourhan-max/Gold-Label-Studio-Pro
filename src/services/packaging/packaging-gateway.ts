import { ProductRepository } from "../../repositories/product-repository";
import { openPersistenceDatabase } from "../database/database-bootstrap";
import { isTauriEnvironment } from "../hardware/hardware-environment";
import type { SqlClient } from "../database/sql-client";
import type { PackagingGateway, PackagingProductLookup } from "./packaging-contract";
import { createMockPackagingGateway } from "./mock-packaging-gateway";
import { createPersistencePackagingGateway } from "./persistence-packaging-gateway";

type RawProductRow = {
  id: string;
  product_code: string;
  name: string;
  purity_per_mille: number;
  weight_mg: number;
};

/**
 * Read-only adapter over the existing ProductRepository. Product persistence is owned by the
 * products feature, so the packaging flow only consumes this narrow lookup boundary.
 */
export const createProductLookup = (client: SqlClient): PackagingProductLookup => {
  const products = new ProductRepository(client);

  return {
    findByCode: async (productCode: string) => {
      const rows = (await products.findActiveByCode(productCode)) as unknown as readonly RawProductRow[];
      const row = rows[0];

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        code: row.product_code,
        name: row.name,
        purityPerMille: row.purity_per_mille,
        weightMg: row.weight_mg,
      };
    },
  };
};

/**
 * Resolves SQLite once, then keeps using it. Only the very first connection attempt falls back
 * to the approved mock data in an environment that has no SQLite at all (browser preview), so
 * neither a runtime write failure nor a desktop database failure is ever hidden behind mock data.
 */
export const createDefaultPackagingGateway = (): PackagingGateway => {
  const fallback = createMockPackagingGateway();
  let primary: PackagingGateway | null = null;
  let fallbackActive = false;

  const resolve = async (): Promise<PackagingGateway> => {
    if (fallbackActive) {
      return fallback;
    }

    if (primary) {
      return primary;
    }

    try {
      const client = await openPersistenceDatabase();

      primary = createPersistencePackagingGateway({ client, productLookup: createProductLookup(client) });

      return primary;
    } catch (error) {
      if (isTauriEnvironment()) throw error;

      fallbackActive = true;

      return fallback;
    }
  };

  const run = async <Result>(invoke: (gateway: PackagingGateway) => Promise<Result>): Promise<Result> =>
    invoke(await resolve());

  return {
    loadSession: () => run((gateway) => gateway.loadSession()),
    createPackage: () => run((gateway) => gateway.createPackage()),
    addItemByCode: (productCode: string) => run((gateway) => gateway.addItemByCode(productCode)),
    removeItem: (itemId: string) => run((gateway) => gateway.removeItem(itemId)),
    removeLastItem: () => run((gateway) => gateway.removeLastItem()),
    completePackage: () => run((gateway) => gateway.completePackage()),
  };
};

export const packagingGateway: PackagingGateway = createDefaultPackagingGateway();
