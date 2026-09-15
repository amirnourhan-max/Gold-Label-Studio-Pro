import { describe, expect, it, vi } from "vitest";
import { approvedSettingsSnapshot, type SettingsGateway } from "../settings/settings-contract";
import { createScaleWorkflow } from "./scale-workflow";
import type { ScaleServiceFactory } from "./scale-gateway";
import type { ScaleService, ScaleTestResult } from "./scale-contract";

const settingsGateway = (port = "COM3", baudRate = "9600"): SettingsGateway => ({
  loadSettings: async () => ({
    ...approvedSettingsSnapshot,
    scale: { ...approvedSettingsSnapshot.scale, port, baudRate },
  }),
  saveSettings: async () => undefined,
});

const factoryFor = (result: ScaleTestResult, port = "COM3") => {
  const createService = vi.fn(async (_config: { port: string; baudRate: number }): Promise<ScaleService> => ({
    state: "connected",
    connect: async () => undefined,
    disconnect: async () => undefined,
    probeStableWeight: async () => ({ ok: true, grams: 1, frames: 3 }),
    testConnection: async () => result,
  }));

  return { factory: { createService, createAdapter: vi.fn() } as unknown as ScaleServiceFactory, createService };
};

describe("scale workflow", () => {
  it("returns the settled weight as exact milligrams", async () => {
    const { factory, createService } = factoryFor({ ok: true, grams: 4.385, message: "اتصال ترازو برقرار است" });
    const workflow = createScaleWorkflow({ settingsGateway: settingsGateway(), scaleFactory: factory });

    const outcome = await workflow.readStableWeight();

    expect(outcome).toEqual({ ok: true, grams: 4.385, gramsText: "4.385", milligrams: 4385 });
    expect(createService).toHaveBeenCalledWith({ port: "COM3", baudRate: 9600 });
  });

  it("keeps milligram precision for a three-decimal reading", async () => {
    const { factory } = factoryFor({ ok: true, grams: 8.34, message: "ok" });
    const workflow = createScaleWorkflow({ settingsGateway: settingsGateway(), scaleFactory: factory });

    const outcome = await workflow.readStableWeight();

    expect(outcome.ok && outcome.milligrams).toBe(8340);
    expect(outcome.ok && outcome.gramsText).toBe("8.34");
  });

  it("reports a failed read instead of a weight", async () => {
    const { factory } = factoryFor({ ok: false, message: "وزن ترازو پایدار نشد (زمان انتظار به پایان رسید)" });
    const workflow = createScaleWorkflow({ settingsGateway: settingsGateway(), scaleFactory: factory });

    const outcome = await workflow.readStableWeight();

    expect(outcome).toEqual({ ok: false, message: "وزن ترازو پایدار نشد (زمان انتظار به پایان رسید)" });
  });

  it("refuses to probe without a configured port", async () => {
    const { factory, createService } = factoryFor({ ok: true, grams: 1, message: "ok" }, "  ");
    const workflow = createScaleWorkflow({ settingsGateway: settingsGateway("  "), scaleFactory: factory });

    const outcome = await workflow.readStableWeight();

    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.message).toContain("پورت ترازو");
    expect(createService).not.toHaveBeenCalled();
  });

  it("falls back to 9600 baud when the persisted value is unusable", async () => {
    const { factory, createService } = factoryFor({ ok: true, grams: 2, message: "ok" });
    const workflow = createScaleWorkflow({ settingsGateway: settingsGateway("COM7", "نامعتبر"), scaleFactory: factory });

    await workflow.readStableWeight();

    expect(createService).toHaveBeenCalledWith({ port: "COM7", baudRate: 9600 });
  });
});
