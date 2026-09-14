import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperationsPreviewPage } from "./OperationsPreviewPage";
import { ReturnsPage } from "./ReturnsPage";
import type { ReturnWorkflowPort } from "../../services/returns/return-workflow-service";

afterEach(cleanup);

describe("approved returns workspace", () => {
  it("matches the approved scanning hierarchy and four live metrics", () => {
    render(<OperationsPreviewPage mode="returns" />);

    const page = screen.getByTestId("returns-page");
    expect(page).toHaveClass("returns-workspace");
    expect(screen.getByRole("heading", { name: "مرجوع کالا", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("اسکن و ثبت مرجوع محصولات به انبار")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "اسکن بارکد مرجوع کالا" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "منتظر اسکن بارکد هستیم..." })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "بارکدخوان مرجع" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("اسکن کنید یا بارکد را وارد نمایید")).toBeInTheDocument();
    const metrics = screen.getByRole("list", { name: "آمار جلسه مرجوع کالا" });
    expect(metrics).toHaveTextContent("۱۲۸");
    expect(metrics).toHaveTextContent("483.725 g");
    expect(metrics).toHaveTextContent("۰۰:۲۴:۱۸");
    expect(within(metrics).getByText("وزن کل مرجوع").closest("article")).toHaveClass("tone-gold");
    expect(screen.getByText("زمان جلسه").closest("article")).toHaveClass("tone-green");
    expect(screen.getByText("زمان جلسه").closest("article")).not.toHaveClass("green");
  });

  it("shows both scan outcomes and the complete eight-row history", () => {
    render(<OperationsPreviewPage mode="returns" />);

    expect(screen.getByRole("alert", { name: "بارکد تکراری" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "اسکن موفق" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "تصویر محصول اسکن‌شده" })).toBeInTheDocument();
    const history = screen.getByRole("table", { name: "آخرین اسکن‌های مرجوع کالا" });
    expect(within(history).getAllByRole("row")).toHaveLength(9);
    expect(within(history).getAllByText("بارکد تکراری")).toHaveLength(2);
    expect(screen.getByText("نمایش")).toBeInTheDocument();
    expect(screen.getByText("۵۰")).toBeInTheDocument();
  });

  it("keeps the scan history in its own keyboard-accessible scroll region", () => {
    render(<OperationsPreviewPage mode="returns" />);

    const historyScroll = screen.getByRole("region", { name: "فهرست آخرین اسکن‌ها" });
    expect(historyScroll).toHaveAttribute("tabindex", "0");
    expect(within(historyScroll).getByRole("table", { name: "آخرین اسکن‌های مرجوع کالا" })).toBeInTheDocument();
  });

  it("keeps scan feedback and history in one ordered flow region", () => {
    render(<OperationsPreviewPage mode="returns" />);

    const results = screen.getByRole("region", { name: "نتایج اسکن مرجوع کالا" });
    const duplicate = within(results).getByRole("alert", { name: "بارکد تکراری" });
    const success = within(results).getByRole("status", { name: "اسکن موفق" });
    const history = within(results).getByRole("table", { name: "آخرین اسکن‌های مرجوع کالا" });

    expect(duplicate.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(success.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the latest product, session summary, and four footer actions visible", () => {
    render(<OperationsPreviewPage mode="returns" />);

    const details = screen.getByRole("complementary", { name: "جزئیات جلسه مرجوع کالا" });
    expect(within(details).getByRole("img", { name: "انگشتر طرح گل" })).toBeInTheDocument();
    expect(within(details).getByRole("heading", { name: "وضعیت اتصال بارکدخوان" })).toBeInTheDocument();
    expect(within(details).getByRole("img", { name: "بارکدخوان متصل" })).toBeInTheDocument();
    expect(within(details).getByRole("button", { name: "تست اتصال" })).toBeInTheDocument();
    expect(within(details).getByText("۹۴.۸۲٪")).toBeInTheDocument();
    const actions = screen.getByRole("toolbar", { name: "عملیات مرجوع کالا" });
    expect(within(actions).getAllByRole("button").map(button => button.textContent?.trim())).toEqual([
      "شروع", "توقف", "بازگشت آخرین", "پایان جلسه",
    ]);
  });

  it("loads persisted state and refreshes recent scans after manual entry", async () => {
    const initial = {
      session: null,
      scans: [],
      summary: { itemCount: 0, totalWeightMg: 0, errorCount: 0, scanCount: 0 },
    } as const;
    const accepted = {
      session: { id: "session-1", status: "open", operatorUserId: null, startedAt: "2026-09-10T10:00:00.000Z", endedAt: null, createdAt: "2026-09-10T10:00:00.000Z", updatedAt: "2026-09-10T10:00:00.000Z" },
      scans: [{ id: "scan-1", returnSessionId: "session-1", productId: "product-1", scannedCode: "R-001", scanStatus: "accepted", weightMgSnapshot: 4385, scannedAt: "2026-09-10T10:24:31.000Z", createdAt: "2026-09-10T10:24:31.000Z", updatedAt: "2026-09-10T10:24:31.000Z", productName: "انگشتر", productGroupName: "حلقه" }],
      summary: { itemCount: 1, totalWeightMg: 4385, errorCount: 0, scanCount: 1 },
    } as const;
    const workflow: ReturnWorkflowPort = {
      load: vi.fn().mockResolvedValue(initial),
      startSession: vi.fn().mockResolvedValue({ ...initial, session: accepted.session }),
      scan: vi.fn().mockResolvedValue(accepted),
      stopSession: vi.fn().mockResolvedValue(accepted),
      completeSession: vi.fn().mockResolvedValue({ ...accepted, session: { ...accepted.session, status: "completed" } }),
    };
    render(<ReturnsPage workflow={workflow} />);
    await waitFor(() => expect(workflow.load).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "شروع" }));
    await waitFor(() => expect(workflow.startSession).toHaveBeenCalled());
    const input = screen.getByRole("textbox", { name: "بارکد محصول" });
    fireEvent.change(input, { target: { value: "R-001" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(workflow.scan).toHaveBeenCalledWith("R-001"));
    expect(screen.getByRole("table", { name: "آخرین اسکن‌های مرجوع کالا" })).toHaveTextContent("R-001");
    expect(screen.getAllByText("4.385 g").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "پایان جلسه" }));
    await waitFor(() => expect(workflow.completeSession).toHaveBeenCalled());
  });

  it("shows loading and persistence errors without changing the approved layout", async () => {
    let rejectLoad!: (reason?: unknown) => void;
    const load = new Promise<never>((_, reject) => { rejectLoad = reject; });
    const workflow = { load: vi.fn(() => load) } as unknown as ReturnWorkflowPort;
    render(<ReturnsPage workflow={workflow} />);
    expect(screen.getByText("در حال بارگذاری اطلاعات جلسه...")).toBeInTheDocument();
    rejectLoad(new Error("database unavailable"));
    expect(await screen.findByText("خطا در بارگذاری اطلاعات جلسه")).toBeInTheDocument();
    expect(screen.getByTestId("returns-page")).toHaveClass("returns-workspace");
  });
});
