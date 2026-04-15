// Route prefetch map — maps sidebar nav paths to their lazy import functions
const ROUTE_IMPORTS: Record<string, () => Promise<any>> = {
  "/platform": () => import("../pages/platform/PlatformDashboard"),
  "/platform/leads": () => import("../pages/platform/PlatformLeads"),
  "/platform/customers": () => import("../pages/platform/PlatformCustomers"),
  "/platform/quotes": () => import("../pages/platform/PlatformQuotes"),
  "/platform/quote-display": () => import("../pages/platform/PlatformQuoteDisplay"),
  "/platform/jobs": () => import("../pages/platform/PlatformJobs"),
  "/platform/schedule": () => import("../pages/platform/PlatformSchedule"),
  "/platform/invoices": () => import("../pages/platform/PlatformInvoices"),
  "/platform/payments": () => import("../pages/platform/PlatformPayments"),
  "/platform/analytics": () => import("../pages/platform/PlatformAnalytics"),
  "/platform/communications": () => import("../pages/platform/PlatformComms"),
  "/platform/tasks": () => import("../pages/platform/PlatformTasks"),
  "/platform/settings": () => import("../pages/platform/PlatformSettings"),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  const importFn = ROUTE_IMPORTS[path];
  if (importFn) {
    prefetched.add(path);
    importFn();
  }
}
