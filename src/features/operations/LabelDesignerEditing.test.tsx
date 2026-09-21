import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import designerCss from "./label-designer.css?raw";
import { LabelDesignerPage } from "./LabelDesignerPage";
import type { LabelTemplateGateway, LabelTemplateDocument, SavedLabelTemplateView } from "../../services/label-templates/template-contract";

const template = (name: string, overrides: Partial<SavedLabelTemplateView> = {}): SavedLabelTemplateView => ({
  id: `template-${name}` as SavedLabelTemplateView["id"],
  name,
  templateKind: "product",
  widthMm: 50,
  heightMm: 30,
  isDefault: false,
  ...overrides,
});

/** Stateful gateway stub that behaves like the real one across the whole flow. */
const gatewayStub = (
  initial: ReadonlyArray<Readonly<{ view: SavedLabelTemplateView; document: LabelTemplateDocument | null }>> = [],
) => {
  let templates = initial.map(entry => ({ ...entry }));
  return {
    listTemplates: vi.fn(async () => templates.map(entry => entry.view)),
    loadTemplate: vi.fn(async (id: unknown) => templates.find(entry => String(entry.view.id) === String(id))?.document ?? null),
    saveTemplate: vi.fn(async (document: LabelTemplateDocument) => {
      const view = template(document.name);
      templates = [...templates, { view, document }];
      return view;
    }),
    updateTemplate: vi.fn(async (id: unknown, document: LabelTemplateDocument) => {
      const index = templates.findIndex(entry => String(entry.view.id) === String(id));
      if (index === -1) return null;
      const view = { ...templates[index]!.view, name: document.name, widthMm: document.widthMm, heightMm: document.heightMm };
      templates = templates.map((entry, entryIndex) => (entryIndex === index ? { view, document } : entry));
      return view;
    }),
    deleteTemplate: vi.fn(async (id: unknown) => {
      const before = templates.length;
      templates = templates.filter(entry => String(entry.view.id) !== String(id));
      return templates.length !== before;
    }),
  };
};

const mockGateway = vi.hoisted(() => vi.fn());

vi.mock("../../services/label-templates/template-gateway", async importOriginal => {
  const actual = await importOriginal<typeof import("../../services/label-templates/template-gateway")>();
  return { ...actual, createDefaultTemplateGateway: mockGateway };
});

const surface = () => screen.getByTestId("label-canvas-surface");
const elementStyle = (id: string) => screen.getByTestId(`label-element-${id}`).style;

/** 8 preview pixels per millimetre at 150% zoom: 12 device pixels per millimetre. */
const PX_PER_MM = 12;

const drag = (target: Element, dxPx: number, dyPx: number): void => {
  fireEvent.pointerDown(target, { clientX: 100, clientY: 100 });
  fireEvent.pointerMove(window, { clientX: 100 + dxPx, clientY: 100 + dyPx });
  fireEvent.pointerUp(window, { clientX: 100 + dxPx, clientY: 100 + dyPx });
};

afterEach(cleanup);

beforeEach(() => {
  mockGateway.mockReset();
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(window, "prompt").mockReturnValue("قالب ویرایش‌شده");
});

async function renderDesigner(gateway = gatewayStub()) {
  mockGateway.mockResolvedValue(gateway);
  render(<LabelDesignerPage />);
  await waitFor(() => expect(gateway.listTemplates).toHaveBeenCalled());
  return gateway;
}

const addTool = (name: string) => fireEvent.click(within(screen.getByRole("toolbar", { name: "فهرست ابزارهای طراحی" })).getByRole("button", { name }));

describe("editable label designer canvas", () => {
  it("adds a text element through the toolbox and renders it on the label", async () => {
    await renderDesigner();

    addTool("متن");

    const element = await screen.findByTestId("label-element-text-1");
    expect(element).toHaveAttribute("data-element-kind", "text");
    expect(elementStyle("text-1").left).toBe(`${4 * PX_PER_MM}px`);
    expect(elementStyle("text-1").top).toBe(`${4 * PX_PER_MM}px`);
    expect(elementStyle("text-1").width).toBe(`${24 * PX_PER_MM}px`);
    expect(elementStyle("text-1").height).toBe(`${6 * PX_PER_MM}px`);
    expect(element).toHaveAttribute("data-selected", "true");
  });

  it("adds a dynamic field that shows its resolved sample value", async () => {
    await renderDesigner();

    addTool("متغیر");

    const element = await screen.findByTestId("label-element-field-1");
    expect(element).toHaveAttribute("data-element-kind", "field");
    expect(within(element).getByText("انگشتر طرح گل")).toBeInTheDocument();
  });

  it("adds every element type the printing pipeline supports", async () => {
    await renderDesigner();

    for (const tool of ["متن", "کد QR", "بارکد", "تصویر", "خط", "شکل", "متغیر"]) addTool(tool);

    expect(screen.getByTestId("label-element-qr-1")).toBeInTheDocument();
    expect(screen.getByTestId("label-element-barcode-1")).toBeInTheDocument();
    expect(screen.getByTestId("label-element-line-1")).toBeInTheDocument();
    expect(screen.getByTestId("label-element-frame-1")).toBeInTheDocument();
    expect(screen.getByTestId("label-element-image-1")).toBeInTheDocument();
  });

  it("moves an element by dragging it, snapped to the grid", async () => {
    await renderDesigner();
    addTool("متن");

    drag(await screen.findByTestId("label-element-text-1"), 3 * PX_PER_MM, 2 * PX_PER_MM);

    expect(elementStyle("text-1").left).toBe(`${7 * PX_PER_MM}px`);
    expect(elementStyle("text-1").top).toBe(`${6 * PX_PER_MM}px`);
  });

  it("resizes an element from its corner handle", async () => {
    await renderDesigner();
    addTool("متن");

    drag(await screen.findByTestId("label-resize-text-1-se"), 2 * PX_PER_MM, 1 * PX_PER_MM);

    expect(elementStyle("text-1").width).toBe(`${26 * PX_PER_MM}px`);
    expect(elementStyle("text-1").height).toBe(`${7 * PX_PER_MM}px`);
    expect(elementStyle("text-1").left).toBe(`${4 * PX_PER_MM}px`);
  });

  it("refuses to drag an element outside the label", async () => {
    await renderDesigner();
    addTool("متن");

    drag(await screen.findByTestId("label-element-text-1"), -50 * PX_PER_MM, -50 * PX_PER_MM);

    expect(elementStyle("text-1").left).toBe("0px");
    expect(elementStyle("text-1").top).toBe("0px");
  });

  it("keeps the canvas and the properties panel in sync in both directions", async () => {
    await renderDesigner();
    addTool("متن");
    await screen.findByTestId("label-element-text-1");

    const properties = screen.getByRole("region", { name: "خواص عنصر" });
    fireEvent.change(within(properties).getByLabelText("X"), { target: { value: "18" } });
    expect(elementStyle("text-1").left).toBe(`${18 * PX_PER_MM}px`);

    const wrapper = screen.getByTestId("label-element-text-1");
    drag(wrapper, 2 * PX_PER_MM, 0);
    expect(within(properties).getByLabelText("X")).toHaveValue("20");
  });

  it("edits text, alignment, weight and rotation of the selected element", async () => {
    await renderDesigner();
    addTool("متن");
    const wrapper = await screen.findByTestId("label-element-text-1");

    const properties = screen.getByRole("region", { name: "خواص عنصر" });
    fireEvent.change(within(properties).getByLabelText("متن عنصر"), { target: { value: "کارگاه مرکزی" } });
    expect(within(wrapper).getByText("کارگاه مرکزی")).toBeInTheDocument();

    fireEvent.change(within(properties).getByLabelText("وزن فونت"), { target: { value: "bold" } });
    expect(within(wrapper).getByText("کارگاه مرکزی")).toHaveStyle({ fontWeight: "700" });

    fireEvent.change(within(properties).getByLabelText("تراز متن"), { target: { value: "center" } });
    expect(within(wrapper).getByText("کارگاه مرکزی")).toHaveStyle({ textAlign: "center" });

    fireEvent.change(within(properties).getByLabelText("چرخش"), { target: { value: "90" } });
    expect(wrapper.style.transform).toBe("rotate(90deg)");
  });

  it("deletes and duplicates the selected element from the properties panel", async () => {
    await renderDesigner();
    addTool("متن");
    await screen.findByTestId("label-element-text-1");

    const properties = screen.getByRole("region", { name: "خواص عنصر" });
    fireEvent.click(within(properties).getByRole("button", { name: "تکرار عنصر" }));
    expect(await screen.findByTestId("label-element-text-2")).toBeInTheDocument();

    fireEvent.click(within(properties).getByRole("button", { name: "حذف عنصر" }));
    await waitFor(() => expect(screen.queryByTestId("label-element-text-2")).not.toBeInTheDocument());
    expect(screen.getByTestId("label-element-text-1")).toBeInTheDocument();
  });

  it("reports an empty selection instead of deleting nothing", async () => {
    await renderDesigner();

    const properties = screen.getByRole("region", { name: "خواص عنصر" });
    expect(within(properties).getByLabelText("X")).toBeDisabled();
    expect(within(properties).getByRole("button", { name: "حذف عنصر" })).toBeDisabled();
  });

  it("supports keyboard delete, duplicate, nudge, copy/paste and undo", async () => {
    await renderDesigner();
    addTool("متن");
    await screen.findByTestId("label-element-text-1");
    const canvas = surface();

    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(elementStyle("text-1").left).toBe(`${4.5 * PX_PER_MM}px`);

    fireEvent.keyDown(canvas, { key: "ArrowRight", shiftKey: true });
    expect(elementStyle("text-1").left).toBe(`${6.5 * PX_PER_MM}px`);

    fireEvent.keyDown(canvas, { key: "z", ctrlKey: true });
    expect(elementStyle("text-1").left).toBe(`${4.5 * PX_PER_MM}px`);

    fireEvent.keyDown(canvas, { key: "y", ctrlKey: true });
    expect(elementStyle("text-1").left).toBe(`${6.5 * PX_PER_MM}px`);

    fireEvent.keyDown(canvas, { key: "d", ctrlKey: true });
    expect(await screen.findByTestId("label-element-text-2")).toBeInTheDocument();

    fireEvent.keyDown(canvas, { key: "c", ctrlKey: true });
    fireEvent.keyDown(canvas, { key: "v", ctrlKey: true });
    expect(await screen.findByTestId("label-element-text-3")).toBeInTheDocument();

    fireEvent.keyDown(canvas, { key: "Delete" });
    await waitFor(() => expect(screen.queryByTestId("label-element-text-3")).not.toBeInTheDocument());
  });

  it("does not run canvas shortcuts while the user is typing in a field", async () => {
    await renderDesigner();
    addTool("متن");
    await screen.findByTestId("label-element-text-1");

    const properties = screen.getByRole("region", { name: "خواص عنصر" });
    fireEvent.keyDown(within(properties).getByLabelText("متن عنصر"), { key: "Delete" });

    expect(screen.getByTestId("label-element-text-1")).toBeInTheDocument();
  });

  it("changing zoom never changes the stored millimetre geometry", async () => {
    const gateway = await renderDesigner();
    addTool("متن");
    await screen.findByTestId("label-element-text-1");

    const properties = screen.getByRole("region", { name: "خواص عنصر" });
    fireEvent.change(within(properties).getByLabelText("X"), { target: { value: "12" } });

    const viewSettings = screen.getByRole("region", { name: "تنظیمات نمایش" });
    fireEvent.click(within(viewSettings).getByRole("button", { name: "بزرگ‌نمایی" }));
    fireEvent.click(within(viewSettings).getByRole("button", { name: "بزرگ‌نمایی" }));

    expect(within(viewSettings).getByText("250%")).toBeInTheDocument();
    // The projection grew, the document did not.
    expect(elementStyle("text-1").left).toBe(`${12 * 8 * 2.5}px`);

    fireEvent.click(screen.getByRole("button", { name: "ذخیره" }));
    await waitFor(() => expect(gateway.saveTemplate).toHaveBeenCalledTimes(1));

    const saved = gateway.saveTemplate.mock.calls[0]![0] as LabelTemplateDocument;
    expect(saved).toMatchObject({ name: "قالب ویرایش‌شده", templateKind: "product", widthMm: 50, heightMm: 30 });
    expect(saved.elements[0]).toMatchObject({ id: "text-1", xMm: 12, yMm: 4, widthMm: 24, heightMm: 6 });
  });

  it("saves the complete document and reloads it after the page is recreated", async () => {
    const gateway = await renderDesigner();
    addTool("متن");
    addTool("کد QR");
    await screen.findByTestId("label-element-qr-1");

    const properties = screen.getByRole("region", { name: "خواص عنصر" });
    fireEvent.change(within(properties).getByLabelText("X"), { target: { value: "30" } });
    fireEvent.change(within(properties).getByLabelText("Y"), { target: { value: "10" } });
    fireEvent.change(within(properties).getByLabelText("W"), { target: { value: "14" } });
    fireEvent.change(within(properties).getByLabelText("H"), { target: { value: "14" } });

    fireEvent.click(screen.getByRole("button", { name: "ذخیره" }));
    await waitFor(() => expect(gateway.saveTemplate).toHaveBeenCalledTimes(1));
    const saved = gateway.saveTemplate.mock.calls[0]![0] as LabelTemplateDocument;
    expect(saved.elements).toHaveLength(2);
    expect(saved.elements[1]).toMatchObject({ kind: "qr", xMm: 30, yMm: 10, widthMm: 14, heightMm: 14 });

    cleanup();
    render(<LabelDesignerPage />);

    const restored = await screen.findByTestId("label-element-qr-1");
    await waitFor(() => expect(restored.style.left).toBe(`${30 * PX_PER_MM}px`));
    expect(restored.style.top).toBe(`${10 * PX_PER_MM}px`);
    expect(restored.style.width).toBe(`${14 * PX_PER_MM}px`);
    expect(restored.style.height).toBe(`${14 * PX_PER_MM}px`);
  });

  it("opens the default saved template on start and marks its card active", async () => {
    const stored: LabelTemplateDocument = {
      name: "قالب کارگاه",
      templateKind: "product",
      widthMm: 40,
      heightMm: 25,
      version: 1,
      elements: [{ kind: "text", id: "text-9", text: "کارگاه", xMm: 5, yMm: 6, widthMm: 20, heightMm: 6 }],
    };
    await renderDesigner(gatewayStub([{ view: template("قالب کارگاه", { widthMm: 40, heightMm: 25, isDefault: true }), document: stored }]));

    const restored = await screen.findByTestId("label-element-text-9");
    expect(restored.style.left).toBe(`${5 * PX_PER_MM}px`);

    const templates = screen.getByRole("list", { name: "قالب‌های ذخیره‌شده" });
    await waitFor(() => expect(within(templates).getAllByRole("listitem")[0]).toHaveClass("active"));
    expect(surface()).toHaveStyle({ width: `${40 * PX_PER_MM}px`, height: `${25 * PX_PER_MM}px` });
  });

  it("reports an unsupported template document instead of overwriting it", async () => {
    const future: LabelTemplateDocument = {
      name: "قالب آینده",
      templateKind: "product",
      widthMm: 50,
      heightMm: 30,
      version: 99,
      elements: [{ kind: "text", text: "ناشناخته" }],
    };
    const gateway = await renderDesigner(gatewayStub([{ view: template("قالب آینده"), document: future }]));

    const notice = await screen.findByText(/نسخه جدیدتر/);
    expect(notice).toHaveAttribute("role", "status");
    expect(screen.getByTestId("label-canvas-surface")).toBeInTheDocument();
    expect(gateway.updateTemplate).not.toHaveBeenCalled();
    expect(gateway.saveTemplate).not.toHaveBeenCalled();
  });

  it("dims a hidden element instead of losing it, and hides it in the print preview", async () => {
    await renderDesigner();
    addTool("متن");
    const wrapper = await screen.findByTestId("label-element-text-1");

    const properties = screen.getByRole("region", { name: "خواص عنصر" });
    fireEvent.click(within(properties).getByRole("switch", { name: "نمایش عنصر" }));

    expect(wrapper.style.opacity).toBe("0.35");
    expect(screen.getByTestId("label-element-text-1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "پیش نمایش" }));
    expect(screen.getByTestId("label-element-text-1").style.opacity).toBe("0");
  });

  it("draws a frame around the element when the frame option is enabled", async () => {
    await renderDesigner();
    addTool("متن");
    const wrapper = await screen.findByTestId("label-element-text-1");
    expect(wrapper.style.borderWidth).toBe("0px");

    const properties = screen.getByRole("region", { name: "خواص عنصر" });
    fireEvent.click(within(properties).getByRole("switch", { name: "نمایش چارچوب" }));

    expect(wrapper.style.borderWidth).not.toBe("0px");
  });

  it("sends a test print through the printing workflow", async () => {
    const print = {
      printProductLabel: vi.fn(),
      printPackageLabel: vi.fn(),
      printTemplateLabel: vi.fn(async () => ({ ok: false, message: "چاپگر پیدا نشد" })),
      testPrint: vi.fn(),
    };
    mockGateway.mockResolvedValue(gatewayStub());
    render(<LabelDesignerPage print={print} />);

    fireEvent.click(screen.getByRole("button", { name: "چاپ آزمایشی" }));

    await waitFor(() => expect(print.printTemplateLabel).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("چاپگر پیدا نشد")).toBeInTheDocument();
  });
});

describe("label designer low-resolution accessibility", () => {
  it("keeps the tool list, canvas, properties and templates reachable through scrolling", async () => {
    await renderDesigner();

    expect(screen.getByRole("toolbar", { name: "فهرست ابزارهای طراحی" })).toBeInTheDocument();
    expect(screen.getByTestId("label-canvas-surface")).toBeInTheDocument();

    const propertyScroll = screen.getByRole("region", { name: "تنظیمات خواص" });
    expect(propertyScroll).toHaveAttribute("tabindex", "0");
    expect(within(propertyScroll).getByText("اندازه لیبل")).toBeInTheDocument();
    expect(within(propertyScroll).getByText("ترتیب و نمایش")).toBeInTheDocument();

    expect(designerCss).toContain(".label-canvas-scroll { width: 100%; height: 100%; display: flex; overflow: auto;");
    expect(designerCss).toContain(".label-canvas-plane { position: relative; margin: auto;");
    expect(designerCss).toContain(".label-properties-scroll");
    expect(designerCss).toContain("overflow-y: auto");
    expect(designerCss).toContain(".label-templates > div.list");
    expect(designerCss).toContain("@media (max-height: 820px)");
    expect(designerCss).toContain("@media (max-width: 1250px)");
  });
});
