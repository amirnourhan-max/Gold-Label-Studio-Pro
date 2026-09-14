import { describe, expect, it } from "vitest";
import { ReturnRepository } from "./return-repository";
import { RecordingSqlClient } from "./test-support/recording-sql-client";

describe("ReturnRepository", () => {
  it("creates an open return session with normalized timestamps", async () => {
    const client = new RecordingSqlClient();

    await new ReturnRepository(client).createSession({
      id: "session-1", operatorUserId: null, startedAt: "2026-09-10T00:00:00.000Z",
    });

    expect(client.executeCalls[0]?.sql).toContain("INSERT INTO return_sessions");
    expect(client.executeCalls[0]?.bindValues).toEqual([
      "session-1", "open", null, "2026-09-10T00:00:00.000Z", "2026-09-10T00:00:00.000Z", "2026-09-10T00:00:00.000Z",
    ]);
  });

  it("loads the active session and aliases SQLite columns to persistence fields", async () => {
    const client = new RecordingSqlClient().returns([]);

    await new ReturnRepository(client).findActiveSession();

    expect(client.selectCalls[0]?.sql).toContain("started_at AS startedAt");
    expect(client.selectCalls[0]?.sql).toContain("status IN ('open', 'stopped')");
  });

  it("persists duplicate scans as history rather than overwriting accepted scans", async () => {
    const client = new RecordingSqlClient();

    await new ReturnRepository(client).recordScan({
      id: "scan-1", returnSessionId: "session-1", productId: "product-1", scannedCode: "R-001",
      scanStatus: "duplicate", weightMgSnapshot: 4385, scannedAt: "2026-09-10T00:00:00.000Z", createdAt: "2026-09-10T00:00:00.000Z",
    });

    expect(client.executeCalls[0]?.sql).toContain("INSERT INTO return_scans");
    expect(client.executeCalls[0]?.bindValues).toContain("duplicate");
  });

  it("uses one transaction to classify a repeated accepted product as duplicate", async () => {
    const client = new RecordingSqlClient().returns([{ count: 1 }]);

    const status = await new ReturnRepository(client).recordResolvedScan({
      id: "scan-2", returnSessionId: "session-1", productId: "product-1", scannedCode: "R-001",
      requestedStatus: "accepted", weightMgSnapshot: 4385,
      scannedAt: "2026-09-10T00:00:01.000Z", createdAt: "2026-09-10T00:00:01.000Z",
    });

    expect(status).toBe("duplicate");
    expect(client.selectCalls[0]?.bindValues).toEqual(["session-1", "product-1"]);
    expect(client.executeCalls[0]?.bindValues).toContain("duplicate");
  });

  it("loads recent scan rows with their persisted session relationship and product display data", async () => {
    const client = new RecordingSqlClient().returns([]);

    await new ReturnRepository(client).listRecentScans("session-1", 50);

    expect(client.selectCalls[0]?.sql).toContain("rs.return_session_id AS returnSessionId");
    expect(client.selectCalls[0]?.sql).toContain("LEFT JOIN products");
    expect(client.selectCalls[0]?.bindValues).toEqual(["session-1", 50]);
  });

  it("calculates accepted totals separately from duplicate and rejected errors", async () => {
    const client = new RecordingSqlClient().returns([]);

    await new ReturnRepository(client).getSessionSummary("session-1");

    expect(client.selectCalls[0]?.sql).toContain("scan_status = 'accepted'");
    expect(client.selectCalls[0]?.sql).toContain("totalWeightMg");
    expect(client.selectCalls[0]?.sql).toContain("scan_status IN ('duplicate', 'rejected')");
    expect(client.selectCalls[0]?.bindValues).toEqual(["session-1"]);
  });

  it("completes a session without deleting its scans", async () => {
    const client = new RecordingSqlClient();

    await new ReturnRepository(client).completeSession("session-1", "2026-09-10T01:00:00.000Z");

    expect(client.executeCalls[0]?.sql).toContain("status = 'completed'");
    expect(client.executeCalls[0]?.sql).not.toContain("DELETE");
    expect(client.executeCalls[0]?.bindValues).toEqual([
      "2026-09-10T01:00:00.000Z", "2026-09-10T01:00:00.000Z", "session-1",
    ]);
  });
});
