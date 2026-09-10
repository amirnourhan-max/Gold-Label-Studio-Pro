import type { ReturnScanRecord, ReturnSessionRecord } from "../types/persistence";
import type { SqlClient } from "../services/database/sql-client";

export type RecordReturnScanInput = Readonly<{
  id: string;
  returnSessionId: string;
  productId: string | null;
  scannedCode: string;
  scanStatus: "accepted" | "duplicate" | "rejected";
  weightMgSnapshot: number | null;
  scannedAt: string;
  createdAt: string;
}>;

export class ReturnRepository {
  constructor(private readonly client: SqlClient) {}

  listSessions(): Promise<readonly ReturnSessionRecord[]> {
    return this.client.select<ReturnSessionRecord>("SELECT * FROM return_sessions ORDER BY started_at DESC");
  }

  listScans(sessionId: string): Promise<readonly ReturnScanRecord[]> {
    return this.client.select<ReturnScanRecord>(
      "SELECT * FROM return_scans WHERE return_session_id = ? ORDER BY scanned_at DESC",
      [sessionId],
    );
  }

  recordScan(input: RecordReturnScanInput): Promise<unknown> {
    return this.client.execute(
      `INSERT INTO return_scans (
        id, return_session_id, product_id, scanned_code, scan_status, weight_mg_snapshot, scanned_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id, input.returnSessionId, input.productId, input.scannedCode, input.scanStatus, input.weightMgSnapshot,
        input.scannedAt, input.createdAt, input.createdAt,
      ],
    );
  }
}
