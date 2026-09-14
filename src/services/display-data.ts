import {
  dashboardFixture,
  dashboardDeviceStatus,
  initialFields,
  previewNotice,
  labelPrintQueue,
  labelPrintTemplates,
  productRows,
  returnScans,
} from "../data/mock";

/**
 * Read-only boundary for the approved UI preview. Catalog data now flows
 * through the catalog gateway; these mocks cover the remaining preview
 * features outside the catalog scope.
 */
export const displayData = {
  getDashboard: () => dashboardFixture,
  listDashboardDevices: () => dashboardDeviceStatus,
  listProducts: () => productRows,
  getProductRegistration: () => ({ initialFields, previewNotice }),
  listLabelPrintTemplates: () => labelPrintTemplates,
  listLabelPrintQueue: () => labelPrintQueue,
  listReturnScans: () => returnScans,
} as const;
