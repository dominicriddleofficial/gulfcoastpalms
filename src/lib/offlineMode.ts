/**
 * OFFLINE READ-ONLY MODE
 *
 * When Supabase Auth itself is unreachable or rejecting tokens (401 from a
 * refreshed JWT, network failure, timeout) a previously-signed-in user would
 * otherwise be bounced to /platform/login and lose access to data that is
 * already sitting on the device in IndexedDB.
 *
 * Offline mode lets that user READ the cached mirror. It is never a way to
 * get in without having signed in on this device before:
 *
 *  • Requires an auth snapshot written by a PREVIOUS SUCCESSFUL sign-in
 *    (`platform_access_snapshot:<userId>` in localStorage).
 *  • Requires the IndexedDB mirror to hold data for a business that snapshot
 *    lists.
 *  • The snapshot (and the mirror with it) is wiped on explicit sign-out and
 *    on a user switch, so a fresh device / signed-out phone shows the login
 *    form exactly as before.
 *  • Strictly read-only: every write path calls `assertWritable()`.
 */

import type { BusinessAccess } from "@/hooks/usePlatformAuth";
import { listMirroredBusinesses, getMirrorSavedAt } from "./offlineMirror";

const SNAPSHOT_PREFIX = "platform_access_snapshot:";

export interface OfflineAuthSnapshot {
  userId: string;
  userEmail: string;
  isOwner: boolean;
  isAdmin: boolean;
  businessAccess: BusinessAccess[];
  selectedBusinessId: string | null;
}

/**
 * Read the most recent platform auth snapshot, IGNORING token validity.
 * During a JWT-rejection incident the local token is expired/refused, which
 * is precisely when we need the snapshot. It carries no tokens and grants no
 * server access — RLS still guards every real request.
 */
export function readAnyAuthSnapshot(): OfflineAuthSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(SNAPSHOT_PREFIX)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as OfflineAuthSnapshot & { v?: number };
      if (!parsed?.userId || !Array.isArray(parsed.businessAccess)) continue;
      return {
        userId: parsed.userId,
        userEmail: parsed.userEmail ?? "",
        isOwner: !!parsed.isOwner,
        isAdmin: !!parsed.isAdmin,
        businessAccess: parsed.businessAccess,
        selectedBusinessId: parsed.selectedBusinessId ?? null,
      };
    }
  } catch {
    /* ignore — treated as "no snapshot" */
  }
  return null;
}

export interface OfflineEligibility {
  snapshot: OfflineAuthSnapshot;
  businessId: string;
  savedAt: number;
}

/**
 * Is this device allowed to enter offline mode right now? Requires BOTH a
 * previous-sign-in snapshot AND mirrored data for a business it lists.
 */
export async function checkOfflineEligibility(): Promise<OfflineEligibility | null> {
  const snapshot = readAnyAuthSnapshot();
  if (!snapshot) return null;
  const accessible = new Set(snapshot.businessAccess.map((a) => a.business_id));
  let mirrored: string[] = [];
  try {
    mirrored = await listMirroredBusinesses();
  } catch {
    return null;
  }
  const businessId =
    (snapshot.selectedBusinessId &&
      accessible.has(snapshot.selectedBusinessId) &&
      mirrored.includes(snapshot.selectedBusinessId)
      ? snapshot.selectedBusinessId
      : mirrored.find((id) => accessible.has(id))) ?? null;
  if (!businessId) return null;
  const savedAt = await getMirrorSavedAt(businessId);
  return { snapshot, businessId, savedAt };
}

/* ── live state ─────────────────────────────────────────────────────────── */

let active = false;
let savedAt = 0;
const listeners = new Set<(state: { active: boolean; savedAt: number }) => void>();

function emit() {
  const state = { active, savedAt };
  listeners.forEach((l) => {
    try { l(state); } catch { /* ignore */ }
  });
}

export function isOfflineMode(): boolean {
  return active;
}

export function getOfflineSavedAt(): number {
  return savedAt;
}

export function setOfflineMode(next: boolean, mirrorSavedAt = 0): void {
  if (active === next && (!next || mirrorSavedAt === savedAt)) return;
  active = next;
  savedAt = next ? mirrorSavedAt : 0;
  emit();
}

export function subscribeOfflineMode(
  cb: (state: { active: boolean; savedAt: number }) => void,
): () => void {
  listeners.add(cb);
  cb({ active, savedAt });
  return () => listeners.delete(cb);
}

export class OfflineReadOnlyError extends Error {
  constructor() {
    super("Offline mode — editing is disabled until the connection is back.");
    this.name = "OfflineReadOnlyError";
  }
}

/** Throw if a write is attempted while offline mode is active. */
export function assertWritable(): void {
  if (active) throw new OfflineReadOnlyError();
}

/** Human copy for disabled write controls. */
export const OFFLINE_WRITE_TOOLTIP =
  "Offline mode — editing is disabled until the connection is back.";
