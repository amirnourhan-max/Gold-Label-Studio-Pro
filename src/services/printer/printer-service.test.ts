import { describe, expect, it } from "vitest";
import {
  createPrinterService,
  inferPrinterFormat,
  singleLabelModel,
} from "./printer-service";
import { RecordingPrinterTransport, type PrinterTransport } from "./printer-transport";

describe("printer format inference", () => {
  it("defaults Zebra-style printers to ZPL", () => {
    expect(inferPrinterFormat("Zebra ZD220")).toBe("zpl");
    expect(inferPrinterFormat("ZDesigner GK420d")).toBe("zpl");
  });

  it("detects TSC-style printers as TSPL", () => {
    expect(inferPrinterFormat("TSC TE200")).toBe("tspl");
    expect(inferPrinterFormat("Godex G500")).toBe("tspl");
    expect(inferPrinterFormat("Argox OS-214")).toBe("tspl");
  });
});

describe("printer service", () => {
  it("renders the requested device language", () => {
    const service = createPrinterService({ transport: new RecordingPrinterTransport() });
    const model = singleLabelModel({ productName: "انگشتر", productCode: "R-1" });

    expect(service.render(model, "zpl")).toContain("^XA");
    expect(service.render(model, "tspl")).toContain("SIZE 50 mm,30 mm");
  });

  it("sends rendered commands through the injected transport", async () => {
    const transport = new RecordingPrinterTransport();
    const service = createPrinterService({ transport });
    const model = singleLabelModel({ productName: "انگشتر", productCode: "R-250904-00125", copies: 2 });

    await service.printLabel("Zebra ZD220", model, "zpl");

    expect(transport.jobs).toHaveLength(1);
    expect(transport.jobs[0]?.printerName).toBe("Zebra ZD220");
    expect(transport.jobs[0]?.payload).toContain("^PQ2");
    expect(transport.jobs[0]?.payload).toContain("R-250904-00125");
  });

  it("generates a deterministic ZPL test-print command", async () => {
    const transport = new RecordingPrinterTransport();
    await createPrinterService({ transport }).testPrint("Zebra ZD220", "zpl");

    const payload = transport.jobs[0]?.payload ?? "";
    expect(payload).toContain("GOLD LABEL STUDIO PRO");
    expect(payload).toContain("GLSP-TEST");
    expect(payload).toContain("Zebra ZD220");
    expect(payload).toContain("^PQ1");
  });

  it("generates a deterministic TSPL test-print command", async () => {
    const transport = new RecordingPrinterTransport();
    await createPrinterService({ transport }).testPrint("TSC TE200", "tspl");

    const payload = transport.jobs[0]?.payload ?? "";
    expect(payload).toContain("SIZE 50 mm,30 mm");
    expect(payload).toContain("GLSP-TEST");
    expect(payload).toContain("TSC TE200");
    expect(payload).toContain("PRINT 1,1");
  });

  it("surfaces transport failures instead of faking success", async () => {
    const failing: PrinterTransport = {
      print: async () => {
        throw new Error("printer offline");
      },
    };
    const service = createPrinterService({ transport: failing });

    await expect(service.testPrint("Zebra ZD220", "zpl")).rejects.toThrow("printer offline");
  });
});
