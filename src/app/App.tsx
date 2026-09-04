import { Dashboard } from "../components/dashboard/Dashboard";
import { Footer } from "../components/shell/Footer";
import { Sidebar } from "../components/shell/Sidebar";
import { Topbar } from "../components/shell/Topbar";
export function App(){return <div className="app-shell" data-testid="app-shell"><Sidebar/><div className="main-shell"><Topbar/><Dashboard/><Footer/></div></div>}