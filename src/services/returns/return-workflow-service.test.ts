import { describe, expect, it } from "vitest";
import { ReturnWorkflowService, type ReturnProductLookup, type ReturnRepositoryPort } from "./return-workflow-service";

const timestamp = "2026-09-10T10:24:31.000Z";

function setup() {
  const scans: Array<any> = [];
  let session: any = null;
  const repository: ReturnRepositoryPort = {
    async findLatestSession() { return session; },
    async findActiveSession() { return session; },
    async createSession(input) {
      session = { ...input, status: "open", endedAt: null, createdAt: input.startedAt, updatedAt: input.startedAt };
      return session;
    },
    async resumeSession(id, updatedAt) { session = { ...session, id, status: "open", updatedAt }; },
    async stopSession(id, updatedAt) { session = { ...session, id, status: "stopped", updatedAt }; },
    async completeSession(id, endedAt) { session = { ...session, id, status: "completed", endedAt, updatedAt: endedAt }; },
    async recordResolvedScan(input) {
      const duplicate = input.productId !== null && scans.some(scan => scan.productId === input.productId && scan.scanStatus === "accepted");
      const scanStatus = input.requestedStatus === "accepted" && duplicate ? "duplicate" : input.requestedStatus;
      scans.unshift({ ...input, scanStatus, productName: input.productName, productGroupName: input.productGroupName });
      return scanStatus;
    },
    async listRecentScans() { return scans; },
    async getSessionSummary() {
      const accepted = scans.filter(scan => scan.scanStatus === "accepted");
      return {
        itemCount: accepted.length,
        totalWeightMg: accepted.reduce((sum, scan) => sum + (scan.weightMgSnapshot ?? 0), 0),
        errorCount: scans.filter(scan => scan.scanStatus !== "accepted").length,
        scanCount: scans.length,
      };
    },
  };
  const products: ReturnProductLookup = {
    async findReturnProduct(code) {
      return code === "R-001" ? { id: "product-1", code, name: "انگشتر", groupName: "حلقه", weightMg: 4385 } : null;
    },
  };
  let id = 0;
  const environment = {
    now: () => timestamp,
    newId: () => `id-${++id}`,
  };
  const service = new ReturnWorkflowService(repository, products, environment);
  return { service, repository, products, environment, scans, getSession: () => session };
}

describe("ReturnWorkflowService", () => {
  it("rejects blank scans and scans attempted without an open session", async () => {
    const { service } = setup();
    await expect(service.scan("   ")).rejects.toThrow("Product code is required");
    await expect(service.scan("R-001")).rejects.toThrow("Return session is not open");
  });

  it("creates a session, persists 4.385 g as exactly 4385 mg, and refreshes totals", async () => {
    const { service } = setup();
    await service.startSession();

    const snapshot = await service.scan(" R-001 ");

    expect(snapshot.scans[0]).toMatchObject({ scannedCode: "R-001", scanStatus: "accepted", weightMgSnapshot: 4385 });
    expect(snapshot.summary).toMatchObject({ itemCount: 1, totalWeightMg: 4385, errorCount: 0 });
  });

  it("records duplicate and unknown codes as errors without changing accepted totals", async () => {
    const { service } = setup();
    await service.startSession();
    await service.scan("R-001");
    const duplicate = await service.scan("R-001");
    const rejected = await service.scan("UNKNOWN");

    expect(duplicate.scans[0]?.scanStatus).toBe("duplicate");
    expect(rejected.scans[0]?.scanStatus).toBe("rejected");
    expect(rejected.summary).toMatchObject({ itemCount: 1, totalWeightMg: 4385, errorCount: 2, scanCount: 3 });
  });

  it("reloads persisted scans and totals through a fresh service instance", async () => {
    const { service, repository, products, environment } = setup();
    await service.startSession();
    await service.scan("R-001");

    const reopened = await new ReturnWorkflowService(repository, products, environment).load();

    expect(reopened.session?.status).toBe("open");
    expect(reopened.scans).toHaveLength(1);
    expect(reopened.summary.totalWeightMg).toBe(4385);
  });

  it("serializes rapid scans so the duplicate is persisted instead of colliding transactions", async () => {
    const { service, repository } = setup();
    const record = repository.recordResolvedScan.bind(repository);
    let activeTransactions = 0;
    let maximumConcurrency = 0;
    repository.recordResolvedScan = async input => {
      activeTransactions += 1;
      maximumConcurrency = Math.max(maximumConcurrency, activeTransactions);
      await new Promise(resolve => setTimeout(resolve, 5));
      try { return await record(input); }
      finally { activeTransactions -= 1; }
    };
    await service.startSession();

    const [, second] = await Promise.all([service.scan("R-001"), service.scan("R-001")]);

    expect(maximumConcurrency).toBe(1);
    expect(second.summary).toMatchObject({ itemCount: 1, errorCount: 1, scanCount: 2 });
    expect(second.scans[0]?.scanStatus).toBe("duplicate");
  });

  it("persists stop, resume, and completion state while retaining history", async () => {
    const { service, getSession } = setup();
    await service.startSession();
    await service.scan("R-001");
    await service.stopSession();
    expect(getSession().status).toBe("stopped");
    await service.startSession();
    expect(getSession().status).toBe("open");

    const completed = await service.completeSession();

    expect(completed.session?.status).toBe("completed");
    expect(completed.scans).toHaveLength(1);
    expect(completed.summary.totalWeightMg).toBe(4385);
  });
});
