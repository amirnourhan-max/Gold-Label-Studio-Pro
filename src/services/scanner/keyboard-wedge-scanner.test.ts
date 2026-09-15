import { describe, expect, it, vi } from "vitest";
import { KeyboardWedgeScanner } from "./keyboard-wedge-scanner";

const typeKeys = (target: EventTarget, keys: readonly string[]) => {
  for (const key of keys) {
    target.dispatchEvent(new KeyboardEvent("keydown", { key }));
  }
};

const typeCode = (target: EventTarget, code: string) => typeKeys(target, [...code, "Enter"]);

describe("keyboard wedge scanner", () => {
  it("emits a scan when the terminator key arrives", async () => {
    const target = new EventTarget();
    const scanner = new KeyboardWedgeScanner({ target, timestamp: () => "2026-09-14T09:00:00.000Z" });
    const onScan = vi.fn();
    await scanner.start(onScan);

    typeKeys(target, ["R", "-", "2", "5", "0", "9", "0", "4", "Enter"]);

    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith({
      code: "R-250904",
      raw: "R-250904",
      scannedAt: "2026-09-14T09:00:00.000Z",
    });
    expect(scanner.isListening).toBe(true);
  });

  it("supports Tab as the terminator", async () => {
    const target = new EventTarget();
    const scanner = new KeyboardWedgeScanner({ target, terminator: "Tab" });
    const onScan = vi.fn();
    await scanner.start(onScan);

    typeKeys(target, ["B", "0", "0", "7", "Tab"]);

    expect(onScan).toHaveBeenCalledWith(expect.objectContaining({ code: "B007" }));
  });

  it("ignores codes shorter than the minimum length", async () => {
    const target = new EventTarget();
    const scanner = new KeyboardWedgeScanner({ target });
    const onScan = vi.fn();
    await scanner.start(onScan);

    typeKeys(target, ["A", "B", "Enter"]);

    expect(onScan).not.toHaveBeenCalled();
  });

  it("drops the buffer when keys arrive with a human-typing gap", async () => {
    const target = new EventTarget();
    let clock = 0;
    const scanner = new KeyboardWedgeScanner({ target, maxGapMs: 50, now: () => clock });
    const onScan = vi.fn();
    await scanner.start(onScan);

    typeKeys(target, ["R", "-", "0", "0", "1"]);
    clock += 500; // operator paused → next keystroke starts a new buffer
    typeKeys(target, ["Enter"]);

    expect(onScan).not.toHaveBeenCalled();

    typeKeys(target, ["A", "A", "A", "Enter"]);
    expect(onScan).toHaveBeenCalledWith(expect.objectContaining({ code: "AAA" }));
  });

  it("stops listening after stop", async () => {
    const target = new EventTarget();
    const scanner = new KeyboardWedgeScanner({ target });
    const onScan = vi.fn();
    await scanner.start(onScan);

    await scanner.stop();
    typeKeys(target, ["R", "0", "0", "1", "Enter"]);

    expect(onScan).not.toHaveBeenCalled();
    expect(scanner.isListening).toBe(false);
  });

  it("resolves test() with the code a real scan produced", async () => {
    const target = new EventTarget();
    const scanner = new KeyboardWedgeScanner({ target, testTimeoutMs: 1_000 });

    const testing = scanner.test();
    typeCode(target, "R-250904-00125");

    expect(await testing).toEqual({ ok: true, message: "کد اسکن شد: R-250904-00125" });
    expect(scanner.isListening).toBe(false);
  });

  it("reports honestly when no code arrives before the timeout", async () => {
    const target = new EventTarget();
    const scanner = new KeyboardWedgeScanner({ target, testTimeoutMs: 0 });

    expect(await scanner.test()).toEqual({ ok: false, message: "کدی در مدت 0 ثانیه اسکن نشد" });
    expect(scanner.isListening).toBe(false);
  });

  it("refuses to start a second test while one is waiting", async () => {
    const target = new EventTarget();
    const scanner = new KeyboardWedgeScanner({ target, testTimeoutMs: 1_000 });

    const first = scanner.test();

    expect(await scanner.test()).toEqual({ ok: false, message: "آزمایش اسکنر در حال اجراست" });

    typeCode(target, "B-0007");
    expect(await first).toEqual({ ok: true, message: "کد اسکن شد: B-0007" });
  });
});
