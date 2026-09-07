import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsPage } from "./SettingsPage";

afterEach(cleanup);

describe("settings user-interface preview", () => {
  it("renders the three display-only device configuration cards", () => {
    render(<SettingsPage />);

    for (const title of ["تنظیمات ترازو", "تنظیمات پرینتر", "تنظیمات اسکنر"]) {
      expect(screen.getByRole("region", { name: title })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: "تست اتصال" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "تست چاپ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تست اسکن" })).toBeInTheDocument();
  });

  it("keeps automatic and manual backup controls visible as UI-only previews", () => {
    render(<SettingsPage />);

    const autoBackup = screen.getByRole("region", { name: "بکاپ‌گیری اتوماتیک" });
    expect(within(autoBackup).getByRole("switch", { name: "فعال‌سازی بکاپ خودکار" })).toBeInTheDocument();
    expect(within(autoBackup).getByText("آخرین بکاپ: امروز، ۱۰:۲۴")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "گرفتن بکاپ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "بازیابی بکاپ" })).toBeInTheDocument();
  });

  it("shows the user-management table with visual-only management actions", () => {
    render(<SettingsPage />);

    const users = screen.getByRole("region", { name: "مدیریت کاربران" });
    expect(within(users).getByRole("table", { name: "فهرست کاربران" })).toBeInTheDocument();
    expect(within(users).getByRole("button", { name: "افزودن کاربر" })).toBeInTheDocument();
    expect(within(users).getByRole("button", { name: "تعویض رمز ادمین" })).toBeInTheDocument();
    expect(screen.getByTestId("settings-ui-only-note")).toHaveTextContent("صرفاً نمایشی");
  });
});
