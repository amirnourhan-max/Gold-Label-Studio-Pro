import type { ReactNode } from "react";
import { Dashboard } from "../components/dashboard/Dashboard";
import { OperationsPreviewPage } from "../features/operations/OperationsPreviewPage";
import { ProductRegistrationPage } from "../features/products/ProductRegistrationPage";
import { isShellRoute, type ShellRoute } from "../types";

export function resolveShellRoute(value: string | null): ShellRoute {
  return isShellRoute(value) ? value : "dashboard";
}

type RouteRenderOptions = Readonly<{
  onNewProduct: () => void;
}>;

type RouteRenderer = (options: RouteRenderOptions) => ReactNode;

export const routeRegistry: Readonly<Record<ShellRoute, RouteRenderer>> = {
  dashboard: ({ onNewProduct }) => <Dashboard onNewProduct={onNewProduct} />,
  "product-registration": () => <ProductRegistrationPage />,
  "label-print": () => <OperationsPreviewPage mode="label-print" />,
  "label-designer": () => <OperationsPreviewPage mode="label-designer" />,
  packaging: () => <OperationsPreviewPage mode="packaging" />,
  returns: () => <OperationsPreviewPage mode="returns" />,
  products: () => <OperationsPreviewPage mode="products" />,
  settings: () => <OperationsPreviewPage mode="settings" />,
};
