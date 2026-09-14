import type {
  CreateReturnSessionInput, RecordResolvedReturnScanInput, ReturnScanDetails, ReturnSessionSummary,
} from "../../repositories/return-repository";
import type { ReturnScanStatus, ReturnSessionRecord } from "../../types/persistence";

export type ReturnProduct = Readonly<{
  id: string;
  code: string;
  name: string;
  groupName: string | null;
  weightMg: number;
}>;

export interface ReturnProductLookup {
  findReturnProduct(code: string): Promise<ReturnProduct | null>;
}

export interface ReturnRepositoryPort {
  findLatestSession(): Promise<ReturnSessionRecord | null>;
  findActiveSession(): Promise<ReturnSessionRecord | null>;
  createSession(input: CreateReturnSessionInput): Promise<ReturnSessionRecord>;
  resumeSession(id: string, updatedAt: string): Promise<void>;
  stopSession(id: string, updatedAt: string): Promise<void>;
  completeSession(id: string, endedAt: string): Promise<void>;
  recordResolvedScan(input: RecordResolvedReturnScanInput): Promise<ReturnScanStatus>;
  listRecentScans(sessionId: string, limit?: number): Promise<readonly ReturnScanDetails[]>;
  getSessionSummary(sessionId: string): Promise<ReturnSessionSummary>;
}

export type ReturnWorkflowSnapshot = Readonly<{
  session: ReturnSessionRecord | null;
  scans: readonly ReturnScanDetails[];
  summary: ReturnSessionSummary;
}>;

export interface ReturnWorkflowPort {
  load(): Promise<ReturnWorkflowSnapshot>;
  startSession(): Promise<ReturnWorkflowSnapshot>;
  scan(code: string): Promise<ReturnWorkflowSnapshot>;
  stopSession(): Promise<ReturnWorkflowSnapshot>;
  completeSession(): Promise<ReturnWorkflowSnapshot>;
}

type WorkflowEnvironment = Readonly<{ now: () => string; newId: () => string }>;
const emptySummary: ReturnSessionSummary = { itemCount: 0, totalWeightMg: 0, errorCount: 0, scanCount: 0 };

export class ReturnWorkflowService implements ReturnWorkflowPort {
  private session: ReturnSessionRecord | null = null;
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly repository: ReturnRepositoryPort,
    private readonly products: ReturnProductLookup,
    private readonly environment: WorkflowEnvironment = {
      now: () => new Date().toISOString(),
      newId: () => crypto.randomUUID(),
    },
  ) {}

  load(): Promise<ReturnWorkflowSnapshot> {
    return this.enqueue(() => this.loadNow());
  }

  startSession(): Promise<ReturnWorkflowSnapshot> {
    return this.enqueue(() => this.startSessionNow());
  }

  scan(rawCode: string): Promise<ReturnWorkflowSnapshot> {
    return this.enqueue(() => this.scanNow(rawCode));
  }

  stopSession(): Promise<ReturnWorkflowSnapshot> {
    return this.enqueue(() => this.stopSessionNow());
  }

  completeSession(): Promise<ReturnWorkflowSnapshot> {
    return this.enqueue(() => this.completeSessionNow());
  }

  private async loadNow(): Promise<ReturnWorkflowSnapshot> {
    this.session = await this.repository.findLatestSession();
    return this.refresh();
  }

  private async startSessionNow(): Promise<ReturnWorkflowSnapshot> {
    const active = await this.repository.findActiveSession();
    const now = this.environment.now();
    if (!active) {
      this.session = await this.repository.createSession({ id: this.environment.newId(), operatorUserId: null, startedAt: now });
    } else {
      this.session = active;
      if (active.status === "stopped") {
        await this.repository.resumeSession(active.id, now);
        this.session = { ...active, status: "open", endedAt: null, updatedAt: now } as ReturnSessionRecord;
      }
    }
    return this.refresh();
  }

  private async scanNow(rawCode: string): Promise<ReturnWorkflowSnapshot> {
    const code = rawCode.trim();
    if (!code) throw new Error("Product code is required");
    if (!this.session || this.session.status !== "open") throw new Error("Return session is not open");

    const product = await this.products.findReturnProduct(code);
    const now = this.environment.now();
    await this.repository.recordResolvedScan({
      id: this.environment.newId(), returnSessionId: this.session.id, productId: product?.id ?? null,
      scannedCode: code, requestedStatus: product ? "accepted" : "rejected",
      weightMgSnapshot: product?.weightMg ?? null, scannedAt: now, createdAt: now,
      productName: product?.name, productGroupName: product?.groupName ?? undefined,
    });
    return this.refresh();
  }

  private async stopSessionNow(): Promise<ReturnWorkflowSnapshot> {
    if (!this.session || this.session.status !== "open") return this.refresh();
    const now = this.environment.now();
    await this.repository.stopSession(this.session.id, now);
    this.session = { ...this.session, status: "stopped", updatedAt: now } as ReturnSessionRecord;
    return this.refresh();
  }

  private async completeSessionNow(): Promise<ReturnWorkflowSnapshot> {
    if (!this.session || this.session.status === "completed") return this.refresh();
    const now = this.environment.now();
    await this.repository.completeSession(this.session.id, now);
    this.session = { ...this.session, status: "completed", endedAt: now, updatedAt: now } as ReturnSessionRecord;
    return this.refresh();
  }

  private async refresh(): Promise<ReturnWorkflowSnapshot> {
    if (!this.session) return { session: null, scans: [], summary: emptySummary };
    const [scans, summary] = await Promise.all([
      this.repository.listRecentScans(this.session.id), this.repository.getSessionSummary(this.session.id),
    ]);
    return { session: this.session, scans: [...scans], summary: { ...summary } };
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation, operation);
    this.operationQueue = result.then(() => undefined, () => undefined);
    return result;
  }
}
