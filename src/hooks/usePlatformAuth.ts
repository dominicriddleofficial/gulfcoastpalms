import { createContext, createElement, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/contexts/BusinessContext";
import type { User } from "@supabase/supabase-js";

export interface BusinessAccess {
  id: string;
  business_id: string;
  role_name: string;
  can_view_all_business_data: boolean;
  can_manage_leads: boolean;
  can_manage_quotes: boolean;
  can_manage_jobs: boolean;
  can_manage_schedule: boolean;
  can_manage_invoices: boolean;
  can_manage_payments: boolean;
  can_manage_communications: boolean;
  can_manage_settings: boolean;
  can_export_data: boolean;
  can_view_financials: boolean;
  can_manage_users: boolean;
  can_delete_records: boolean;
  default_business: boolean;
  business: {
    id: string;
    public_brand_name: string;
    shortcode: string;
    logo_url: string | null;
    default_business_color?: string;
  };
}

export interface PlatformAuthState {
  loading: boolean;
  userId: string | null;
  userEmail: string;
  isOwner: boolean;
  accessDenied: boolean;
  businessAccess: BusinessAccess[];
  businesses: BusinessAccess["business"][];
  selectedBusinessId: string | null;
  setSelectedBusinessId: (id: string | null) => void;
  selectedBusiness: BusinessAccess | null;
  signOut: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthState | null>(null);

/* ──────────────────────────────────────────────────────────────────────────
 * Sync auth hydration
 *
 * The supabase client already persists the session to localStorage. To skip
 * the "Loading platform…" gate on warm cold starts, we ALSO persist a tiny
 * snapshot of the non-sensitive shell state (user id/email, role flags,
 * the resolved businessAccess list) under `platform_access_snapshot:<userId>`.
 *
 * Safety rules (the snapshot is a UI hint only, never a security boundary):
 *  • Hydrate ONLY when a valid, unexpired supabase token is present in
 *    localStorage AND the snapshot's userId matches that token's user.id.
 *  • Tokens are never copied into the snapshot.
 *  • Every Supabase request still re-authorizes via RLS, so a stale
 *    snapshot can never expose data.
 *  • On SIGNED_OUT or a user-id mismatch the snapshot is cleared.
 * ────────────────────────────────────────────────────────────────────────── */

const SNAPSHOT_PREFIX = "platform_access_snapshot:";
const SNAPSHOT_VERSION = 1 as const;

interface PlatformAccessSnapshot {
  v: typeof SNAPSHOT_VERSION;
  userId: string;
  userEmail: string;
  isOwner: boolean;
  isAdmin: boolean;
  businessAccess: BusinessAccess[];
  selectedBusinessId: string | null;
}

function snapshotKey(userId: string) {
  return SNAPSHOT_PREFIX + userId;
}

/**
 * Read the persisted supabase session synchronously from localStorage.
 * Returns null if no valid session is present.
 */
function readPersistedSupabaseSession():
  | { userId: string; userEmail: string; expiresAt: number }
  | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !/^sb-.*-auth-token$/.test(key)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      // Modern format: the value IS the Session. Legacy: { currentSession }.
      const session = parsed?.currentSession ?? parsed;
      const accessToken: unknown = session?.access_token;
      const expiresAt: unknown = session?.expires_at;
      const user = session?.user;
      if (
        typeof accessToken !== "string" ||
        typeof expiresAt !== "number" ||
        !user?.id
      ) {
        continue;
      }
      return {
        userId: String(user.id),
        userEmail: typeof user.email === "string" ? user.email : "",
        expiresAt,
      };
    }
  } catch {
    /* ignore — fall through to "no hydration" */
  }
  return null;
}

/**
 * Best-effort sync hydration. Only returns a snapshot when BOTH a valid
 * unexpired token AND a matching snapshot for that user.id exist.
 */
function readHydration(): PlatformAccessSnapshot | null {
  const session = readPersistedSupabaseSession();
  if (!session) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  if (session.expiresAt <= nowSec + 30) return null;
  try {
    const raw = window.localStorage.getItem(snapshotKey(session.userId));
    if (!raw) return null;
    const snap = JSON.parse(raw) as PlatformAccessSnapshot;
    if (!snap || snap.v !== SNAPSHOT_VERSION) return null;
    if (snap.userId !== session.userId) return null;
    if (!Array.isArray(snap.businessAccess)) return null;
    return snap;
  } catch {
    return null;
  }
}

function saveSnapshot(snap: PlatformAccessSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(snapshotKey(snap.userId), JSON.stringify(snap));
  } catch {
    /* quota / private mode — ignore */
  }
}

function clearAllSnapshots() {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(SNAPSHOT_PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

function usePlatformAuthState(): PlatformAuthState {
  // Hydrate synchronously on the very first render so the shell can paint
  // real data instead of the loading gate. `useMemo` is sync on first render.
  const hydrated = useMemo<PlatformAccessSnapshot | null>(() => readHydration(), []);

  const [loading, setLoading] = useState(hydrated === null);
  const [initialSessionChecked, setInitialSessionChecked] = useState(hydrated !== null);
  const [userId, setUserId] = useState<string | null>(hydrated?.userId ?? null);
  const [userEmail, setUserEmail] = useState(hydrated?.userEmail ?? "");
  const [isOwner, setIsOwner] = useState(hydrated?.isOwner ?? false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [businessAccess, setBusinessAccess] = useState<BusinessAccess[]>(
    hydrated?.businessAccess ?? [],
  );
  const { selectedBusinessId, setSelectedBusinessId } = useBusinessContext();
  const navigate = useNavigate();
  const hadSessionRef = useRef(hydrated !== null);
  const initialSessionLoadedRef = useRef(hydrated !== null);
  const isAdminRef = useRef(hydrated?.isAdmin ?? false);

  const clearAuthState = useCallback(() => {
    setUserId(null);
    setUserEmail("");
    setIsOwner(false);
    setAccessDenied(false);
    setBusinessAccess([]);
    isAdminRef.current = false;
  }, []);

  const loadPlatformAccess = useCallback(async (user: User, isCancelled: () => boolean) => {
    // Don't flip back to loading=true if we already hydrated real data —
    // that would re-show the loading gate during background revalidation.
    if (userId !== user.id) setLoading(true);
    setAccessDenied(false);

    try {
      // Steps 1-3 are independent of each other — run them in parallel so
      // the cold-start auth boot waits on one round-trip instead of three.
      // Step 4 (businesses + business_settings) still runs after because it
      // depends on the business ids returned by step 3.
      const [
        { data: workspaces },
        { data: roles },
        { data: access },
      ] = await Promise.all([
        supabase
          .from("workspaces")
          .select("id")
          .eq("owner_user_id", user.id),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id),
        supabase
          .from("user_business_access")
          .select(`
            id, business_id, role_name,
            can_view_all_business_data, can_manage_leads, can_manage_quotes,
            can_manage_jobs, can_manage_schedule, can_manage_invoices,
            can_manage_payments, can_manage_communications, can_manage_settings,
            can_export_data, can_view_financials, can_manage_users,
            can_delete_records, default_business
          `)
          .eq("user_id", user.id)
          .eq("active_status", "active"),
      ]);
      if (isCancelled()) return;

      const owner = !!(workspaces && workspaces.length > 0);
      const isAdmin = roles?.some(r => r.role === "admin") || false;

    if (!owner && !isAdmin && (!access || access.length === 0)) {
      setUserId(user.id);
      setUserEmail(user.email || "");
      setIsOwner(false);
      setBusinessAccess([]);
      setAccessDenied(true);
      setLoading(false);
      isAdminRef.current = false;
      // No platform access — drop any stale snapshot for this user.
      try { window.localStorage.removeItem(snapshotKey(user.id)); } catch { /* ignore */ }
      return;
    }

    // Step 4: businesses + business_settings. They only depend on the
    // business ids from step 3, so kick them off in parallel. business_settings
    // only contributes a theming color — don't block the first paint on it;
    // fold the colors in when they arrive.
    type Biz = { id: string; public_brand_name: string; shortcode: string; logo_url: string | null };
    type Settings = { business_id: string; default_business_color: string | null };
    const buildOwnerEntry = (b: Biz, color: string | undefined): BusinessAccess => ({
      id: "",
      business_id: b.id,
      role_name: "owner",
      can_view_all_business_data: true,
      can_manage_leads: true,
      can_manage_quotes: true,
      can_manage_jobs: true,
      can_manage_schedule: true,
      can_manage_invoices: true,
      can_manage_payments: true,
      can_manage_communications: true,
      can_manage_settings: true,
      can_export_data: true,
      can_view_financials: true,
      can_manage_users: true,
      can_delete_records: true,
      default_business: false,
      business: { ...b, default_business_color: color },
    });

    let businessesPromise: Promise<{ data: Biz[] | null }>;
    let settingsPromise: Promise<{ data: Settings[] | null }>;
    if (access && access.length > 0) {
      const bizIds = access.map((a) => a.business_id);
      businessesPromise = supabase
        .from("businesses")
        .select("id, public_brand_name, shortcode, logo_url")
        .in("id", bizIds) as unknown as Promise<{ data: Biz[] | null }>;
      settingsPromise = supabase
        .from("business_settings")
        .select("business_id, default_business_color")
        .in("business_id", bizIds) as unknown as Promise<{ data: Settings[] | null }>;
    } else {
      businessesPromise = supabase
        .from("businesses")
        .select("id, public_brand_name, shortcode, logo_url") as unknown as Promise<{ data: Biz[] | null }>;
      settingsPromise = supabase
        .from("business_settings")
        .select("business_id, default_business_color") as unknown as Promise<{ data: Settings[] | null }>;
    }

    const { data: businesses } = await businessesPromise;
    if (isCancelled()) return;

    const bizMap = new Map((businesses || []).map((b) => [b.id, b]));
    const enrichedAccess: BusinessAccess[] =
      access && access.length > 0
        ? access
            .filter((a) => bizMap.has(a.business_id))
            .map((a) => ({
              ...a,
              business: { ...bizMap.get(a.business_id)!, default_business_color: undefined },
            }))
        : (businesses || []).map((b) => buildOwnerEntry(b, undefined));

    setUserId(user.id);
    setUserEmail(user.email || "");
    setIsOwner(owner || isAdmin);
    setAccessDenied(false);
    setBusinessAccess(enrichedAccess);
    isAdminRef.current = isAdmin;

    // Only set default business if nothing is persisted yet
    if (selectedBusinessId === null) {
      const defaultBiz = enrichedAccess.find(a => a.default_business);
      if (defaultBiz) {
        setSelectedBusinessId(defaultBiz.business_id);
      } else if (!owner && !isAdmin && enrichedAccess.length > 0) {
        // Non-owner/non-admin users MUST have a workspace selected, otherwise
        // useUserRole returns null → RoleRoute redirects → blank page loop.
        setSelectedBusinessId(enrichedAccess[0].business_id);
      }
      // If owner and no default, leave as null (= "All Businesses")
    } else {
      // Validate that persisted business is still accessible
      const isValid = enrichedAccess.some(a => a.business_id === selectedBusinessId);
      if (!isValid && !owner && !isAdmin) {
        const defaultBiz = enrichedAccess.find(a => a.default_business);
        const fallback = defaultBiz?.business_id || enrichedAccess[0]?.business_id || null;
        if (import.meta.env.DEV) {
          console.warn(
            "[usePlatformAuth] Persisted business not accessible — falling back to:",
            fallback,
          );
        }
        setSelectedBusinessId(fallback);
      }
    }

      setLoading(false);

      // Persist the colorless snapshot immediately so the next cold start
      // has hydratable shell state even if business_settings is still in flight.
      saveSnapshot({
        v: SNAPSHOT_VERSION,
        userId: user.id,
        userEmail: user.email || "",
        isOwner: owner || isAdmin,
        isAdmin,
        businessAccess: enrichedAccess,
        selectedBusinessId,
      });

      // Fold in the theming colors when the parallel settings query lands —
      // doesn't block first paint.
      void settingsPromise.then(({ data: settings }) => {
        if (isCancelled()) return;
        const settingsMap = new Map((settings || []).map((s) => [s.business_id, s]));
        const withColors: BusinessAccess[] = enrichedAccess.map((entry) => ({
          ...entry,
          business: {
            ...entry.business,
            default_business_color:
              settingsMap.get(entry.business_id)?.default_business_color || undefined,
          },
        }));
        setBusinessAccess(withColors);
        saveSnapshot({
          v: SNAPSHOT_VERSION,
          userId: user.id,
          userEmail: user.email || "",
          isOwner: owner || isAdmin,
          isAdmin,
          businessAccess: withColors,
          selectedBusinessId,
        });
      }).catch(() => { /* non-critical — colors stay undefined */ });
    } catch (error) {
      if (isCancelled()) return;
      if (import.meta.env.DEV) {
        console.error("[usePlatformAuth] Failed to load platform access:", error);
      }
      clearAuthState();
      setAccessDenied(true);
      setLoading(false);
    }
  }, [clearAuthState, selectedBusinessId, setSelectedBusinessId, userId]);

  useEffect(() => {
    let cancelled = false;
    let initialHandled = false;

    const handleInitialSession = (user: User | null) => {
      if (cancelled || initialHandled) return;
      initialHandled = true;
      initialSessionLoadedRef.current = true;
      setInitialSessionChecked(true);

      if (user) {
        hadSessionRef.current = true;
        // If the live session's user.id doesn't match the snapshot we
        // hydrated from, drop the snapshot and reset shell state before
        // the real fetch lands — never let a stale snapshot survive a
        // user switch.
        if (hydrated && hydrated.userId !== user.id) {
          clearAllSnapshots();
          clearAuthState();
        }
        void loadPlatformAccess(user, () => cancelled);
      } else {
        // Token vanished between hydration and INITIAL_SESSION — clear
        // any optimistically rendered shell.
        if (hydrated) {
          clearAllSnapshots();
          clearAuthState();
        }
        hadSessionRef.current = false;
        setLoading(false);
      }
    };

    const hardStopTimer = window.setTimeout(() => {
      if (cancelled || initialHandled) return;
      initialHandled = true;
      initialSessionLoadedRef.current = true;
      setInitialSessionChecked(true);
      clearAuthState();
      setLoading(false);
      navigate("/platform/login", { replace: true });
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      if (event === "INITIAL_SESSION") {
        handleInitialSession(session?.user ?? null);
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        hadSessionRef.current = true;
        setInitialSessionChecked(true);
        // Different user signed in — drop any other user's snapshot.
        if (userId && userId !== session.user.id) clearAllSnapshots();
        void loadPlatformAccess(session.user, () => cancelled);
        return;
      }

      if (event === "SIGNED_OUT") {
        const shouldRedirect = initialSessionLoadedRef.current && hadSessionRef.current;
        hadSessionRef.current = false;
        setInitialSessionChecked(true);
        clearAllSnapshots();
        clearAuthState();
        setLoading(false);
        if (shouldRedirect) navigate("/platform/login", { replace: true });
      }
    });

    const fallbackTimer = window.setTimeout(() => {
      if (cancelled || initialHandled) return;
      void supabase.auth.getSession().then(({ data }) => {
        handleInitialSession(data.session?.user ?? null);
      }).catch((error) => {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          console.error("[usePlatformAuth] Initial session fallback failed:", error);
        }
        handleInitialSession(null);
      });
    }, 1500);

    return () => {
      cancelled = true;
      window.clearTimeout(hardStopTimer);
      window.clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, [clearAuthState, loadPlatformAccess, navigate, hydrated, userId]);

  useEffect(() => {
    if (initialSessionChecked && !loading && !userId && !accessDenied) {
      navigate("/platform/login", { replace: true });
    }
  }, [initialSessionChecked, loading, userId, accessDenied, navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSelectedBusinessId(null);
    navigate("/platform/login");
  };

  const selectedBusiness = businessAccess.find(a => a.business_id === selectedBusinessId) || null;
  const businesses = businessAccess.map(a => a.business);

  return {
    loading,
    userId,
    userEmail,
    isOwner,
    accessDenied,
    businessAccess,
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
    selectedBusiness,
    signOut,
  };
}

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const auth = usePlatformAuthState();
  return createElement(PlatformAuthContext.Provider, { value: auth }, children);
}

export function usePlatformAuth() {
  const auth = useContext(PlatformAuthContext);
  if (auth) return auth;
  return {
    loading: false,
    userId: null,
    userEmail: "",
    isOwner: false,
    accessDenied: false,
    businessAccess: [],
    businesses: [],
    selectedBusinessId: null,
    setSelectedBusinessId: () => undefined,
    selectedBusiness: null,
    signOut: async () => undefined,
  };
}
