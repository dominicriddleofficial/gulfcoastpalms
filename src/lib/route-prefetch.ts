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

  // Marketing — services
  "/services": () => import("../pages/Services"),
  "/services/palm-tree-trimming": () => import("../pages/services/PalmTreeTrimming"),
  "/services/palm-tree-installation": () => import("../pages/services/PalmTreeInstallation"),
  "/services/palm-tree-removal": () => import("../pages/services/PalmTreeRemoval"),
  "/services/palm-diamond-cutting": () => import("../pages/services/PalmDiamondCutting"),
  "/services/palm-tree-trunk-skinning": () => import("../pages/services/PalmTreeTrunkSkinning"),
  "/services/tree-trimming-removal": () => import("../pages/services/TreeTrimmingRemoval"),
  "/services/landscaping-services": () => import("../pages/services/LandscapingServices"),

  // Marketing — locations
  "/palm-tree-trimming-pensacola-fl": () => import("../pages/locations/Pensacola"),
  "/palm-tree-trimming-gulf-breeze-fl": () => import("../pages/locations/GulfBreeze"),
  "/palm-tree-trimming-navarre-fl": () => import("../pages/locations/Navarre"),
  "/palm-tree-trimming-fort-walton-beach-fl": () => import("../pages/locations/FortWaltonBeach"),
  "/palm-tree-trimming-destin-fl": () => import("../pages/locations/Destin"),
  "/palm-tree-trimming-30a-fl": () => import("../pages/locations/ThirtyA"),
  "/palm-tree-trimming-perdido-key-fl": () => import("../pages/locations/PerdidoKey"),
  "/palm-tree-trimming-niceville-fl": () => import("../pages/locations/Niceville"),
  "/palm-tree-trimming-mary-esther-fl": () => import("../pages/locations/MaryEsther"),
  "/palm-tree-trimming-santa-rosa-beach-fl": () => import("../pages/locations/SantaRosaBeach"),
  "/palm-tree-trimming-pace-fl": () => import("../pages/locations/Pace"),
  "/palm-tree-trimming-milton-fl": () => import("../pages/locations/Milton"),

  // Other high-intent marketing routes
  "/quote": () => import("../pages/Quote"),
  "/service-areas": () => import("../pages/ServiceAreas"),
  "/palm-tree-cost": () => import("../pages/PalmTreeCost"),
  "/palm-tree-maintenance-plans": () => import("../pages/PalmTreeMaintenancePlans"),
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

/**
 * Returns true on devices that support real hover (desktop). Avoids burning
 * mobile data prefetching chunks the user may never visit.
 */
export function isHoverCapable(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Spread these props onto a Link/anchor to prefetch its route on
 * desktop hover/focus. No-op on mobile.
 */
export function prefetchOnHover(path: string) {
  if (!isHoverCapable()) return {};
  const handler = () => prefetchRoute(path);
  return { onMouseEnter: handler, onFocus: handler };
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