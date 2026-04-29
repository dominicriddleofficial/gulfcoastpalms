import { Navigate } from "react-router-dom";
import { useUserRole, type PlatformRole } from "@/hooks/useUserRole";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";

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
  const { loading: authLoading, userId, accessDenied, businessAccess } = usePlatformAuth();

  // While the role or auth is still resolving, render children — the
  // underlying page shows its own loading state via usePlatformAuth.
  if (isLoading || authLoading) return <>{children}</>;

  // Not signed in → let the page handle the redirect via usePlatformAuth.
  if (!userId) return <>{children}</>;

  // Signed in but explicitly no access at all → show a clear error so the
  // user never sees a blank screen.
  if (accessDenied || (businessAccess.length === 0 && !role)) {
    if (import.meta.env.DEV) {
      console.warn("[RoleRoute] Access denied — no business access for user");
    }
    return <AccessDeniedScreen reason="no-access" />;
  }

  // No role resolved (extreme edge case — workspace exists but role lookup
  // returned null). Don't bounce into a redirect loop, surface the problem.
  if (!role) {
    if (import.meta.env.DEV) {
      console.warn("[RoleRoute] Role resolved as null with allow =", allow);
    }
    return <AccessDeniedScreen reason="no-role" />;
  }

  if (!allow.includes(role)) {
    // Avoid redirect loops: if the redirect target is the same place this
    // role would just be bounced from again, show an inline error instead.
    const safeRedirects: Record<string, Array<Exclude<PlatformRole, null>>> = {
      "/platform/crew": ["owner", "manager", "crew"],
      "/platform": ["owner", "office_manager", "manager"],
    };
    const allowed = safeRedirects[redirectTo];
    if (allowed && !allowed.includes(role)) {
      if (import.meta.env.DEV) {
        console.warn(
          "[RoleRoute] Role not allowed and redirect target also not allowed",
          { role, allow, redirectTo },
        );
      }
      return <AccessDeniedScreen reason="wrong-role" />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

function AccessDeniedScreen({ reason }: { reason: "no-access" | "no-role" | "wrong-role" }) {
  const message =
    reason === "no-access"
      ? "Your account isn't linked to any workspace yet."
      : reason === "no-role"
      ? "We couldn't load your permissions for this workspace."
      : "You don't have access to this page.";
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card/80 p-6 text-center space-y-3 backdrop-blur-xl">
        <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="font-body text-sm text-muted-foreground">{message}</p>
        <p className="font-body text-xs text-muted-foreground">
          Please contact your admin so they can review your access.
        </p>
        <a
          href="/platform/login"
          className="inline-block mt-2 font-body text-xs text-primary hover:underline"
        >
          Back to sign in
        </a>
      </div>
    </div>
  );
}