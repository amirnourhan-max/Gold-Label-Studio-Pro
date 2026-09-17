import { useEffect, type ReactNode } from "react";
import { useAuthSession } from "./auth-session";
import { LoginPage } from "./LoginPage";
import { DatabaseErrorPage } from "./DatabaseErrorPage";
import "./login-page.css";
import { applyWindowMode } from "./window-mode";

/**
 * Blocks the authenticated workspace until a real signed-in user exists.
 *
 * The controlled in-memory fallback (browser preview / tests) has no persisted
 * credentials to check against, so it keeps rendering the app instead of a
 * login wall that could never be satisfied.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, user, hasCredentials, preview, unavailableReason, databaseError, retryBootstrap } = useAuthSession();
  const windowMode = preview || user ? "workspace" : "auth";

  useEffect(() => {
    void applyWindowMode(windowMode);
  }, [windowMode]);

  if (status === "loading") {
    return (
      <div className="login-screen" data-testid="auth-loading">
        <div className="login-loading">
          <span className="spinner" />
          <span>در حال آماده‌سازی پایگاه داده...</span>
        </div>
      </div>
    );
  }

  if (preview) return <>{children}</>;
  if (databaseError) return <DatabaseErrorPage error={databaseError} onRetry={retryBootstrap} />;
  if (!hasCredentials) return <LoginPage mode="first-run" initialError={unavailableReason ?? null} />;
  if (!user) return <LoginPage mode="sign-in" initialError={unavailableReason ?? null} />;
  return <>{children}</>;
}
