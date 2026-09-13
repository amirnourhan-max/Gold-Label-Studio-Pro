import { openPersistenceDatabase } from "../database/database-bootstrap";
import { LabelTemplateRepository } from "../../repositories/label-template-repository";
import { MockTemplateGateway, approvedSavedTemplateViews } from "./mock-template-gateway";
import { PersistenceTemplateGateway } from "./persistence-template-gateway";
import type { LabelTemplateGateway } from "./template-contract";

export { approvedSavedTemplateViews };

/**
 * Single persistence-aware entry point for saved label templates. UI modules
 * call this factory; they never touch SqlClient or the SQL plugin themselves.
 * Falls back to the controlled in-memory gateway when SQLite is unavailable
 * (browser preview, jsdom) so the approved screen keeps rendering.
 */
export const createDefaultTemplateGateway = async (): Promise<LabelTemplateGateway> => {
  try {
    const client = await openPersistenceDatabase();
    return new PersistenceTemplateGateway(new LabelTemplateRepository(client));
  } catch {
    return new MockTemplateGateway();
  }
};
