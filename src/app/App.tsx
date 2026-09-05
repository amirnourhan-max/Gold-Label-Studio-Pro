import { useState } from "react";
import { Dashboard } from "../components/dashboard/Dashboard";
import { Footer } from "../components/shell/Footer";
import { type ShellRoute, Sidebar } from "../components/shell/Sidebar";
import { Topbar } from "../components/shell/Topbar";
import { ProductRegistrationPage } from "../features/products/ProductRegistrationPage";
import { OperationsPreviewPage } from "../features/operations/OperationsPreviewPage";

export function App(){
  const [activePage, setActivePage] = useState<ShellRoute>("dashboard");

  return <div className="app-shell" data-testid="app-shell">
    <Sidebar activePage={activePage} onNavigate={setActivePage}/>
    <div className="main-shell">
      <Topbar/>
      {activePage === "dashboard" ? <Dashboard onNewProduct={() => setActivePage("product-registration")}/> : activePage === "product-registration" ? <ProductRegistrationPage/> : <OperationsPreviewPage mode={activePage}/>}
      <Footer/>
    </div>
  </div>;
}
