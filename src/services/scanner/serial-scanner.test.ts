import { describe, expect, it, vi } from "vitest";
import { FakeSerialPort } from "../hardware/test-support/fake-serial-port";
import { SerialScannerAdapter } from "./serial-scanner";

const manualScheduler = () => {
  const tasks: Array<() => void> = [];
  const cancelled: number[] = [];
  const schedule = (task: () => void) => {
    tasks.push(task);
    const index = tasks.length - 1;
    return () => {
      cancelled.push(index);
    };
  };
  return { schedule, tasks, cancelled, tick: () => tasks.forEach(task => task()) };
};

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe("serial scanner adapter", () => {
  it("emits one scan per complete frame", async () => {
    const port = new FakeSerialPort(["R-001\r\nB-002\r\n"]);
    const scheduler = manualScheduler();
    const scanner = new SerialScannerAdapter(port, { scheduler: scheduler.schedule, timestamp: () => "t" });
    const onScan = vi.fn();
    await scanner.start(onScan);

    scheduler.tick();
    await flush();

    expect(onScan).toHaveBeenCalledTimes(2);
    expect(onScan).toHaveBeenNthCalledWith(1, { code: "R-001", raw: "R-001", scannedAt: "t" });
    expect(onScan).toHaveBeenNthCalledWith(2, { code: "B-002", raw: "B-002", scannedAt: "t" });
  });

  it("buffers a partial frame until its terminator arrives", async () => {
    const port = new FakeSerialPort(["R-25", "0904\r\n"]);
    const scheduler = manualScheduler();
    const scanner = new SerialScannerAdapter(port, { scheduler: scheduler.schedule });
    const onScan = vi.fn();
    await scanner.start(onScan);

    scheduler.tick();
    await flush();
    expect(onScan).not.toHaveBeenCalled();

    scheduler.tick();
    await flush();
    expect(onScan).toHaveBeenCalledWith(expect.objectContaining({ code: "R-250904" }));
  });

  it("ignores frames shorter than the minimum length", async () => {
    const port = new FakeSerialPort(["A\r\n"]);
    const scheduler = manualScheduler();
    const scanner = new SerialScannerAdapter(port, { scheduler: scheduler.schedule });
    const onScan = vi.fn();
    await scanner.start(onScan);

    scheduler.tick();
    await flush();

    expect(onScan).not.toHaveBeenCalled();
  });

  it("reports the port probe through test()", async () => {
    const port = new FakeSerialPort([]);
    const scanner = new SerialScannerAdapter(port);

    expect(await scanner.test()).toEqual({ ok: true, message: "پورت اسکنر باز شد" });
    expect(port.outbound).toEqual(["\r\n"]);
  });

  it("stops polling and closes the port", async () => {
    const port = new FakeSerialPort(["R-001\r\n"]);
    const scheduler = manualScheduler();
    const scanner = new SerialScannerAdapter(port, { scheduler: scheduler.schedule });
    const onScan = vi.fn();
    await scanner.start(onScan);

    await scanner.stop();

    expect(scheduler.cancelled).toContain(0);
    expect(port.closed).toBe(true);
    expect(scanner.isScanning).toBe(false);

    scheduler.tick();
    await flush();
    expect(onScan).not.toHaveBeenCalled();
  });
});