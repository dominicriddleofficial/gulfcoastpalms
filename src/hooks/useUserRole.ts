import { useEffect, useState } from "react";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";

export type PlatformRole = "owner" | "office_manager" | "manager" | "crew" | null;

// Module-level cache: key = `${userId}:${businessId}` → role
const roleCache = new Map<string, PlatformRole>();

export function useUserRole() {
  const { selectedBusinessId } = useBusinessContext();
  const auth = usePlatformAuth();
  const [role, setRole] = useState<PlatformRole>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    function load() {
      setIsLoading(true);

      if (auth.loading) return;

      if (!auth.userId) {
        setUserId(null);
        setRole(null);
        setIsLoading(false);
        return;
      }

      setUserId(auth.userId);

      // No business selected → owner-style "All Businesses" view.
      // Treat as owner only if platform auth resolved owner/admin access.
      // Otherwise, fall back to the user's highest role across any business so non-owner
      // accounts (office_manager / manager / crew) don't render as role=null
      // and trigger blank-screen redirect loops.
      if (!selectedBusinessId) {
        if (auth.isOwner) {
          setRole("owner");
          setIsLoading(false);
          return;
        }

        const priority: Record<string, number> = {
          owner: 1,
          office_manager: 2,
          manager: 3,
          crew: 4,
        };
        const best = auth.businessAccess
          .map((a) => a.role_name as Exclude<PlatformRole, null>)
          .sort((a, b) => (priority[a] ?? 99) - (priority[b] ?? 99))[0] ?? null;
        setRole(best);
        setIsLoading(false);
        return;
      }

      const cacheKey = `${auth.userId}:${selectedBusinessId}`;
      if (roleCache.has(cacheKey)) {
        setRole(roleCache.get(cacheKey) ?? null);
        setIsLoading(false);
        return;
      }

      const resolved = (auth.businessAccess.find((a) => a.business_id === selectedBusinessId)?.role_name as PlatformRole) ?? null;

      if (!resolved && import.meta.env.DEV) {
        console.warn("[useUserRole] Resolved role is null", {
          userId: auth.userId,
          businessId: selectedBusinessId,
        });
      }

      roleCache.set(cacheKey, resolved);
      setRole(resolved);
      setIsLoading(false);
    }

    load();
  }, [auth.businessAccess, auth.isOwner, auth.loading, auth.userId, selectedBusinessId]);

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