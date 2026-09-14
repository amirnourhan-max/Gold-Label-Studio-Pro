import { describe, expect, it, vi } from "vitest";
import { AandScaleAdapter } from "./aand-scale-adapter";
import type { ScaleAdapter, ScaleServiceConfig } from "./scale-contract";
import { SerialScaleService } from "./scale-service";
import { FakeSerialPort, type FakeSerialPortOptions } from "../hardware/test-support/fake-serial-port";

const makeConfig = (overrides: Partial<ScaleServiceConfig> = {}): ScaleServiceConfig => {
  let clock = 0;
  const config: ScaleServiceConfig = {
    settleReadings: 3,
    readTimeoutMs: 10_000,
    reconnectAttempts: 1,
    reconnectDelayMs: 0,
    pollIntervalMs: 50,
    now: () => clock,
    wait: vi.fn((_ms: number) => {
      clock += 100;
      return Promise.resolve();
    }),
    ...overrides,
  };
  return config;
};

const adapterFor = (
  script: readonly string[],
  options: FakeSerialPortOptions = {},
): { adapter: ScaleAdapter; port: FakeSerialPort } => {
  const port = new FakeSerialPort(script, options);
  return { adapter: new AandScaleAdapter(port), port };
};

describe("serial scale service", () => {
  it("reports a stable weight after three equal frames", async () => {
    const { adapter } = adapterFor(Array(3).fill("ST,GS,+0004.385 g\r\n"));
    const service = new SerialScaleService(adapter, makeConfig());
    await service.connect();

    const result = await service.probeStableWeight();

    expect(result).toEqual({ ok: true, grams: 4.385, frames: 3 });
  });

  it("resets stability when a different frame arrives", async () => {
    const { adapter } = adapterFor([
      "ST,GS,+0004.385 g\r\n",
      "ST,GS,+0004.385 g\r\n",
      "US,GS,+0004.390 g\r\n",
      "ST,GS,+0004.385 g\r\n",
      "ST,GS,+0004.385 g\r\n",
      "ST,GS,+0004.385 g\r\n",
    ]);
    const service = new SerialScaleService(adapter, makeConfig());
    await service.connect();

    const result = await service.probeStableWeight();

    expect(result).toMatchObject({ ok: true, grams: 4.385, frames: 6 });
  });

  it("treats malformed and overload frames as device frames that never settle", async () => {
    const config = makeConfig({ readTimeoutMs: 500 });
    const { adapter } = adapterFor(["OL\r\n", "??##\r\n", "OL\r\n"]);
    const service = new SerialScaleService(adapter, config);
    await service.connect();

    const result = await service.probeStableWeight();

    expect(result).toMatchObject({ ok: false, reason: "timeout" });
  });

  it("times out when no stable reading arrives", async () => {
    const config = makeConfig({ readTimeoutMs: 500 });
    const { adapter } = adapterFor(["US,GS,+0001.000 g\r\n"]);
    const service = new SerialScaleService(adapter, config);
    await service.connect();

    const result = await service.probeStableWeight();

    expect(result).toMatchObject({ ok: false, reason: "timeout" });
  });

  it("reconnects once after a dropped connection and still settles", async () => {
    const { adapter, port } = adapterFor(Array(4).fill("ST,GS,+0008.340 g\r\n"), { failReads: [1] });
    const connect = vi.spyOn(adapter, "connect");
    const service = new SerialScaleService(adapter, makeConfig());
    await service.connect();

    const result = await service.probeStableWeight();

    expect(result).toMatchObject({ ok: true, grams: 8.34 });
    expect(connect).toHaveBeenCalledTimes(2); // initial + after disconnect
    expect(port.closed).toBe(false);
  });

  it("reports a disconnect when reconnects are exhausted", async () => {
    const config = makeConfig({ reconnectAttempts: 1 });
    const { adapter } = adapterFor([], { persistentFailureFrom: 0 });
    const service = new SerialScaleService(adapter, config);
    await service.connect();

    const result = await service.probeStableWeight();

    expect(result).toMatchObject({ ok: false, reason: "disconnected" });
    expect(service.state).toBe("error");
  });

  it("disconnects cleanly and reports the state", async () => {
    const { adapter } = adapterFor([]);
    const service = new SerialScaleService(adapter, makeConfig());
    await service.connect();
    expect(service.state).toBe("connected");

    await service.disconnect();

    expect(service.state).toBe("disconnected");
  });

  it("fails connect with a truthful message when the port is refused", async () => {
    const service = new SerialScaleService(new RefusingAdapter("port COM9 not found"), makeConfig());

    const result = await service.testConnection();

    expect(result).toEqual({ ok: false, message: "اتصال به ترازو برقرار نشد (port COM9 not found)" });
    expect(service.state).toBe("error");
  });

  it("testConnection returns the settled weight and disconnects afterwards", async () => {
    const { adapter } = adapterFor(Array(3).fill("ST,GS,+0004.385 g\r\n"));
    const service = new SerialScaleService(adapter, makeConfig());

    const result = await service.testConnection();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.grams).toBe(4.385);
    expect(service.state).toBe("disconnected");
  });
});

class RefusingAdapter implements ScaleAdapter {
  constructor(private readonly message: string) {}

  async connect(): Promise<void> {
    throw new Error(this.message);
  }

  async disconnect(): Promise<void> {}

  async readout() {
    return null;
  }
}