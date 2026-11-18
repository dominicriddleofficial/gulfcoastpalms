/**
 * Address of the quote form, optionally with a service chosen in advance.
 * Same rule as the current quote button: the query is added only when a service is
 * named, and `service` must be an existing quote-form label (serviceNavLinks), so the
 * form and the CRM receive the values they receive today.
 */
export function quotePath(service?: string, source = "unknown", extra?: Record<string, string>): string {
  if (!service && !extra) return "/quote";
  return `/quote?${new URLSearchParams({ ...(service ? { service } : {}), ...extra, source }).toString()}`;
}
