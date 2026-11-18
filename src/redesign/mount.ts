/**
 * Where the redesigned public site is mounted.
 *
 * Today it is a hidden preview at /preview/redesign. Everything under /preview/ is
 * already untracked (index.html and src/lib/analytics.ts) and the pages are marked
 * noindex. When a page is opened under that address the whole app runs with it as
 * the router base, so every existing link, redirect and page works inside the
 * preview without knowing about it, and the real public URLs are not touched.
 *
 * After the owner approves the design, set REDESIGN_LIVE to true. The same pages
 * then render at the site root. docs/redesign/README.md lists the few things to do
 * in the same change.
 */
export const REDESIGN_PREVIEW_BASE = "/preview/redesign";

/** The one switch that puts the redesign on the real public URLs. */
export const REDESIGN_LIVE = false;

/** Router base for a given address: the preview prefix, "" at the root once live, or null for the current site. */
export function redesignBaseFor(pathname: string): string | null {
  if (REDESIGN_LIVE) return "";
  const path = pathname.replace(/\/+$/, "");
  return path === REDESIGN_PREVIEW_BASE || path.startsWith(`${REDESIGN_PREVIEW_BASE}/`) ? REDESIGN_PREVIEW_BASE : null;
}

const base = typeof window === "undefined" ? null : redesignBaseFor(window.location.pathname);

/** Router base for this page load (see redesignBaseFor). */
export const REDESIGN_BASE: string | null = base;

/** True when this page load is showing the redesigned site. */
export const REDESIGN_ACTIVE = base !== null;

/** True only inside the hidden preview, never once the redesign is live. */
export const REDESIGN_IS_PREVIEW = base === REDESIGN_PREVIEW_BASE;
