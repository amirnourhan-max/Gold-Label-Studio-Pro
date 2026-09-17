import { invoke } from "@tauri-apps/api/core";
import { AlertTriangle, Clipboard, FolderOpen, LogOut, RefreshCw } from "lucide-react";
import { runWindowAction } from "../../services/window/window-actions";
import type { DatabaseErrorState } from "./auth-session";
import { AuthWindowChrome } from "./AuthWindowChrome";

type Props = Readonly<{
  error: DatabaseErrorState;
  onRetry(): void;
}>;

export function DatabaseErrorPage({ error, onRetry }: Props) {
  const details = [
    `Code: ${error.code}`,
    `Message: ${error.friendlyMessage}`,
    `Details: ${error.technicalDetails}`,
    error.logPath ? `Log: ${error.logPath}` : null,
  ].filter(Boolean).join("\n");

  return (
    <div className="login-screen auth-screen" data-testid="database-error-page">
      <AuthWindowChrome />
      <main className="database-error-card" dir="rtl">
        <div className="database-error-icon"><AlertTriangle size={30} /></div>
        <h1>خطای پایگاه داده</h1>
        <p>{error.friendlyMessage}</p>
        <code data-testid="database-error-code">{error.code}</code>
        <div className="database-error-actions">
          <button type="button" className="login-submit" onClick={onRetry}><RefreshCw size={16} />تلاش دوباره</button>
          <button type="button" onClick={() => void navigator.clipboard.writeText(details)}><Clipboard size={16} />کپی جزئیات فنی</button>
          <button type="button" onClick={() => void invoke("open_diagnostic_logs")}><FolderOpen size={16} />باز کردن پوشه گزارش‌ها</button>
          <button type="button" onClick={() => void runWindowAction("close")}><LogOut size={16} />خروج از برنامه</button>
        </div>
        <details>
          <summary>جزئیات فنی</summary>
          <pre>{details}</pre>
        </details>
      </main>
    </div>
  );
}
