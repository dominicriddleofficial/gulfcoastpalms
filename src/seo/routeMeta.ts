/**
 * Typed public API over the raw route table in `routes.data.mjs`.
 * The `.mjs` sibling is imported directly by the post-build prerender
 * script (`scripts/prerender-meta.mjs`) so both sides stay in sync.
 */

import { buildRouteMeta, SITE_ORIGIN, DEFAULT_OG_IMAGE } from "./routes.data.mjs";

export interface RouteMeta {
  path: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonical: string;
  ogType: string;
}

export { SITE_ORIGIN, DEFAULT_OG_IMAGE };

export const routeMeta: RouteMeta[] = buildRouteMeta() as RouteMeta[];

export const routeMetaByPath: Record<string, RouteMeta> = Object.fromEntries(
  routeMeta.map((r) => [r.path, r]),
);

export function getRouteMeta(path: string): RouteMeta | undefined {
  return routeMetaByPath[path];
}