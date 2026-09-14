import { returnScans } from "../../data/mock/operations";
import { ReturnRepository, type ReturnScanDetails } from "../../repositories/return-repository";
import type { ReturnSessionRecord } from "../../types/persistence";
import { openPersistenceDatabase } from "../database/database-bootstrap";
import { weightMgFromGramText } from "../database/weight";
import { ReturnWorkflowService, type ReturnWorkflowPort, type ReturnWorkflowSnapshot } from "./return-workflow-service";
import { SqlReturnProductLookup } from "./sql-return-product-lookup";

const previewStartedAt = "2026-09-10T10:00:13.000Z";
const previewSession = {
  id: "preview-return-session", status: "open", operatorUserId: null, startedAt: previewStartedAt, endedAt: null,
  createdAt: previewStartedAt, updatedAt: "2026-09-10T10:24:31.000Z",
} as ReturnSessionRecord;

const previewScans = returnScans.map((row, index) => ({
  id: `preview-scan-${index + 1}`,
  returnSessionId: previewSession.id,
  productId: `preview-product-${row[2]}`,
  scannedCode: row[2],
  scanStatus: row[6] === "موفق" ? "accepted" : "duplicate",
  weightMgSnapshot: weightMgFromGramText(row[5].replace(" g", "")),
  scannedAt: `2026-09-10T${row[1]}.000Z`,
  createdAt: `2026-09-10T${row[1]}.000Z`,
  updatedAt: `2026-09-10T${row[1]}.000Z`,
  productName: row[3], productGroupName: row[4],
})) as unknown as readonly ReturnScanDetails[];

export const previewReturnWorkflowSnapshot: ReturnWorkflowSnapshot = {
  session: previewSession,
  scans: previewScans,
  summary: { itemCount: 128, totalWeightMg: 483725, errorCount: 7, scanCount: 135 },
};

const previewWorkflow: ReturnWorkflowPort = {
  load: async () => previewReturnWorkflowSnapshot,
  startSession: async () => previewReturnWorkflowSnapshot,
  scan: async () => previewReturnWorkflowSnapshot,
  stopSession: async () => previewReturnWorkflowSnapshot,
  completeSession: async () => previewReturnWorkflowSnapshot,
};

let realWorkflow: Promise<ReturnWorkflowPort> | null = null;

async function resolveWorkflow(): Promise<ReturnWorkflowPort> {
  if (!("__TAURI_INTERNALS__" in globalThis)) return previewWorkflow;
  realWorkflow ??= openPersistenceDatabase().then(client =>
    new ReturnWorkflowService(new ReturnRepository(client), new SqlReturnProductLookup(client)),
  );
  return realWorkflow;
}

export const returnWorkflow: ReturnWorkflowPort = {
  load: async () => (await resolveWorkflow()).load(),
  startSession: async () => (await resolveWorkflow()).startSession(),
  scan: async code => (await resolveWorkflow()).scan(code),
  stopSession: async () => (await resolveWorkflow()).stopSession(),
  completeSession: async () => (await resolveWorkflow()).completeSession(),
};
