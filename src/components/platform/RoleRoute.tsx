import { Navigate } from "react-router-dom";
import { useUserRole, type PlatformRole } from "@/hooks/useUserRole";

interface Props {
  allow: Array<Exclude<PlatformRole, null>>;
  /** Where to send users who are signed in but not allowed. Default: /platform/crew */
  redirectTo?: string;
  children: React.ReactNode;
}

/**
 * Route-level role guard for /platform/* pages.
 *
 * - Owners / managers / crew with the right role: render children.
 * - Signed-in users without the right role: redirect (default: /platform/crew).
 * - Not signed in / no role at all: let the page itself handle auth
 *   (every platform page already calls usePlatformAuth and redirects to /platform/login).
 */
export default function RoleRoute({ allow, redirectTo = "/platform/crew", children }: Props) {
  const { role, isLoading } = useUserRole();

  // While loading, render children — the underlying page shows its own
  // loading state via usePlatformAuth, so we don't double-flash a spinner.
  if (isLoading) return <>{children}</>;

  // No role resolved yet (e.g. just-signed-in workspace owner with no
  // selected business) — let the page render; usePlatformAuth handles auth.
  if (!role) return <>{children}</>;

  if (!allow.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}