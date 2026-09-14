import type { SerialPortHandle, SerialPortProvider } from "../serial-port";

export type FakeSerialPortOptions = Readonly<{
  /** Read indexes that throw once, simulating a transient cable outage. */
  failReads?: readonly number[];
  /** Every read from this index onward throws (cable unplugged). */
  persistentFailureFrom?: number;
}>;

/**
 * Deterministic in-memory serial port. Inbound data is scripted per read call;
 * outbound writes are recorded so tests can assert device commands.
 */
export class FakeSerialPort implements SerialPortHandle {
  readonly sessionId = 1;
  readonly outbound: string[] = [];
  closed = false;
  readCount = 0;

  constructor(
    private readonly script: readonly string[] = [],
    private readonly options: FakeSerialPortOptions = {},
  ) {}

  async read(): Promise<string> {
    const index = this.readCount;
    this.readCount += 1;

    const persistent = this.options.persistentFailureFrom;
    if (this.options.failReads?.includes(index) || (persistent !== undefined && index >= persistent)) {
      throw new Error("serial disconnected");
    }

    return this.script[index] ?? "";
  }

  async write(data: string): Promise<void> {
    this.outbound.push(data);
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

export class FakeSerialPortProvider implements SerialPortProvider {
  readonly opened: Array<{ port: string; baud: number }> = [];
  private handle: SerialPortHandle | null = null;

  constructor(private readonly listResult: readonly string[] = ["COM3"]) {}

  withHandle(handle: SerialPortHandle): this {
    this.handle = handle;
    return this;
  }

  async list(): Promise<readonly string[]> {
    return this.listResult;
  }

  async open(port: string, baud: number): Promise<SerialPortHandle> {
    this.opened.push({ port, baud });
    if (this.handle === null) throw new Error("port refused");
    return this.handle;
  }
}