import { openPersistenceDatabase } from "../database/database-bootstrap";
import { SettingsRepository } from "../../repositories/settings-repository";
import { MockSettingsGateway } from "./mock-settings-gateway";
import { PersistenceSettingsGateway } from "./persistence-settings-gateway";
import type { SettingsGateway } from "./settings-contract";

/**
 * Single persistence-aware entry point for the Settings page. UI modules call
 * this factory; they never touch SqlClient or the SQL plugin themselves.
 * Falls back to the controlled in-memory gateway when SQLite is unavailable
 * (browser preview, jsdom) so the approved screen keeps rendering.
 */
export const createDefaultSettingsGateway = async (): Promise<SettingsGateway> => {
  try {
    const client = await openPersistenceDatabase();
    return new PersistenceSettingsGateway(new SettingsRepository(client));
  } catch {
    return new MockSettingsGateway();
  }
};
