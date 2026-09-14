import {
  dashboardFixture,
  dashboardDeviceStatus,
  displayUsers,
  initialFields,
  previewNotice,
  labelDesignerTemplates,
  labelPrintQueue,
  labelPrintTemplates,
  packageItems,
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
  listPackageItems: () => packageItems,
  listLabelPrintTemplates: () => labelPrintTemplates,
  listLabelPrintQueue: () => labelPrintQueue,
  listLabelDesignerTemplates: () => labelDesignerTemplates,
  listReturnScans: () => returnScans,
  listUsers: () => displayUsers,
} as const;
