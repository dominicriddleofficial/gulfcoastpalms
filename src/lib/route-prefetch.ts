// Route prefetch map — maps sidebar nav paths to their lazy import functions.
// Prefetching warms the JS chunk cache so the next tab tap renders instantly.
const ROUTE_IMPORTS: Record<string, () => Promise<unknown>> = {
  "/platform": () => import("../pages/platform/PlatformDashboard"),
  "/platform/leads": () => import("../pages/platform/PlatformLeads"),
  "/platform/customers": () => import("../pages/platform/PlatformCustomers"),
  "/platform/quotes": () => import("../pages/platform/PlatformQuotes"),
  "/platform/jobs": () => import("../pages/platform/PlatformJobs"),
  "/platform/schedule": () => import("../pages/platform/PlatformSchedule"),
  "/platform/invoices": () => import("../pages/platform/PlatformInvoices"),
  "/platform/payments": () => import("../pages/platform/PlatformPayments"),
  "/platform/analytics": () => import("../pages/platform/PlatformAnalytics"),
  "/platform/communications": () => import("../pages/platform/PlatformComms"),
  "/platform/tasks": () => import("../pages/platform/PlatformTasks"),
  "/platform/settings": () => import("../pages/platform/PlatformSettings"),
  "/platform/team": () => import("../pages/platform/PlatformTeam"),
  "/platform/job-checklists": () => import("../pages/platform/PlatformJobChecklists"),
  "/platform/job-pricing": () => import("../pages/platform/PlatformJobPricing"),
};

// Routes prioritized for background prefetch right after the platform shell mounts.
// Order = perceived priority. Heavy/rare pages (analytics, settings, more) load last.
const PRIORITY_PLATFORM_ROUTES = [
  "/platform",
  "/platform/schedule",
  "/platform/jobs",
  "/platform/leads",
  "/platform/customers",
  "/platform/quotes",
  "/platform/invoices",
  "/platform/payments",
  "/platform/communications",
  "/platform/tasks",
  "/platform/settings",
  "/platform/analytics",
  "/platform/team",
  "/platform/job-checklists",
  "/platform/job-pricing",
];

const prefetched = new Set<string>();

export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  const importFn = ROUTE_IMPORTS[path];
  if (importFn) {
    prefetched.add(path);
    importFn().catch(() => prefetched.delete(path));
  }
}

type IdleCallback = (cb: () => void) => void;
const scheduleIdle: IdleCallback =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (cb) => (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback(cb, { timeout: 2000 })
    : (cb) => setTimeout(cb, 200);

let allPlatformPrefetched = false;

/**
 * Idle-prefetch every platform route chunk after the shell loads. Spaces them
 * out so we don't compete with the current page's data fetches.
 */
export function prefetchAllPlatformRoutes() {
  if (allPlatformPrefetched) return;
  allPlatformPrefetched = true;
  PRIORITY_PLATFORM_ROUTES.forEach((path, idx) => {
    scheduleIdle(() => {
      setTimeout(() => prefetchRoute(path), idx * 60);
    });
  });
}