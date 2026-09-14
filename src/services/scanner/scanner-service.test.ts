import { describe, expect, it, vi } from "vitest";
import { FakeSerialPort, FakeSerialPortProvider } from "../hardware/test-support/fake-serial-port";
import { KeyboardWedgeScanner } from "./keyboard-wedge-scanner";
import { DeviceScannerService } from "./scanner-service";
import { createDefaultScannerFactory, isSerialScannerPort } from "./scanner-gateway";
import { SerialScannerAdapter } from "./serial-scanner";
import type { ScannerSource } from "./scanner-contract";

const stubSource = (overrides: Partial<ScannerSource> = {}): ScannerSource => ({
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  test: vi.fn().mockResolvedValue({ ok: true, message: "ok" }),
  ...overrides,
});

describe("device scanner service", () => {
  it("tracks lifecycle state across start, test and stop", async () => {
    const source = stubSource();
    const service = new DeviceScannerService(source);

    expect(service.state).toBe("idle");

    await service.start(vi.fn());
    expect(service.state).toBe("scanning");
    expect(await service.test()).toEqual({ ok: true, message: "ok" });

    await service.stop();
    expect(service.state).toBe("idle");
  });

  it("reports a failure when the source cannot start", async () => {
    const service = new DeviceScannerService(
      stubSource({ start: vi.fn().mockRejectedValue(new Error("port busy")) }),
    );

    await expect(service.start(vi.fn())).rejects.toThrow("راه‌اندازی اسکنر ناموفق بود (port busy)");
    expect(service.state).toBe("error");
  });

  it("surfaces a failed probe without throwing", async () => {
    const service = new DeviceScannerService(
      stubSource({ test: vi.fn().mockRejectedValue(new Error("no device")) }),
    );

    expect(await service.test()).toEqual({ ok: false, message: "no device" });
    expect(service.state).toBe("error");
  });
});

describe("scanner transport selection", () => {
  it("recognises COM ports as serial scanners", () => {
    expect(isSerialScannerPort("COM3")).toBe(true);
    expect(isSerialScannerPort("com12")).toBe(true);
    expect(isSerialScannerPort("USB HID")).toBe(false);
  });

  it("builds a keyboard-wedge service for USB HID scanners", async () => {
    const target = new EventTarget();
    const factory = createDefaultScannerFactory({ target });

    const service = await factory.forConfig({ port: "USB HID" });
    const onScan = vi.fn();
    await service.start(onScan);

    for (const key of ["R", "-", "0", "0", "1"]) target.dispatchEvent(new KeyboardEvent("keydown", { key }));
    target.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(onScan).toHaveBeenCalledWith(expect.objectContaining({ code: "R-001" }));
    expect(factory.isAvailable({ port: "USB HID" })).toBe(true);
  });

  it("opens a serial scanner for COM ports through the provided provider", async () => {
    const handle = new FakeSerialPort(["R-777\r\n"]);
    const provider = new FakeSerialPortProvider().withHandle(handle);
    const factory = createDefaultScannerFactory({ portProvider: () => provider });

    const service = await factory.forConfig({ port: "COM5", baudRate: 9600 });

    expect(service).toBeInstanceOf(DeviceScannerService);
    expect(provider.opened).toEqual([{ port: "COM5", baud: 9600 }]);
  });
});

describe("serial scanner wiring", () => {
  it("uses the injected scheduler interval for polling", async () => {
    const handle = new FakeSerialPort(["R-123\r\n"]);
    const scheduler = vi.fn(() => () => {});
    const scanner = new SerialScannerAdapter(handle, { scheduler, pollIntervalMs: 200 });
    await scanner.start(vi.fn());

    expect(scheduler).toHaveBeenCalledWith(expect.any(Function), 200);
  });
});