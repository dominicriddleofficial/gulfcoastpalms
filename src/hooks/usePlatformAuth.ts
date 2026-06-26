import { createContext, createElement, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
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

function usePlatformAuthState(): PlatformAuthState {
  const [loading, setLoading] = useState(true);
  const [initialSessionChecked, setInitialSessionChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [businessAccess, setBusinessAccess] = useState<BusinessAccess[]>([]);
  const { selectedBusinessId, setSelectedBusinessId } = useBusinessContext();
  const navigate = useNavigate();
  const hadSessionRef = useRef(false);
  const initialSessionLoadedRef = useRef(false);

  const clearAuthState = useCallback(() => {
    setUserId(null);
    setUserEmail("");
    setIsOwner(false);
    setAccessDenied(false);
    setBusinessAccess([]);
  }, []);

  const loadPlatformAccess = useCallback(async (user: User, isCancelled: () => boolean) => {
    setLoading(true);
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
      return;
    }

    let enrichedAccess: BusinessAccess[] = [];
    if (access && access.length > 0) {
      const bizIds = access.map(a => a.business_id);
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, public_brand_name, shortcode, logo_url")
        .in("id", bizIds);
      if (isCancelled()) return;

      const { data: settings } = await supabase
        .from("business_settings")
        .select("business_id, default_business_color")
        .in("business_id", bizIds);
      if (isCancelled()) return;

      const bizMap = new Map(businesses?.map(b => [b.id, b]) || []);
      const settingsMap = new Map(settings?.map(s => [s.business_id, s]) || []);

      enrichedAccess = access.map(a => ({
        ...a,
        business: {
          ...bizMap.get(a.business_id)!,
          default_business_color: settingsMap.get(a.business_id)?.default_business_color || undefined,
        },
      }));
    } else if (owner || isAdmin) {
      const { data: allBiz } = await supabase
        .from("businesses")
        .select("id, public_brand_name, shortcode, logo_url");
      if (isCancelled()) return;
      
      const { data: settings } = await supabase
        .from("business_settings")
        .select("business_id, default_business_color");
      if (isCancelled()) return;

      const settingsMap = new Map(settings?.map(s => [s.business_id, s]) || []);

      enrichedAccess = (allBiz || []).map(b => ({
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
        business: {
          ...b,
          default_business_color: settingsMap.get(b.id)?.default_business_color || undefined,
        },
      }));
    }

    setUserId(user.id);
    setUserEmail(user.email || "");
    setIsOwner(owner || isAdmin);
    setAccessDenied(false);
    setBusinessAccess(enrichedAccess);

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
    } catch (error) {
      if (isCancelled()) return;
      if (import.meta.env.DEV) {
        console.error("[usePlatformAuth] Failed to load platform access:", error);
      }
      clearAuthState();
      setAccessDenied(true);
      setLoading(false);
    }
  }, [clearAuthState, selectedBusinessId, setSelectedBusinessId]);

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
        void loadPlatformAccess(user, () => cancelled);
      } else {
        hadSessionRef.current = false;
        clearAuthState();
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
        void loadPlatformAccess(session.user, () => cancelled);
        return;
      }

      if (event === "SIGNED_OUT") {
        const shouldRedirect = initialSessionLoadedRef.current && hadSessionRef.current;
        hadSessionRef.current = false;
        setInitialSessionChecked(true);
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
  }, [clearAuthState, loadPlatformAccess, navigate]);

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
