import { createDefaultLabelModel, type LabelPrintModel } from "./label-print-model";
import type { PrinterTransport } from "./printer-transport";
import { createDefaultPrinterTransport } from "./printer-transport";
import { renderTspl, renderTsplTestLabel } from "./tspl-renderer";
import { renderZpl, renderZplTestLabel } from "./zpl-renderer";

export type PrinterFormat = "zpl" | "tspl";

export interface PrinterService {
  render(model: LabelPrintModel, format: PrinterFormat): string;
  printLabel(printerName: string, model: LabelPrintModel, format: PrinterFormat): Promise<void>;
  testPrint(printerName: string, format: PrinterFormat): Promise<void>;
}

/**
 * Picks the device language from the configured printer model. Unknown models
 * default to ZPL, which covers the approved Zebra default.
 */
export const inferPrinterFormat = (printerName: string): PrinterFormat => {
  const normalized = printerName.toLowerCase();
  if (/(^|[^a-z])(tsc|tspl|godex|argox|postek|xprinter)/.test(normalized)) return "tspl";
  return "zpl";
};

export const createPrinterService = (options: { transport?: PrinterTransport } = {}): PrinterService => {
  const transport = options.transport ?? createDefaultPrinterTransport();

  return {
    render(model: LabelPrintModel, format: PrinterFormat): string {
      return format === "tspl" ? renderTspl(model) : renderZpl(model);
    },

    async printLabel(printerName: string, model: LabelPrintModel, format: PrinterFormat): Promise<void> {
      await transport.print(printerName, this.render(model, format));
    },

    async testPrint(printerName: string, format: PrinterFormat): Promise<void> {
      const payload = format === "tspl"
        ? renderTsplTestLabel({ printerName })
        : renderZplTestLabel({ printerName });
      await transport.print(printerName, payload);
    },
  };
};

/** Convenience used by the packaging/label flows for a single label job. */
export const singleLabelModel = (options: {
  productName: string;
  productCode: string;
  widthMm?: number;
  heightMm?: number;
  copies?: number;
}): LabelPrintModel =>
  createDefaultLabelModel({
    productName: options.productName,
    productCode: options.productCode,
    widthMm: options.widthMm,
    heightMm: options.heightMm,
    copies: options.copies ?? 1,
  });