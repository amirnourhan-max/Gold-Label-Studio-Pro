import type { SettingsGateway, SettingsSnapshot } from "./settings-contract";
import { approvedSettingsSnapshot } from "./settings-contract";

/**
 * Controlled in-memory fallback so the approved Settings page keeps working in
 * browser previews, tests and device-less demos when SQLite is unavailable.
 * Writes survive only for the lifetime of the session.
 */
export class MockSettingsGateway implements SettingsGateway {
  private snapshot: SettingsSnapshot = approvedSettingsSnapshot;

  async loadSettings(): Promise<SettingsSnapshot> {
    return this.snapshot;
  }

  async saveSettings(snapshot: SettingsSnapshot): Promise<void> {
    this.snapshot = snapshot;
  }
}
