import { describe, expect, it } from "vitest";
import { SettingsRepository } from "./settings-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";

describe("SettingsRepository", () => {
  it("upserts JSON settings through parameter binding", async () => {
    const client = new RecordingSqlClient();

    await new SettingsRepository(client).upsertAppSetting("ui.locale", { locale: "fa-IR" }, "2026-09-10T00:00:00.000Z");

    expect(client.executeCalls[0]).toMatchObject({
      sql: expect.stringContaining("ON CONFLICT(setting_key) DO UPDATE"),
      bindValues: ["ui.locale", '{"locale":"fa-IR"}', "2026-09-10T00:00:00.000Z", "2026-09-10T00:00:00.000Z"],
    });
  });
});
