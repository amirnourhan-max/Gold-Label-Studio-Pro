import { describe, expect, it } from "vitest";
import { approvedSettingsSnapshot, type SettingsGateway } from "../settings/settings-contract";
import type { LabelTemplateDocument, LabelTemplateGateway, SavedLabelTemplateView } from "../label-templates/template-contract";
import type { EntityId } from "../../types/persistence";
import { RecordingPrinterTransport, type PrinterTransport } from "./printer-transport";
import { createPrinterService } from "./printer-service";
import { createLabelPrintWorkflow } from "./print-runtime";

const settingsGateway = (printerName: string): SettingsGateway => ({
  loadSettings: async () => ({
    ...approvedSettingsSnapshot,
    printer: { ...approvedSettingsSnapshot.printer, printerName },
  }),
  saveSettings: async () => undefined,
});

const templateGateway = (
  templates: readonly SavedLabelTemplateView[],
  documents: Readonly<Record<string, LabelTemplateDocument>> = {},
): LabelTemplateGateway => ({
  listTemplates: async () => templates,
  loadTemplate: async id => documents[String(id)] ?? null,
  saveTemplate: async () => {
    throw new Error("not used");
  },
  updateTemplate: async () => null,
  deleteTemplate: async () => false,
});

const emptyGateway = templateGateway([]);

const failingTransport = (message: string): PrinterTransport => ({
  print: async () => {
    throw new Error(message);
  },
});

const workflowWith = (options: {
  printerName?: string;
  transport?: PrinterTransport;
  templates?: LabelTemplateGateway;
}) => {
  const transport = options.transport ?? new RecordingPrinterTransport();
  return {
    transport,
    workflow: createLabelPrintWorkflow({
      settingsGateway: settingsGateway(options.printerName ?? "Zebra ZD421"),
      templateGateway: options.templates ?? emptyGateway,
      printerService: createPrinterService({ transport }),
    }),
  };
};

describe("label print workflow", () => {
  it("renders ZPL for a Zebra printer and reports the job it sent", async () => {
    const { workflow, transport } = workflowWith({ printerName: "Zebra ZD421" });

    const outcome = await workflow.printProductLabel({ productName: "انگشتر", productCode: "R-250904-00125" });

    expect(outcome.ok).toBe(true);
    expect(outcome.format).toBe("zpl");
    expect(outcome.printerName).toBe("Zebra ZD421");
    const jobs = (transport as RecordingPrinterTransport).jobs;
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.printerName).toBe("Zebra ZD421");
    expect(jobs[0]!.payload).toContain("^XA");
    expect(jobs[0]!.payload).toContain("R-250904-00125");
  });

  it("renders TSPL for a TSC printer", async () => {
    const { workflow, transport } = workflowWith({ printerName: "TSC TE200" });

    const outcome = await workflow.printTemplateLabel({ copies: 2 });

    expect(outcome.format).toBe("tspl");
    const payload = (transport as RecordingPrinterTransport).jobs[0]!.payload;
    expect(payload).toContain("SIZE 50 mm,30 mm");
    expect(payload).toContain("PRINT 2,1");
  });

  it("never reports success when the transport refuses the job", async () => {
    const { workflow } = workflowWith({ transport: failingTransport("printer queue unavailable") });

    const outcome = await workflow.printProductLabel({ productName: "انگشتر", productCode: "R-1" });

    expect(outcome.ok).toBe(false);
    expect(outcome.message).toContain("printer queue unavailable");
    expect(outcome.message).not.toContain("ارسال شد");
  });

  it("fails honestly when no printer is configured", async () => {
    const { workflow, transport } = workflowWith({ printerName: "   " });

    const outcome = await workflow.printProductLabel({ productName: "انگشتر", productCode: "R-1" });

    expect(outcome.ok).toBe(false);
    expect(outcome.message).toContain("چاپگری در تنظیمات انتخاب نشده است");
    expect((transport as RecordingPrinterTransport).jobs).toHaveLength(0);
  });

  it("prints the elements of the chosen saved template", async () => {
    const view: SavedLabelTemplateView = {
      id: "template-1" as EntityId,
      name: "قالب کارگاه",
      templateKind: "product",
      widthMm: 40,
      heightMm: 25,
      isDefault: true,
    };
    const gateway = templateGateway([view], {
      "template-1": {
        name: view.name,
        templateKind: view.templateKind,
        widthMm: view.widthMm,
        heightMm: view.heightMm,
        elements: [{ kind: "text", xMm: 3, yMm: 4, content: "کارگاه اصلی", heightMm: 3, widthMm: 2 }],
      },
    });
    const { workflow, transport } = workflowWith({ templates: gateway });

    await workflow.printTemplateLabel({ templateId: "template-1" });

    const payload = (transport as RecordingPrinterTransport).jobs[0]!.payload;
    expect(payload).toContain("کارگاه اصلی");
    expect(payload).toContain("^PW320"); // 40mm at 203dpi
  });

  it("falls back to the approved layout when the saved template has no elements", async () => {
    const view: SavedLabelTemplateView = {
      id: "template-2" as EntityId,
      name: "خالی",
      templateKind: "product",
      widthMm: 50,
      heightMm: 30,
      isDefault: true,
    };
    const gateway = templateGateway([view], {
      "template-2": { name: "خالی", templateKind: "product", widthMm: 50, heightMm: 30, elements: [] },
    });
    const { workflow, transport } = workflowWith({ templates: gateway });

    await workflow.printTemplateLabel({ templateId: "template-2", productCode: "R-250904-00125" });

    const payload = (transport as RecordingPrinterTransport).jobs[0]!.payload;
    expect(payload).toContain("^BQN"); // the approved QR block is never missing
    expect(payload).toContain("R-250904-00125");
  });

  it("sends the package code, item count and total weight on a package label", async () => {
    const { workflow, transport } = workflowWith({});

    const outcome = await workflow.printPackageLabel({
      packageCode: "PK-250604-00125",
      itemCount: 6,
      totalWeightMg: 24_862,
    });

    expect(outcome.ok).toBe(true);
    const payload = (transport as RecordingPrinterTransport).jobs[0]!.payload;
    expect(payload).toContain("PK-250604-00125");
    expect(payload).toContain("تعداد اقلام: 6");
    expect(payload).toContain("وزن کل: 24.862 g");
  });

  it("uses the test label for the settings test action", async () => {
    const { workflow, transport } = workflowWith({ printerName: "Zebra ZD421" });

    const outcome = await workflow.testPrint();

    expect(outcome.ok).toBe(true);
    const payload = (transport as RecordingPrinterTransport).jobs[0]!.payload;
    expect(payload).toContain("GOLD LABEL STUDIO PRO");
    expect(payload).toContain("^PQ1");
  });
});
