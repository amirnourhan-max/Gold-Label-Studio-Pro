import { lazy, Suspense, useState } from "react";
import { AuthGate } from "../features/auth/AuthGate";
import { AuthSessionProvider } from "../features/auth/auth-session";
import { AppShell } from "../layouts/AppShell";
import type { ShellRoute } from "../types";
import { resolveShellRoute, routeRegistry } from "./routes";

const AcceptanceHarness = import.meta.env.VITE_ACCEPTANCE_MODE === "1"
  ? lazy(() => import("../features/auth/AcceptanceHarness").then(module => ({ default: module.AcceptanceHarness })))
  : null;

function initialRoute(): ShellRoute {
  const requested = new URLSearchParams(window.location.search).get("page");
  return resolveShellRoute(requested);
}

export function App(){
  const [activePage, setActivePage] = useState<ShellRoute>(initialRoute);

  return <AuthSessionProvider>
    {AcceptanceHarness ? <Suspense fallback={null}><AcceptanceHarness /></Suspense> : null}
    <AuthGate>
      <AppShell activePage={activePage} onNavigate={setActivePage}>
        {routeRegistry[activePage]({ onNewProduct: () => setActivePage("product-registration") })}
      </AppShell>
    </AuthGate>
  </AuthSessionProvider>;
}
