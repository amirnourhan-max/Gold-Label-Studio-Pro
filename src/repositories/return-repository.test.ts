import { describe, expect, it } from "vitest";
import { ReturnRepository } from "./return-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";

describe("ReturnRepository", () => {
  it("persists duplicate scans as history rather than overwriting accepted scans", async () => {
    const client = new RecordingSqlClient();

    await new ReturnRepository(client).recordScan({
      id: "scan-1", returnSessionId: "session-1", productId: "product-1", scannedCode: "R-001",
      scanStatus: "duplicate", weightMgSnapshot: 4385, scannedAt: "2026-09-10T00:00:00.000Z", createdAt: "2026-09-10T00:00:00.000Z",
    });

    expect(client.executeCalls[0]?.sql).toContain("INSERT INTO return_scans");
    expect(client.executeCalls[0]?.bindValues).toContain("duplicate");
  });
});
