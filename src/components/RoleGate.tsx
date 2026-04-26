import type { ReactNode } from "react";
import { useUserRole, type PlatformRole } from "@/hooks/useUserRole";

interface Props {
  /** Roles allowed to see children. */
  allow: Array<Exclude<PlatformRole, null>>;
  children: ReactNode;
  /** Optional fallback shown when the role is loaded but not allowed. */
  fallback?: ReactNode;
  /** Optional placeholder shown while role is loading. Default: nothing. */
  loadingFallback?: ReactNode;
}

/**
 * Render children only when the current user's role for the active business
 * is included in `allow`. Returns nothing while loading (or `loadingFallback`).
 *
 * Usage:
 *   <RoleGate allow={["owner"]}>
 *     <RevenueChart />
 *   </RoleGate>
 */
export default function RoleGate({ allow, children, fallback = null, loadingFallback = null }: Props) {
  const { role, isLoading } = useUserRole();

  if (isLoading) return <>{loadingFallback}</>;
  if (!role || !allow.includes(role)) return <>{fallback}</>;

  return <>{children}</>;
}