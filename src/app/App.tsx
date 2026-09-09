import { useState } from "react";
import { AppShell } from "../layouts/AppShell";
import type { ShellRoute } from "../types";
import { resolveShellRoute, routeRegistry } from "./routes";

function initialRoute(): ShellRoute {
  const requested = new URLSearchParams(window.location.search).get("page");
  return resolveShellRoute(requested);
}

export function App(){
  const [activePage, setActivePage] = useState<ShellRoute>(initialRoute);

  return <AppShell activePage={activePage} onNavigate={setActivePage}>
    {routeRegistry[activePage]({ onNewProduct: () => setActivePage("product-registration") })}
  </AppShell>;
}
