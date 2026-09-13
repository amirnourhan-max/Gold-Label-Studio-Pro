import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LabelDesignerPage } from "./LabelDesignerPage";
import type { LabelTemplateGateway, SavedLabelTemplateView } from "../../services/label-templates/template-contract";

const template = (name: string, overrides: Partial<SavedLabelTemplateView> = {}): SavedLabelTemplateView => ({
  id: `template-${name}` as SavedLabelTemplateView["id"],
  name,
  templateKind: "product",
  widthMm: 50,
  heightMm: 30,
  isDefault: false,
  ...overrides,
});

/** Stateful stub mirroring the real gateway's post-mutation list behavior. */
const gatewayStub = (initial: readonly SavedLabelTemplateView[]) => {
  let templates = [...initial];
  return {
    listTemplates: vi.fn(async () => templates),
    loadTemplate: vi.fn(async () => null),
    saveTemplate: vi.fn(async (document: { name: string }) => {
      const view = template(document.name);
      templates = [...templates, view];
      return view;
    }),
    updateTemplate: vi.fn(async (id: string, document: { name: string }) => {
      const index = templates.findIndex(item => item.id === id);
      if (index === -1) return null;
      templates = templates.map((item, itemIndex) =>
        itemIndex === index ? { ...item, name: document.name } : item,
      );
      return templates[index];
    }),
    deleteTemplate: vi.fn(async (id: string) => {
      const before = templates.length;
      templates = templates.filter(item => item.id !== id);
      return templates.length !== before;
    }),
  };
};

const mockGateway = vi.hoisted(() => vi.fn());

vi.mock("../../services/label-templates/template-gateway", async importOriginal => {
  const actual = await importOriginal<typeof import("../../services/label-templates/template-gateway")>();
  return { ...actual, createDefaultTemplateGateway: mockGateway };
});

afterEach(cleanup);

beforeEach(() => {
  mockGateway.mockReset();
  vi.spyOn(window, "prompt").mockReset();
  vi.spyOn(window, "alert").mockReset();
  vi.spyOn(window, "confirm").mockReset();
});

describe("Label Designer saved-template lifecycle", () => {
  it("shows an empty message when no templates are persisted", async () => {
    mockGateway.mockResolvedValue(gatewayStub([]));

    render(<LabelDesignerPage />);

    const templates = screen.getByRole("list", { name: "قالب‌های ذخیره‌شده" });
    await waitFor(() => expect(within(templates).getByRole("status")).toHaveTextContent("قالب ذخیره‌شده‌ای وجود نیست"));
  });

  it("loads saved templates from the gateway and marks the first card active", async () => {
    mockGateway.mockResolvedValue(gatewayStub([template("پلاک طلایی"), template("گوشواره")]));

    render(<LabelDesignerPage />);

    const templates = screen.getByRole("list", { name: "قالب‌های ذخیره‌شده" });
    await waitFor(() =>
      expect(within(templates).getAllByRole("img").map(image => image.getAttribute("alt"))).toEqual([
        "قالب پلاک طلایی", "قالب گوشواره",
      ]),
    );
    expect(within(templates).getAllByRole("listitem")[0]).toHaveClass("active");
  });

  it("saves a named template and refreshes the list from the gateway", async () => {
    const gateway = gatewayStub([]);
    mockGateway.mockResolvedValue(gateway);
    vi.spyOn(window, "prompt").mockReturnValue("دستبند چرم");

    render(<LabelDesignerPage />);
    await waitFor(() => expect(gateway.listTemplates).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "ذخیره" }));
    await waitFor(() => expect(gateway.saveTemplate).toHaveBeenCalledTimes(1));

    expect(gateway.saveTemplate.mock.calls[0]?.[0]).toMatchObject({
      name: "دستبند چرم",
      templateKind: "product",
      widthMm: 50,
      heightMm: 30,
    });
    await waitFor(() => expect(gateway.listTemplates).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(within(screen.getByRole("list", { name: "قالب‌های ذخیره‌شده" })).getAllByRole("listitem")).toHaveLength(1),
    );
  });

  it("rejects a blank template name without touching persistence", async () => {
    const gateway = gatewayStub([]);
    mockGateway.mockResolvedValue(gateway);
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(window, "prompt").mockReturnValue("   ");

    render(<LabelDesignerPage />);
    await waitFor(() => expect(gateway.listTemplates).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "ذخیره" }));

    await waitFor(() => expect(alert).toHaveBeenCalled());
    expect(gateway.saveTemplate).not.toHaveBeenCalled();
    expect(gateway.listTemplates).toHaveBeenCalledTimes(1);
  });

  it("renames a template in manage mode and refreshes the list", async () => {
    const gateway = gatewayStub([template("قالب انگشتر")]);
    mockGateway.mockResolvedValue(gateway);
    vi.spyOn(window, "prompt").mockReturnValue("قالب انگشتر طرح گل");

    render(<LabelDesignerPage />);
    const templates = screen.getByRole("list", { name: "قالب‌های ذخیره‌شده" });
    await waitFor(() => expect(within(templates).getAllByRole("listitem")).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: "مدیریت قالب‌ها" }));
    fireEvent.click(within(templates).getByRole("button", { name: "تغییر نام قالب قالب انگشتر" }));

    await waitFor(() => expect(gateway.updateTemplate).toHaveBeenCalledTimes(1));
    expect(gateway.updateTemplate.mock.calls[0]?.[1]).toMatchObject({ name: "قالب انگشتر طرح گل" });
    await waitFor(() =>
      expect(within(templates).getByText("قالب انگشتر طرح گل")).toBeInTheDocument(),
    );
  });

  it("soft-deletes a confirmed template and it disappears from the list", async () => {
    const gateway = gatewayStub([template("قالب پلاک"), template("قالب سرویس")]);
    mockGateway.mockResolvedValue(gateway);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<LabelDesignerPage />);
    const templates = screen.getByRole("list", { name: "قالب‌های ذخیره‌شده" });
    await waitFor(() => expect(within(templates).getAllByRole("listitem")).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: "مدیریت قالب‌ها" }));
    fireEvent.click(within(templates).getByRole("button", { name: "حذف قالب قالب پلاک" }));

    await waitFor(() => expect(gateway.deleteTemplate).toHaveBeenCalledWith("template-قالب پلاک"));
    await waitFor(() => expect(within(templates).getAllByRole("listitem")).toHaveLength(1));
    expect(within(templates).queryByText("قالب پلاک")).not.toBeInTheDocument();
  });

  it("keeps the template when the delete is cancelled", async () => {
    const gateway = gatewayStub([template("قالب پلاک")]);
    mockGateway.mockResolvedValue(gateway);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<LabelDesignerPage />);
    const templates = screen.getByRole("list", { name: "قالب‌های ذخیره‌شده" });
    await waitFor(() => expect(within(templates).getAllByRole("listitem")).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: "مدیریت قالب‌ها" }));
    fireEvent.click(within(templates).getByRole("button", { name: "حذف قالب قالب پلاک" }));

    await waitFor(() => expect(gateway.deleteTemplate).not.toHaveBeenCalled());
    expect(within(templates).getByText("قالب پلاک")).toBeInTheDocument();
  });

  it("falls back to the currently loaded list when persistence reports the template missing", async () => {
    const gateway = gatewayStub([template("قالب انگشتر")]);
    gateway.updateTemplate.mockResolvedValue(null);
    mockGateway.mockResolvedValue(gateway);
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(window, "prompt").mockReturnValue("نام تازه");

    render(<LabelDesignerPage />);
    const templates = screen.getByRole("list", { name: "قالب‌های ذخیره‌شده" });
    await waitFor(() => expect(within(templates).getAllByRole("listitem")).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: "مدیریت قالب‌ها" }));
    fireEvent.click(within(templates).getByRole("button", { name: "تغییر نام قالب قالب انگشتر" }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith("قالب یافت نشد؛ فهرست تازه‌سازی شد"));
    expect(gateway.listTemplates).toHaveBeenCalledTimes(2);
  });
});
