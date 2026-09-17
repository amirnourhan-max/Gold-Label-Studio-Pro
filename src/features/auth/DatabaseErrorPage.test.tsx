import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn(async (..._args: unknown[]) => undefined);
const writeText = vi.fn(async (_value: string) => undefined);

vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invoke(...args) }));
Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

const { DatabaseErrorPage } = await import("./DatabaseErrorPage");

afterEach(() => {
  cleanup();
  invoke.mockClear();
  writeText.mockClear();
});

describe("database error screen", () => {
  it("shows the stable code and exposes recovery actions", async () => {
    const retry = vi.fn();
    render(<DatabaseErrorPage error={{
      code: "DB-SCHEMA",
      friendlyMessage: "پایگاه داده موجود با این نسخه سازگار یا سالم نیست",
      technicalDetails: "users.username is missing",
      logPath: "C:\\AppData\\logs\\diagnostics.jsonl",
    }} onRetry={retry} />);

    expect(screen.getByRole("heading", { name: "خطای پایگاه داده" })).toBeInTheDocument();
    expect(screen.getByTestId("database-error-code")).toHaveTextContent("DB-SCHEMA");
    expect(screen.queryByRole("button", { name: "ایجاد مدیر سیستم و ورود" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "تلاش دوباره" }));
    fireEvent.click(screen.getByRole("button", { name: "کپی جزئیات فنی" }));
    fireEvent.click(screen.getByRole("button", { name: "باز کردن پوشه گزارش‌ها" }));

    expect(retry).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining("DB-SCHEMA")));
    expect(writeText.mock.calls[0]?.[0]).toContain("users.username is missing");
    expect(invoke).toHaveBeenCalledWith("open_diagnostic_logs");
  });
});
