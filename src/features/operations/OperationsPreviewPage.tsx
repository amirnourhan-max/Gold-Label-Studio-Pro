import "./operations-preview.css";
import "./reference-layout.css";
import { LabelDesignerPage } from "./LabelDesignerPage";
import { LabelPrintPage } from "./LabelPrintPage";
import { PackagingPage } from "./PackagingPage";
import { ReturnsPage } from "./ReturnsPage";
import { SettingsPage } from "../settings/SettingsPage";
import { ProductsPage } from "../products/ProductsPage";

type Mode = "label-print" | "label-designer" | "packaging" | "returns" | "products" | "settings";

export function OperationsPreviewPage({ mode }: { mode: Mode }) {
  if (mode === "label-print") return <LabelPrintPage />;
  if (mode === "label-designer") return <LabelDesignerPage />;
  if (mode === "packaging") return <PackagingPage />;
  if (mode === "returns") return <ReturnsPage />;
  if (mode === "settings") return <SettingsPage />;
  if (mode === "products") return <ProductsPage />;
  return null;
}
