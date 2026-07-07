/**
 * Proactive offline mirror prefetcher.
 *
 * The passive query-cache mirror (src/lib/queryCacheMirror.ts) only saves
 * data that a visited tab happens to load. That leaves gaps: if the owner
 * only opened Customers before a Supabase outage, the jobs store stays
 * empty and the offline "Today"/"This Week" tabs show 0.
 *
 * This module actively fetches:
 *   • Jobs scheduled from 30 days ago through 90 days ahead (enriched via
 *     the `get_schedule_jobs` RPC — customer name, address/city, time
 *     window, status, total_amount).
 *   • All customers for the business.
 *
 * It runs once per business session and is throttled to at most every
 * 15 minutes (stored in localStorage so it survives reloads). Every
 * successful fetch overwrites the previous snapshot AND updates the
 * saved-at timestamp, so the snapshot is never older than the last
 * successful app open.
 */

import { fetchDashboardScheduledJobs } from "@/hooks/useDashboardScheduledJobs";
import { fetchPlatformCustomersList } from "@/hooks/usePlatformCustomersList";
import { mirrorDataForce, getMirrorContext } from "./offlineMirror";

const THROTTLE_MS = 15 * 60 * 1000;
const LS_PREFIX = "offline_mirror_last_prefetch:";
const inflight = new Set<string>();

function lastRunAt(businessId: string): number {
  try {
    const raw = window.localStorage.getItem(LS_PREFIX + businessId);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function markRun(businessId: string): void {
  try {
    window.localStorage.setItem(LS_PREFIX + businessId, String(Date.now()));
  } catch { /* ignore quota */ }
}

export interface OfflineMirrorPrefetchOptions {
  /** Ignore the 15-min throttle. Use only when the user explicitly forces a resync. */
  force?: boolean;
}

/**
 * Run a proactive offline mirror refresh for `businessId`. Fire-and-forget —
 * never throws. Safe to call from any effect; concurrent calls dedupe.
 */
export async function runOfflineMirrorPrefetch(
  businessId: string | null,
  opts: OfflineMirrorPrefetchOptions = {},
): Promise<void> {
  if (!businessId) return;
  if (typeof window === "undefined") return;
  if (!getMirrorContext()) return; // wait until auth is wired into the mirror
  if (!opts.force) {
    const since = Date.now() - lastRunAt(businessId);
    if (since < THROTTLE_MS) return;
  }
  if (inflight.has(businessId)) return;
  inflight.add(businessId);

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 90, 23, 59, 59, 999);

  try {
    // Run in parallel; each is independently mirrored on success so a
    // partial outage still saves whatever succeeded.
    await Promise.allSettled([
      (async () => {
        const jobs = await fetchDashboardScheduledJobs({ businessId, startDate, endDate });
        if (Array.isArray(jobs)) {
          await mirrorDataForce("schedule", businessId, jobs);
        }
      })(),
      (async () => {
        const customers = await fetchPlatformCustomersList(businessId);
        if (Array.isArray(customers)) {
          await mirrorDataForce("customers", businessId, customers);
        }
      })(),
    ]);
    markRun(businessId);
  } catch {
    /* swallow — offline prefetch is best-effort */
  } finally {
    inflight.delete(businessId);
  }
}