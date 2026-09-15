import { formatWeightMg } from "../database/weight";
import { createDefaultTemplateGateway } from "../label-templates/template-gateway";
import type { LabelTemplateGateway } from "../label-templates/template-contract";
import { createDefaultSettingsGateway } from "../settings/settings-gateway";
import type { SettingsGateway } from "../settings/settings-contract";
import {
  createDefaultLabelModel,
  labelPrintModelFromTemplate,
  type LabelPrintElement,
  type LabelPrintModel,
} from "./label-print-model";
import {
  createPrinterService,
  inferPrinterFormat,
  type PrinterFormat,
  type PrinterService,
} from "./printer-service";

/** Honest result of a print attempt: no outcome ever claims a job that failed. */
export type PrintOutcome = Readonly<{
  ok: boolean;
  message: string;
  printerName?: string;
  format?: PrinterFormat;
}>;

export type ProductLabelInput = Readonly<{
  productName: string;
  productCode: string;
  purityPerMille?: number | null;
  weightMg?: number | null;
  copies?: number;
  /** Saved template to print; the default saved template is used when omitted. */
  templateId?: string | null;
}>;

export type PackageLabelInput = Readonly<{
  packageCode: string;
  itemCount: number;
  totalWeightMg: number;
  copies?: number;
}>;

export type TemplateLabelInput = Readonly<{
  templateId?: string | null;
  copies?: number;
  productName?: string;
  productCode?: string;
}>;

/**
 * Application-facing printing boundary. React only calls these methods; the
 * persisted printer settings, the saved label templates, the ZPL/TSPL renderers
 * and the raw Windows transport all stay behind this interface.
 */
export interface LabelPrintWorkflow {
  printProductLabel(input: ProductLabelInput): Promise<PrintOutcome>;
  printPackageLabel(input: PackageLabelInput): Promise<PrintOutcome>;
  printTemplateLabel(input: TemplateLabelInput): Promise<PrintOutcome>;
  testPrint(): Promise<PrintOutcome>;
}

export type LabelPrintWorkflowDependencies = Readonly<{
  settingsGateway?: SettingsGateway;
  templateGateway?: LabelTemplateGateway;
  printerService?: PrinterService;
}>;

const messageFor = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;

const extraLine = (content: string, index: number): LabelPrintElement => ({
  kind: "text",
  xMm: 2,
  yMm: 24 + index * 4,
  content,
  heightMm: 2.4,
  widthMm: 1.8,
});

/** Appends the product details the approved label block shows under the QR code. */
const withDetailLines = (model: LabelPrintModel, lines: readonly string[]): LabelPrintModel =>
  lines.length === 0
    ? model
    : { ...model, elements: [...model.elements, ...lines.map((line, index) => extraLine(line, index))] };

export const createLabelPrintWorkflow = (
  dependencies: LabelPrintWorkflowDependencies = {},
): LabelPrintWorkflow => {
  const printerService = (): PrinterService => dependencies.printerService ?? createPrinterService();
  const settingsGateway = (): SettingsGateway | Promise<SettingsGateway> =>
    dependencies.settingsGateway ?? createDefaultSettingsGateway();
  const templateGateway = (): LabelTemplateGateway | Promise<LabelTemplateGateway> =>
    dependencies.templateGateway ?? createDefaultTemplateGateway();

  /** The configured printer plus the device language that printer speaks. */
  const resolvePrinter = async (): Promise<Readonly<{ name: string; format: PrinterFormat }>> => {
    const settings = await settingsGateway();
    const loaded = await settings.loadSettings();
    const name = loaded.printer.printerName.trim();
    if (name.length === 0) {
      throw new Error("چاپگری در تنظیمات انتخاب نشده است");
    }
    return { name, format: inferPrinterFormat(name) };
  };

  const send = async (model: LabelPrintModel): Promise<PrintOutcome> => {
    try {
      const printer = await resolvePrinter();
      await printerService().printLabel(printer.name, model, printer.format);
      return {
        ok: true,
        message: `دستور چاپ (${printer.format.toUpperCase()}) به «${printer.name}» ارسال شد`,
        printerName: printer.name,
        format: printer.format,
      };
    } catch (error) {
      return { ok: false, message: `ارسال به چاپگر ناموفق بود: ${messageFor(error, "خطای نامشخص چاپ")}` };
    }
  };

  /**
   * Saved-template lookup. A template whose designer document carries no
   * elements (the approved designer starts empty) falls back to the approved
   * default layout, so a print never produces a blank label.
   */
  const resolveTemplateModel = async (input: {
    templateId?: string | null;
    copies?: number;
    productName?: string;
    productCode?: string;
  }): Promise<LabelPrintModel> => {
    try {
      const gateway = await templateGateway();
      const templates = await gateway.listTemplates();
      const chosen = input.templateId
        ? templates.find(template => String(template.id) === String(input.templateId)) ?? null
        : templates.find(template => template.isDefault) ?? templates[0] ?? null;
      if (chosen === null) {
        return createDefaultLabelModel({
          copies: input.copies,
          productName: input.productName,
          productCode: input.productCode,
        });
      }

      const document = await gateway.loadTemplate(chosen.id);
      return labelPrintModelFromTemplate(
        {
          name: chosen.name,
          widthMm: chosen.widthMm,
          heightMm: chosen.heightMm,
          layoutJson: JSON.stringify(document?.elements ?? []),
        },
        { copies: input.copies, productName: input.productName, productCode: input.productCode },
      );
    } catch {
      // A broken template lookup must not block printing: the approved default
      // layout is a safe, complete label.
      return createDefaultLabelModel({
        copies: input.copies,
        productName: input.productName,
        productCode: input.productCode,
      });
    }
  };

  return {
    async printProductLabel(input: ProductLabelInput): Promise<PrintOutcome> {
      const model = await resolveTemplateModel({
        templateId: input.templateId,
        copies: input.copies ?? 1,
        productName: input.productName,
        productCode: input.productCode,
      });

      const details: string[] = [];
      if (typeof input.purityPerMille === "number" && Number.isFinite(input.purityPerMille)) {
        details.push(`عیار: ${input.purityPerMille} (${Math.round(input.purityPerMille / 10)})`);
      }
      if (typeof input.weightMg === "number" && Number.isInteger(input.weightMg) && input.weightMg >= 0) {
        details.push(`وزن: ${formatWeightMg(input.weightMg)} g`);
      }

      return send(withDetailLines(model, details));
    },

    async printPackageLabel(input: PackageLabelInput): Promise<PrintOutcome> {
      const model = createDefaultLabelModel({
        name: `لیبل بسته ${input.packageCode}`,
        productName: "بسته‌بندی محصولات",
        productCode: input.packageCode,
        copies: input.copies ?? 1,
      });

      return send(
        withDetailLines(model, [
          `تعداد اقلام: ${input.itemCount}`,
          `وزن کل: ${formatWeightMg(input.totalWeightMg)} g`,
        ]),
      );
    },

    async printTemplateLabel(input: TemplateLabelInput): Promise<PrintOutcome> {
      const model = await resolveTemplateModel({
        templateId: input.templateId,
        copies: input.copies ?? 1,
        productName: input.productName,
        productCode: input.productCode,
      });
      return send(model);
    },

    async testPrint(): Promise<PrintOutcome> {
      try {
        const printer = await resolvePrinter();
        await printerService().testPrint(printer.name, printer.format);
        return {
          ok: true,
          message: `چاپ تست (${printer.format.toUpperCase()}) به «${printer.name}» ارسال شد`,
          printerName: printer.name,
          format: printer.format,
        };
      } catch (error) {
        return { ok: false, message: `چاپ تست ناموفق بود: ${messageFor(error, "خطای نامشخص چاپ")}` };
      }
    },
  };
};

export const labelPrintWorkflow: LabelPrintWorkflow = createLabelPrintWorkflow();
