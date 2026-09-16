/** Public marketing /quote is indexable; customer-specific /quote/* is not. */
export function isPrivateRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return /^\/(platform|portal|admin|ops|app|employee|pay|q)(\/|$)/.test(path)
    || path.startsWith("/quote/")
    || path.startsWith("/.lovable/");
}
