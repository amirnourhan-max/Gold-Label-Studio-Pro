import type { ReactNode } from "react";
import { AutomaticBackupScheduler } from "../components/shell/AutomaticBackupScheduler";
import { Footer } from "../components/shell/Footer";
import { Sidebar } from "../components/shell/Sidebar";
import { Topbar } from "../components/shell/Topbar";
import type { ShellRoute } from "../types";

type AppShellProps = {
  activePage: ShellRoute;
  onNavigate: (page: ShellRoute) => void;
  children: ReactNode;
};

export function AppShell({ activePage, children, onNavigate }: AppShellProps) {
  return <div className="app-shell" data-testid="app-shell">
    <AutomaticBackupScheduler />
    <Sidebar activePage={activePage} onNavigate={onNavigate} />
    <div className="main-shell">
      <Topbar />
      {children}
      <Footer />
    </div>
  </div>;
}
