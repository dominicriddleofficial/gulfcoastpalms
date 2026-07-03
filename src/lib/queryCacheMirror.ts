/**
 * Subscribes to the React Query cache and mirrors successful data for a
 * small allow-list of query keys to IndexedDB via offlineMirror.
 *
 * This module NEVER modifies queries, refetch behavior, or fetch logic —
 * it is a passive observer. Failing writes are swallowed.
 */

import type { Query, QueryClient } from "@tanstack/react-query";
import { mirrorData, type OfflineStore } from "./offlineMirror";
import { classifyError } from "./outageDetect";

type MirrorTarget = Exclude<OfflineStore, "meta">;

/** Map a query key to (store, businessId) if it's one we mirror. */
function classifyQueryKey(key: readonly unknown[]): { store: MirrorTarget; businessId: string } | null {
  if (!Array.isArray(key) || key.length < 2) return null;
  const [head, biz] = key;
  if (typeof head !== "string" || typeof biz !== "string" || !biz) return null;
  if (head === "schedule-jobs") return { store: "schedule", businessId: biz };
  if (head === "dashboard-scheduled-jobs") return { store: "schedule", businessId: biz };
  if (head === "platform-customers-list") return { store: "customers", businessId: biz };
  if (head === "platform-jobs-list") return { store: "jobs", businessId: biz };
  return null;
}

let outageListeners: Set<(outage: boolean) => void> | null = null;
let outageState = false;

function setOutage(v: boolean) {
  if (v === outageState) return;
  outageState = v;
  outageListeners?.forEach((cb) => { try { cb(v); } catch { /* ignore */ } });
}

export function getOutageState(): boolean { return outageState; }

export function subscribeOutage(cb: (outage: boolean) => void): () => void {
  if (!outageListeners) outageListeners = new Set();
  outageListeners.add(cb);
  cb(outageState);
  return () => { outageListeners?.delete(cb); };
}

let installed = false;

/**
 * Install the mirror + outage subscribers on the given QueryClient.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function installQueryCacheMirror(qc: QueryClient): () => void {
  if (installed) return () => undefined;
  installed = true;
  const cache = qc.getQueryCache();

  const unsubscribe = cache.subscribe((event) => {
    const query = (event as { query?: Query }).query;
    if (!query) return;
    const state = query.state;

    if (state.status === "success" && state.data !== undefined) {
      const cls = classifyQueryKey(query.queryKey);
      if (cls) {
        try {
          mirrorData(cls.store, cls.businessId, state.data);
        } catch {
          /* ignore */
        }
      }
      // Any successful query = we're online.
      if (outageState) setOutage(false);
      return;
    }

    if (state.status === "error" && state.error) {
      if (classifyError(state.error) === "outage") setOutage(true);
    }
  });

  return () => {
    unsubscribe();
    installed = false;
  };
}