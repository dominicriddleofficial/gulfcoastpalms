import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/contexts/BusinessContext";

export type PlatformRole = "owner" | "office_manager" | "manager" | "crew" | null;

// Module-level cache: key = `${userId}:${businessId}` → role
const roleCache = new Map<string, PlatformRole>();

export function useUserRole() {
  const { selectedBusinessId } = useBusinessContext();
  const [role, setRole] = useState<PlatformRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setUserId(null);
        setRole(null);
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      // No business selected → owner-style "All Businesses" view.
      // Treat as owner only if they actually own a workspace.
      if (!selectedBusinessId) {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_user_id", user.id)
          .limit(1);
        if (cancelled) return;
        setRole(ws && ws.length > 0 ? "owner" : null);
        setIsLoading(false);
        return;
      }

      const cacheKey = `${user.id}:${selectedBusinessId}`;
      if (roleCache.has(cacheKey)) {
        setRole(roleCache.get(cacheKey) ?? null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_user_role", {
        _user_id: user.id,
        _business_id: selectedBusinessId,
      });
      if (cancelled) return;

      const resolved: PlatformRole = error
        ? null
        : (data as PlatformRole) ?? null;

      roleCache.set(cacheKey, resolved);
      setRole(resolved);
      setIsLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [selectedBusinessId]);

  return {
    userId,
    role,
    isOwner: role === "owner",
    isOfficeManager: role === "office_manager",
    isManager: role === "manager",
    isCrew: role === "crew",
    /** Owner OR manager — i.e. has full operational access (not crew). */
    isStaff: role === "owner" || role === "office_manager" || role === "manager",
    isLoading,
  };
}

/** Clear the module-level role cache. Call after invite accept / role change. */
export function clearUserRoleCache() {
  roleCache.clear();
}