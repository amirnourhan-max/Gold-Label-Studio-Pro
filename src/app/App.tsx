import { lazy, Suspense, useCallback, useState } from "react";
import { AuthGate } from "../features/auth/AuthGate";
import { AuthSessionProvider } from "../features/auth/auth-session";
import { AppShell } from "../layouts/AppShell";
import type { ShellRoute } from "../types";
import { resolveShellRoute, routeRegistry } from "./routes";
import type { LabelDesignerLeaveGuard } from "../features/operations/LabelDesignerPage";

const AcceptanceHarness = import.meta.env.VITE_ACCEPTANCE_MODE === "1"
  ? lazy(() => import("../features/auth/AcceptanceHarness").then(module => ({ default: module.AcceptanceHarness })))
  : null;

const VisualTestApp = import.meta.env.VITE_VISUAL_TEST_MODE === "1"
  ? lazy(() => import("./VisualTestApp").then(module => ({ default: module.VisualTestApp })))
  : null;

function initialRoute(): ShellRoute {
  const requested = new URLSearchParams(window.location.search).get("page");
  return resolveShellRoute(requested);
}

export function App(){
  const [activePage, setActivePage] = useState<ShellRoute>(initialRoute);
  const [designerLeaveGuard, setDesignerLeaveGuard] = useState<LabelDesignerLeaveGuard | null>(null);
  const registerDesignerLeaveGuard = useCallback((guard: LabelDesignerLeaveGuard | null): void => {
    setDesignerLeaveGuard(() => guard);
  }, []);
  const navigate = useCallback((page: ShellRoute): void => {
    if (activePage === "label-designer" && page !== activePage && designerLeaveGuard !== null) {
      designerLeaveGuard(() => setActivePage(page));
      return;
    }
    setActivePage(page);
  }, [activePage, designerLeaveGuard]);

  if (VisualTestApp !== null) {
    return <Suspense fallback={null}><VisualTestApp /></Suspense>;
  }

  return <AuthSessionProvider>
    {AcceptanceHarness ? <Suspense fallback={null}><AcceptanceHarness /></Suspense> : null}
    <AuthGate>
      <AppShell activePage={activePage} onNavigate={navigate}>
        {routeRegistry[activePage]({
          onNewProduct: () => navigate("product-registration"),
          onRegisterLabelDesignerLeaveGuard: registerDesignerLeaveGuard,
        })}
      </AppShell>
    </AuthGate>
  </AuthSessionProvider>;
}
