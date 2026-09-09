import {
  dashboardFixture,
  dashboardDeviceStatus,
  displayUsers,
  initialCategories,
  initialFields,
  initialMakers,
  previewNotice,
  labelDesignerTemplates,
  labelPrintQueue,
  labelPrintTemplates,
  packageItems,
  productRows,
  returnScans,
} from "../data/mock";

/**
 * Read-only boundary for the approved UI preview. Repositories that connect
 * to devices or persistence can replace these methods in the next phase.
 */
export const displayData = {
  getDashboard: () => dashboardFixture,
  listDashboardDevices: () => dashboardDeviceStatus,
  listProducts: () => productRows,
  getProductRegistration: () => ({ initialCategories, initialFields, initialMakers, previewNotice }),
  listPackageItems: () => packageItems,
  listLabelPrintTemplates: () => labelPrintTemplates,
  listLabelPrintQueue: () => labelPrintQueue,
  listLabelDesignerTemplates: () => labelDesignerTemplates,
  listReturnScans: () => returnScans,
  listUsers: () => displayUsers,
} as const;
