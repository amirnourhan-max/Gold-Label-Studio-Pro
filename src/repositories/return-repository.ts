import type {
  ReturnScanRecord, ReturnScanStatus, ReturnSessionRecord, ReturnSessionStatus,
} from "../types/persistence";
import type { SqlClient } from "../services/database/sql-client";

export type CreateReturnSessionInput = Readonly<{
  id: string;
  operatorUserId: string | null;
  startedAt: string;
}>;

export type RecordReturnScanInput = Readonly<{
  id: string;
  returnSessionId: string;
  productId: string | null;
  scannedCode: string;
  scanStatus: ReturnScanStatus;
  weightMgSnapshot: number | null;
  scannedAt: string;
  createdAt: string;
}>;

export type RecordResolvedReturnScanInput = Omit<RecordReturnScanInput, "scanStatus"> & Readonly<{
  requestedStatus: "accepted" | "rejected";
  productName?: string;
  productGroupName?: string;
}>;

export type ReturnScanDetails = ReturnScanRecord & Readonly<{
  productName: string | null;
  productGroupName: string | null;
}>;

export type ReturnSessionSummary = Readonly<{
  itemCount: number;
  totalWeightMg: number;
  errorCount: number;
  scanCount: number;
}>;

const sessionColumns = `
  id, status, operator_user_id AS operatorUserId, started_at AS startedAt, ended_at AS endedAt,
  created_at AS createdAt, updated_at AS updatedAt`;

export class ReturnRepository {
  constructor(private readonly client: SqlClient) {}

  listSessions(): Promise<readonly ReturnSessionRecord[]> {
    return this.client.select<ReturnSessionRecord>(
      `SELECT ${sessionColumns} FROM return_sessions ORDER BY started_at DESC`,
    );
  }

  async findLatestSession(): Promise<ReturnSessionRecord | null> {
    const rows = await this.client.select<ReturnSessionRecord>(
      `SELECT ${sessionColumns} FROM return_sessions ORDER BY started_at DESC LIMIT 1`,
    );
    return rows[0] ?? null;
  }

  async findActiveSession(): Promise<ReturnSessionRecord | null> {
    const rows = await this.client.select<ReturnSessionRecord>(
      `SELECT ${sessionColumns} FROM return_sessions
       WHERE status IN ('open', 'stopped') ORDER BY started_at DESC LIMIT 1`,
    );
    return rows[0] ?? null;
  }

  async createSession(input: CreateReturnSessionInput): Promise<ReturnSessionRecord> {
    await this.client.execute(
      `INSERT INTO return_sessions (id, status, operator_user_id, started_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.id, "open", input.operatorUserId, input.startedAt, input.startedAt, input.startedAt],
    );
    return {
      id: input.id, status: "open", operatorUserId: input.operatorUserId, startedAt: input.startedAt,
      endedAt: null, createdAt: input.startedAt, updatedAt: input.startedAt,
    } as ReturnSessionRecord;
  }

  async resumeSession(id: string, updatedAt: string): Promise<void> {
    await this.updateSessionStatus(id, "open", updatedAt);
  }

  async stopSession(id: string, updatedAt: string): Promise<void> {
    await this.updateSessionStatus(id, "stopped", updatedAt);
  }

  async completeSession(id: string, endedAt: string): Promise<void> {
    await this.client.execute(
      `UPDATE return_sessions SET status = 'completed', ended_at = ?, updated_at = ?
       WHERE id = ? AND status IN ('open', 'stopped')`,
      [endedAt, endedAt, id],
    );
  }

  listScans(sessionId: string): Promise<readonly ReturnScanRecord[]> {
    return this.client.select<ReturnScanRecord>(
      `SELECT id, return_session_id AS returnSessionId, product_id AS productId, scanned_code AS scannedCode,
        scan_status AS scanStatus, weight_mg_snapshot AS weightMgSnapshot, scanned_at AS scannedAt,
        created_at AS createdAt, updated_at AS updatedAt
       FROM return_scans WHERE return_session_id = ? ORDER BY scanned_at DESC`,
      [sessionId],
    );
  }

  listRecentScans(sessionId: string, limit = 50): Promise<readonly ReturnScanDetails[]> {
    return this.client.select<ReturnScanDetails>(
      `SELECT rs.id, rs.return_session_id AS returnSessionId, rs.product_id AS productId,
        rs.scanned_code AS scannedCode, rs.scan_status AS scanStatus,
        rs.weight_mg_snapshot AS weightMgSnapshot, rs.scanned_at AS scannedAt,
        rs.created_at AS createdAt, rs.updated_at AS updatedAt,
        p.name AS productName, pg.name AS productGroupName
       FROM return_scans rs
       LEFT JOIN products p ON p.id = rs.product_id
       LEFT JOIN product_groups pg ON pg.id = p.product_group_id
       WHERE rs.return_session_id = ? ORDER BY rs.scanned_at DESC LIMIT ?`,
      [sessionId, limit],
    );
  }

  async getSessionSummary(sessionId: string): Promise<ReturnSessionSummary> {
    const rows = await this.client.select<ReturnSessionSummary>(
      `SELECT
        COALESCE(SUM(CASE WHEN scan_status = 'accepted' THEN 1 ELSE 0 END), 0) AS itemCount,
        COALESCE(SUM(CASE WHEN scan_status = 'accepted' THEN weight_mg_snapshot ELSE 0 END), 0) AS totalWeightMg,
        COALESCE(SUM(CASE WHEN scan_status IN ('duplicate', 'rejected') THEN 1 ELSE 0 END), 0) AS errorCount,
        COUNT(*) AS scanCount
       FROM return_scans WHERE return_session_id = ?`,
      [sessionId],
    );
    return rows[0] ?? { itemCount: 0, totalWeightMg: 0, errorCount: 0, scanCount: 0 };
  }

  recordScan(input: RecordReturnScanInput): Promise<unknown> {
    return this.insertScan(this.client, input);
  }

  recordResolvedScan(input: RecordResolvedReturnScanInput): Promise<ReturnScanStatus> {
    return this.client.transaction(async client => {
      let status: ReturnScanStatus = input.requestedStatus;
      if (status === "accepted" && input.productId) {
        const existing = await client.select<{ count: number }>(
          `SELECT COUNT(*) AS count FROM return_scans
           WHERE return_session_id = ? AND product_id = ? AND scan_status = 'accepted'`,
          [input.returnSessionId, input.productId],
        );
        if ((existing[0]?.count ?? 0) > 0) status = "duplicate";
      }
      await this.insertScan(client, { ...input, scanStatus: status });
      return status;
    });
  }

  private insertScan(client: SqlClient, input: RecordReturnScanInput): Promise<unknown> {
    return client.execute(
      `INSERT INTO return_scans (
        id, return_session_id, product_id, scanned_code, scan_status, weight_mg_snapshot, scanned_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id, input.returnSessionId, input.productId, input.scannedCode, input.scanStatus, input.weightMgSnapshot,
        input.scannedAt, input.createdAt, input.createdAt,
      ],
    );
  }

  private async updateSessionStatus(id: string, status: ReturnSessionStatus, updatedAt: string): Promise<void> {
    await this.client.execute(
      "UPDATE return_sessions SET status = ?, ended_at = NULL, updated_at = ? WHERE id = ? AND status IN ('open', 'stopped')",
      [status, updatedAt, id],
    );
  }
}
