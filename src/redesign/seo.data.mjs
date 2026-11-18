/**
 * Search listing text for the pages the redesign changes: page title, description and
 * main heading. Everything else keeps the title and description it has today.
 *
 * Two pages carry the search work:
 *   /services/tree-removal       for the homeowner who needs a tree taken down
 *   /services/palm-tree-trimming for the homeowner who wants their palms looked after
 * Both addresses already exist and already have the most links pointing at them for
 * their subject, so they are strengthened in place and no new pages are added.
 *
 * These apply in the preview straight away, and to the real pages only once
 * REDESIGN_LIVE is switched on (see live.mjs and applyRedesignSeo below).
 */
export const redesignSeo = {
  "/": {
    h1: "Expert tree work. Precision palm care.",
    lead: "Tree removal, tree trimming and palm care from Perdido Key to 30A.",
  },
  "/services/tree-removal": {
    title: "Tree Removal | Navarre & Emerald Coast FL | Gulf Coast Palms",
    description: "Tree removal from Perdido Key to 30A. See a real removal beside a building, how written estimates work, and what cleanup, haul-away and stump grinding cover.",
    h1: "Tree Removal on the Emerald Coast",
    lead: "Oaks, pines and problem trees taken down from Perdido Key to 30A, with a site assessment first and a written scope before any work starts.",
  },
  "/services/palm-tree-trimming": {
    title: "Palm Tree Trimming & Care | Emerald Coast FL | Gulf Coast Palms",
    description: "Palm tree trimming and care from Perdido Key to 30A. Real before-and-after photos of canopy trimming, trunk clean-up and diamond-cut trunks. Free quotes.",
    h1: "Palm Tree Trimming & Palm Care",
    lead: "Canopy trimming, seed pod removal, boot clean-up and diamond-cut trunks for palms from Perdido Key to 30A.",
  },
};

/** Title and description for a route, with the redesign's version when `live` is on. */
export function applyRedesignSeo(route, live) {
  const next = live ? redesignSeo[route.path] : undefined;
  if (!next) return route;
  return { ...route, title: next.title ?? route.title, description: next.description ?? route.description };
}
