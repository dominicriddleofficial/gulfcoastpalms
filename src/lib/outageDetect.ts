/**
 * Classify errors as OUTAGE (Supabase / network unreachable) vs NORMAL
 * (wrong credentials, RLS denial, validation error, etc.).
 *
 * The offline-copy flow ONLY kicks in on OUTAGE-class errors. Wrong
 * password must still show the normal login-failed toast.
 */

export type ErrorClass = "outage" | "normal";

interface ErrorShape {
  name?: string;
  message?: string;
  status?: number | string;
  statusCode?: number | string;
  code?: string | number;
  cause?: unknown;
  __isAuthError?: boolean;
  originalError?: unknown;
}

function asShape(err: unknown): ErrorShape {
  if (!err || typeof err !== "object") return {};
  return err as ErrorShape;
}

function toStatus(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  return null;
}

/**
 * True when the error looks like Supabase itself is unreachable or 5xx.
 * Explicitly false for 4xx auth/permission errors.
 */
export function classifyError(err: unknown): ErrorClass {
  if (err == null) return "normal";

  // TypeError from fetch = network-level failure ("Failed to fetch",
 // "Load failed", "NetworkError when attempting to fetch resource")
  if (err instanceof TypeError) return "outage";

  const shape = asShape(err);
  const message = (shape.message ?? "").toLowerCase();
  const status =
    toStatus(shape.status) ??
    toStatus(shape.statusCode) ??
    toStatus(shape.code);

  // Explicit auth / permission / validation → NORMAL, never outage.
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 422) {
    return "normal";
  }
  if (shape.__isAuthError && status && status >= 400 && status < 500) {
    return "normal";
  }
  const authKeywords = [
    "invalid login",
    "invalid credentials",
    "invalid email",
    "invalid password",
    "email not confirmed",
    "user not found",
    "row level security",
    "permission denied",
    "not authorized",
    "jwt expired",
  ];
  if (authKeywords.some((k) => message.includes(k))) return "normal";

  // 5xx or unknown status with network-ish signals → OUTAGE.
  if (status && status >= 500) return "outage";

  const outageKeywords = [
    "failed to fetch",
    "load failed",
    "networkerror",
    "network error",
    "network request failed",
    "fetch failed",
    "the internet connection appears to be offline",
    "timeout",
    "timed out",
    "aborted",
    "socket",
    "gateway",
    "temporarily unavailable",
    "service unavailable",
    "econnrefused",
    "econnreset",
  ];
  if (outageKeywords.some((k) => message.includes(k))) return "outage";

  // Recurse into wrapped errors.
  if (shape.cause && shape.cause !== err) {
    const inner = classifyError(shape.cause);
    if (inner === "outage") return "outage";
  }
  if (shape.originalError && shape.originalError !== err) {
    const inner = classifyError(shape.originalError);
    if (inner === "outage") return "outage";
  }

  return "normal";
}

export function isOutageError(err: unknown): boolean {
  return classifyError(err) === "outage";
}

/**
 * Lightweight probe: is Supabase reachable right now?  4-second timeout,
 * single request, no retries.  Used by the offline page's Retry button
 * and its 60s recovery poll.
 */
export async function pingSupabase(supabaseUrl: string, anonKey: string): Promise<boolean> {
  if (!supabaseUrl || !anonKey) return false;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: anonKey },
      signal: controller.signal,
      cache: "no-store",
    });
    return res.ok || (res.status >= 200 && res.status < 500);
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}