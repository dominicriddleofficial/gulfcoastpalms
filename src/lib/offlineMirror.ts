/**
 * Offline Command Copy — local mirror of the currently-signed-in user's
 * business data, stored in IndexedDB so the platform stays usable in
 * READ-ONLY mode during Supabase outages.
 *
 * Rules (see also src/lib/queryCacheMirror.ts):
 *  • Never stores auth tokens. The presence of the auth snapshot in
 *    localStorage is the only trust boundary.
 *  • Wiped on sign-out or user switch via wipeOfflineMirror().
 *  • Writes are throttled per-store and scheduled on requestIdleCallback,
 *    so mirroring is never on the critical path.
 *  • Silently disables itself when IndexedDB is unavailable
 *    (private browsing, quota, etc.).
 */

export type OfflineStore = "schedule" | "customers" | "jobs" | "meta";

const DB_NAME = "gcp-offline-mirror";
const DB_VERSION = 1;
const STORES: OfflineStore[] = ["schedule", "customers", "jobs", "meta"];

// Minimum ms between mirror writes for a given store.
const MIN_WRITE_INTERVAL_MS = 2 * 60 * 1000;

export interface MirrorMeta {
  savedAt: number;
  businessId: string;
  userId: string;
  isOwner: boolean;
}

export interface MirrorRecord<T = unknown> {
  key: string;              // primary key (e.g. businessId + "|" + store)
  businessId: string;
  userId: string;
  isOwner: boolean;
  savedAt: number;
  data: T;
}

export interface MirrorContext {
  userId: string;
  isOwner: boolean;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
let currentContext: MirrorContext | null = null;
const lastWriteAt: Partial<Record<OfflineStore, number>> = {};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase | null> {
  if (!isBrowser()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: "key" });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function scheduleIdle(fn: () => void): void {
  if (!isBrowser()) return;
  type IdleWin = Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  const win = window as IdleWin;
  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(fn, { timeout: 2000 });
  } else {
    window.setTimeout(fn, 250);
  }
}

export function setMirrorContext(ctx: MirrorContext | null): void {
  currentContext = ctx;
}

export function getMirrorContext(): MirrorContext | null {
  return currentContext;
}

function primaryKey(businessId: string): string {
  return businessId;
}

/**
 * Mirror a fresh dataset for the given store. Throttled + idle-scheduled.
 * No-op when IndexedDB is unavailable or when no mirror context is set.
 */
export function mirrorData<T>(
  store: Exclude<OfflineStore, "meta">,
  businessId: string,
  data: T,
): void {
  if (!isBrowser() || !businessId) return;
  const ctx = currentContext;
  if (!ctx) return;
  const now = Date.now();
  const last = lastWriteAt[store] ?? 0;
  if (now - last < MIN_WRITE_INTERVAL_MS) return;
  lastWriteAt[store] = now;

  scheduleIdle(() => {
    void (async () => {
      const db = await openDb();
      if (!db) return;
      try {
        const tx = db.transaction([store, "meta"], "readwrite");
        const rec: MirrorRecord<T> = {
          key: primaryKey(businessId),
          businessId,
          userId: ctx.userId,
          isOwner: ctx.isOwner,
          savedAt: now,
          data,
        };
        tx.objectStore(store).put(rec);
        const meta: MirrorRecord<MirrorMeta> = {
          key: `${store}:${businessId}`,
          businessId,
          userId: ctx.userId,
          isOwner: ctx.isOwner,
          savedAt: now,
          data: {
            savedAt: now,
            businessId,
            userId: ctx.userId,
            isOwner: ctx.isOwner,
          },
        };
        tx.objectStore("meta").put(meta);
      } catch {
        /* ignore — mirror is best-effort */
      }
    })();
  });
}

export async function readMirror<T>(
  store: Exclude<OfflineStore, "meta">,
  businessId: string,
): Promise<MirrorRecord<T> | null> {
  const db = await openDb();
  if (!db || !businessId) return null;
  return new Promise<MirrorRecord<T> | null>((resolve) => {
    try {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(primaryKey(businessId));
      req.onsuccess = () => resolve((req.result as MirrorRecord<T> | undefined) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Any mirrored data at all for this business? Used to decide whether to
 * offer the "View offline copy" affordance on the login page.
 */
export async function hasAnyMirrorFor(businessId: string): Promise<boolean> {
  const [s, c, j] = await Promise.all([
    readMirror("schedule", businessId),
    readMirror("customers", businessId),
    readMirror("jobs", businessId),
  ]);
  return !!(s || c || j);
}

/**
 * List every business id that has at least one mirrored record. Used by the
 * offline page to pick a default business when the auth snapshot lists many.
 */
export async function listMirroredBusinesses(): Promise<string[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise<string[]>((resolve) => {
    const ids = new Set<string>();
    let pending = 0;
    try {
      for (const store of ["schedule", "customers", "jobs"] as const) {
        pending++;
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).getAllKeys();
        req.onsuccess = () => {
          (req.result ?? []).forEach((k) => {
            if (typeof k === "string") ids.add(k);
          });
          if (--pending === 0) resolve(Array.from(ids));
        };
        req.onerror = () => {
          if (--pending === 0) resolve(Array.from(ids));
        };
      }
    } catch {
      resolve([]);
    }
  });
}

/**
 * Wipe the entire mirror. Called from the auth-snapshot clearing paths so
 * we never keep offline data belonging to a signed-out user.
 */
export function wipeOfflineMirror(): void {
  if (!isBrowser()) return;
  // Reset throttle so a fresh sign-in can mirror immediately.
  for (const key of Object.keys(lastWriteAt)) {
    delete lastWriteAt[key as OfflineStore];
  }
  currentContext = null;
  try {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => { dbPromise = null; };
    req.onerror = () => { dbPromise = null; };
    req.onblocked = () => { dbPromise = null; };
  } catch {
    dbPromise = null;
  }
}

/**
 * Force-write a fresh dataset for the given store, bypassing the passive
 * 2-minute throttle used by `mirrorData`. Called by the proactive offline
 * prefetcher so a successful background refresh always updates the
 * snapshot + saved-at timestamp.
 */
export async function mirrorDataForce<T>(
  store: Exclude<OfflineStore, "meta">,
  businessId: string,
  data: T,
): Promise<void> {
  if (!isBrowser() || !businessId) return;
  const ctx = currentContext;
  if (!ctx) return;
  const db = await openDb();
  if (!db) return;
  const now = Date.now();
  lastWriteAt[store] = now;
  try {
    const tx = db.transaction([store, "meta"], "readwrite");
    const rec: MirrorRecord<T> = {
      key: businessId,
      businessId,
      userId: ctx.userId,
      isOwner: ctx.isOwner,
      savedAt: now,
      data,
    };
    tx.objectStore(store).put(rec);
    const meta: MirrorRecord<MirrorMeta> = {
      key: `${store}:${businessId}`,
      businessId,
      userId: ctx.userId,
      isOwner: ctx.isOwner,
      savedAt: now,
      data: { savedAt: now, businessId, userId: ctx.userId, isOwner: ctx.isOwner },
    };
    tx.objectStore("meta").put(meta);
  } catch {
    /* ignore — mirror is best-effort */
  }
}