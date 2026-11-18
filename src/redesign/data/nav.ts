/**
 * Navigation for the redesigned site.
 *
 * Labels and addresses come from the same service and city data the current site
 * uses, so every existing page keeps its place and its URL. The short notes under
 * each service restate that service's own page description; no new claims.
 */
import { serviceNavLinks } from "@/data/services";
import { locations } from "@/data/locations";

export interface NavItem {
  label: string;
  to: string;
  note?: string;
}

const NOTES: Record<string, string> = {
  "/services/tree-trimming-removal": "Everything we do for oaks and pines",
  "/services/tree-removal": "Whole-tree removal with a written scope",
  "/services/tree-trimming": "Clearance, dead and damaged branches",
  "/services/storm-damage-cleanup": "Fallen, broken and leaning trees",
  "/services/palm-tree-trimming": "Dead fronds, seed pods and flower stalks",
  "/services/palm-diamond-cutting": "A clean cross-hatch finish on the trunk",
  "/services/palm-tree-trunk-skinning": "Old boots off for a smooth trunk",
  "/services/palm-tree-removal": "Dead, damaged or unwanted palms",
  "/services/palm-tree-installation": "Sourced, delivered and planted",
  "/hoa-commercial-palm-maintenance": "Scheduled care for large properties",
  "/hurricane-palm-preparation": "Pre-storm trimming and hazard checks",
  "/services/landscaping-services": "Hedges, mulch, sod and bed cleanups",
};

const byPath = new Map(serviceNavLinks.map((link) => [link.to, link]));

function pick(paths: string[]): NavItem[] {
  return paths.flatMap((to) => {
    const link = byPath.get(to);
    return link ? [{ label: link.label, to: link.to, note: NOTES[to] }] : [];
  });
}

/** The two main routes. Order inside each list is the order visitors ask for the work. */
export const treeServices: NavItem[] = pick([
  "/services/tree-removal",
  "/services/tree-trimming",
  "/services/storm-damage-cleanup",
  "/services/tree-trimming-removal",
]);

export const palmServices: NavItem[] = pick([
  "/services/palm-tree-trimming",
  "/services/palm-diamond-cutting",
  "/services/palm-tree-trunk-skinning",
  "/services/palm-tree-removal",
  "/services/palm-tree-installation",
  "/hoa-commercial-palm-maintenance",
  "/hurricane-palm-preparation",
]);

/** Shorter names for tight spots (route panels, menus). The page titles are unchanged. */
export const SHORT_LABEL: Record<string, string> = {
  "/services/tree-trimming-removal": "All tree services",
  "/services/palm-tree-trimming": "Palm Trimming",
  "/services/palm-diamond-cutting": "Diamond Cutting",
  "/services/palm-tree-trunk-skinning": "Trunk Skinning",
  "/services/palm-tree-removal": "Palm Removal",
  "/services/palm-tree-installation": "Palm Installation",
  "/hoa-commercial-palm-maintenance": "HOA & Commercial",
  "/hurricane-palm-preparation": "Hurricane Prep",
};

export const shortLabel = (item: NavItem) => SHORT_LABEL[item.to] ?? item.label;

export const propertyServices: NavItem[] = [
  ...pick(["/services/landscaping-services"]),
  { label: "Maintenance Plans", to: "/palm-tree-maintenance-plans", note: "Year-round scheduled trimming" },
];

export const commercialLinks: NavItem[] = [
  { label: "Commercial & Property Managers", to: "/commercial", note: "Portfolios, HOAs and commercial sites" },
  { label: "HOA & Commercial Maintenance", to: "/hoa-commercial-palm-maintenance", note: "Scheduled care for large properties" },
];

/** Everything else the current menus and footer link to, kept reachable. */
export const moreLinks: NavItem[] = [
  { label: "About", to: "/about" },
  { label: "Palm Care Guides", to: "/learn" },
  { label: "Palm Tree Types", to: "/palm-trees/types" },
  { label: "More Palm Care Guides", to: "/palm-trees/guides" },
  { label: "Palm Tree Cost Guide", to: "/palm-tree-cost" },
  { label: "Hurricane Prep Guide", to: "/hurricane-palm-preparation" },
  { label: "Buy Palm Trees", to: "/palm-trees/buy" },
  { label: "Emergency Service", to: "/emergency-palm-service" },
  { label: "Referral Program", to: "/referral" },
];

export const companyLinks: NavItem[] = [
  { label: "Completed Projects", to: "/jobs" },
  { label: "About Us", to: "/about" },
  { label: "Commercial & Property Managers", to: "/commercial" },
  { label: "Buy Palm Trees", to: "/palm-trees/buy" },
  { label: "Palm Tree Types", to: "/palm-trees/types" },
  { label: "Palm Tree Cost", to: "/palm-tree-cost" },
  { label: "Palm Care Guides", to: "/learn" },
  { label: "Holiday Lighting", to: "/holiday-lighting" },
  { label: "Referral Program", to: "/referral" },
  { label: "Careers", to: "/careers/gulf-coast-palms" },
  { label: "Payments", to: "/payments" },
];

export const legalLinks: NavItem[] = [
  { label: "Terms of Service", to: "/terms-of-service" },
  { label: "Privacy Policy", to: "/privacy-policy" },
];

/** City pages, in the order the current site lists them. */
export const areaLinks: NavItem[] = locations.map((loc) => ({
  label: `${loc.city}, ${loc.state}`,
  to: `/${loc.slug}`,
}));

/**
 * The same city pages ordered along the coast from west to east, the way a local
 * would list them. Any city added to the data later is appended, so none is dropped.
 */
const WEST_TO_EAST = [
  "Perdido Key", "Perdido", "Pensacola", "Pace", "Gulf Breeze", "Milton", "Navarre",
  "Mary Esther", "Fort Walton Beach", "Crestview", "Niceville", "Destin", "Santa Rosa Beach", "30A",
];
export const coastAreas: { city: string; to: string }[] = [
  ...WEST_TO_EAST.flatMap((city) => {
    const loc = locations.find((l) => l.city === city);
    return loc ? [{ city: loc.city, to: `/${loc.slug}` }] : [];
  }),
  ...locations.filter((l) => !WEST_TO_EAST.includes(l.city)).map((l) => ({ city: l.city, to: `/${l.slug}` })),
];
