/**
 * Completed projects shown as case studies. One is tree work; that is the only
 * tree-work photo on file. The first two are the owner's own camera files
 * (src/assets/owner/README.md).
 *
 * What is recorded here is only what the photo shows or what the current Completed
 * Jobs page already says about it. Three things are deliberately left out until the
 * office supplies them, and the pages simply skip a field that is empty:
 *   - `need`:   what the customer asked for
 *   - `result`: anything about the outcome beyond what the photo shows
 *   - `city`:   left blank where the current site disagrees with itself about the photo
 *
 * The city-page photo captions on the current site are not used as a source: they
 * label the same eleven photos as fourteen different cities.
 */
import { locations } from "@/data/locations";
import type { Picture } from "../components/Photo";
import canary from "@/assets/gallery/job-8.jpeg?w=240;480;800;1200&format=avif;webp;jpg&as=picture";
import skinning from "@/assets/redesign/skinning-tall.jpg?w=240;480;800;1000&format=avif;webp;jpg&as=picture";
import estate from "@/assets/redesign/estate-aerial.jpg?w=240;480;800;1082&format=avif;webp;jpg&as=picture";
import sabals from "@/assets/gallery/job-9.jpeg?w=240;480;800;1200&format=avif;webp;jpg&as=picture";
import condoNight from "@/assets/gallery/job-11.jpeg?w=240;480;800;1080&format=avif;webp;jpg&as=picture";
import coastalHome from "@/assets/gallery/job-1.jpeg?w=240;480;800;1200&format=avif;webp;jpg&as=picture";
import commercialRow from "@/assets/gallery/job-10.jpeg?w=240;480;800;1200&format=avif;webp;jpg&as=picture";
import garage from "@/assets/gallery/job-5.jpeg?w=240;480;800;1125&format=avif;webp;jpg&as=picture";
import whiteHouse from "@/assets/gallery/job-7.jpeg?w=240;480;800;1014&format=avif;webp;jpg&as=picture";
import condoSunset from "@/assets/gallery/job-6.jpeg?w=240;480;800;1125&format=avif;webp;jpg&as=picture";
import condoRoad from "@/assets/gallery/job-3.jpeg?w=240;480;800;1200&format=avif;webp;jpg&as=picture";
import palmRow from "@/assets/gallery/job-4.jpeg?w=240;480;800;1286&format=avif;webp;jpg&as=picture";
import diamond from "@/assets/diamond-cutting.jpg?w=515&format=avif;webp;jpg&as=picture";
import treeFrame from "@/assets/facebook/tree-removal-2.jpg?w=240;480;720&format=avif;webp;jpg&as=picture";
import climber from "@/assets/facebook/climber-sabal.jpg?w=240;480;800;1152&format=avif;webp;jpg&as=picture";
import palmAfter from "@/assets/facebook/date-palm-after.jpg?w=240;480;800;1200&format=avif;webp;jpg&as=picture";
import palmBefore from "@/assets/facebook/date-palm-before.jpg?w=240;480;800;1200&format=avif;webp;jpg&as=picture";
import crewPool from "@/assets/redesign/crew-pool-yard.jpg?w=240;480;800;1152&format=avif;webp;jpg&as=picture";
import driveAfter from "@/assets/owner/date-palm-drive-after.jpg?w=240;480;800;1200;1600&format=avif;webp;jpg&as=picture";
import driveBefore from "@/assets/redesign/date-palm-drive-before.jpg?w=240;480;800;1210&format=avif;webp;jpg&as=picture";
import fiveSabals from "@/assets/owner/five-sabals-dusk.jpg?w=240;480;800;1315&format=avif;webp;jpg&as=picture";

/** "tree" is tree work; the other two are palm work, split by the kind of property. */
export type ProjectKind = "tree" | "home" | "commercial";

export interface Project {
  id: string;
  title: string;
  /** City as given on the current Completed Jobs page. Empty where that is not reliable. */
  city?: string;
  property: string;
  /** What the crew did, as far as the photo shows it. */
  work: string;
  /** What the customer asked for. Not on record yet for any project. */
  need?: string;
  result?: string;
  kind: ProjectKind;
  photo: Picture;
  alt: string;
  /** Part of the photo to keep when the frame is a different shape. */
  focus?: string;
  /** A small source file. Shown at its own size in the gallery, and left out of the large viewers. */
  small?: boolean;
  /** The same subject before the work, where a true before photo exists. */
  before?: { photo: Picture; alt: string };
  /** The quote action that belongs next to this proof: an existing quote-form label and its page. */
  service: { label: string; to: string; ask: string };
}

const TRIM = { label: "Palm Tree Trimming", to: "/services/palm-tree-trimming", ask: "Get a palm trimming quote" };
const DIAMOND = { label: "Palm Diamond Cutting", to: "/services/palm-diamond-cutting", ask: "Get a diamond cutting quote" };
const SKIN = { label: "Palm Tree Trunk Skinning", to: "/services/palm-tree-trunk-skinning", ask: "Get a trunk skinning quote" };
const HOA = { label: "HOA & Commercial Maintenance", to: "/hoa-commercial-palm-maintenance", ask: "Get a commercial quote" };
const TREE = { label: "Tree Removal", to: "/services/tree-removal", ask: "Get a tree removal quote" };

export const projects: Project[] = [
  {
    id: "date-palm-by-the-drive",
    title: "Date palm, trimmed and diamond cut",
    property: "Home",
    work: "Ferns and old growth cleared off the head, the crown trimmed, the head finished with a diamond cut and the trunk cleaned up.",
    kind: "home",
    photo: driveAfter,
    alt: "After: a date palm beside a paver driveway with an even trimmed crown, a diamond-cut head and a clean trunk",
    focus: "48% 42%",
    before: { photo: driveBefore, alt: "Before: the same date palm with a heavy drooping crown and ferns growing out of the top of its trunk, a ladder leaning against it" },
    service: DIAMOND,
  },
  {
    id: "five-sabals-at-dusk",
    title: "Five sabals, trimmed",
    property: "Home",
    work: "Five sabal palms trimmed across the front of a home.",
    kind: "home",
    photo: fiveSabals,
    alt: "Five trimmed sabal palms in a mulch bed in front of a single-story home at dusk",
    focus: "50% 50%",
    service: TRIM,
  },
  {
    id: "date-palm-diamond-cut",
    title: "Date palm, diamond cut",
    city: "Gulf Breeze",
    property: "Home",
    work: "Diamond cut and crown trim on a date palm.",
    kind: "home",
    photo: canary,
    alt: "A trimmed date palm with a diamond-cut trunk on the front lawn of a home, with trimmed sabal palms behind it",
    focus: "35% 40%",
    service: DIAMOND,
  },
  {
    id: "side-yard-trunk-skinning",
    title: "Side-yard palms, trunks skinned",
    property: "Coastal home",
    work: "Old boots cut away on a row of sabal palms. Photographed mid-job, with the ladder still up.",
    kind: "home",
    photo: skinning,
    alt: "A row of sabal palms with freshly skinned trunks along the side of a coastal home, a ladder leaning on the first palm",
    focus: "40% 30%",
    service: SKIN,
  },
  {
    id: "tree-removal-under-way",
    title: "Tree removal beside a building",
    property: "Multi-story building",
    work: "A tall leaning tree taken down beside the building, falling away from the wall. Frame from our job video.",
    kind: "tree",
    photo: treeFrame,
    alt: "Tree removal in progress: a tree starting to fall away from a multi-story building as the worker steps back from the cut",
    small: true,
    service: TREE,
  },
  {
    id: "date-palm-clean-up",
    title: "Date palm clean-up",
    property: "Back yard",
    work: "Old boots, dead growth and ferns taken off the trunk and the crown trimmed.",
    kind: "home",
    photo: palmAfter,
    alt: "After: a date palm in a back yard with a clean trimmed crown and a tidy trunk",
    focus: "50% 55%",
    before: { photo: palmBefore, alt: "Before: the same date palm with old boots, dead growth and ferns covering the top of its trunk" },
    service: TRIM,
  },
  {
    id: "climbing-a-tall-sabal",
    title: "Climbing a tall sabal",
    property: "Coastal neighborhood",
    work: "A tall sabal trimmed from the top by a climber, saw on a lanyard, with a ladder on the next palm.",
    kind: "home",
    photo: climber,
    alt: "A climber in a yellow helmet at the top of a tall sabal palm, his saw hanging on a lanyard, a ladder against the next palm",
    focus: "50% 40%",
    service: TRIM,
  },
  {
    id: "waterfront-estate",
    title: "Waterfront estate",
    city: "Gulf Breeze",
    property: "Waterfront estate",
    work: "Palms trimmed across the grounds, seen from the air.",
    kind: "home",
    photo: estate,
    alt: "Aerial view of a waterfront estate with dozens of trimmed palms around a pool",
    focus: "50% 55%",
    service: TRIM,
  },
  {
    id: "pool-yard-sabals",
    title: "Sabals around a pool",
    property: "Waterfront home",
    work: "Sabal palms trimmed around the pool, with the crew clearing the cut fronds off the deck.",
    kind: "home",
    photo: crewPool,
    alt: "Two crew members clearing cut palm fronds beside a pool, trimmed sabal palms along the fence and the water behind",
    focus: "45% 50%",
    service: TRIM,
  },
  {
    id: "sabals-and-pindo",
    title: "Two sabals and a pindo",
    city: "Crestview",
    property: "Home",
    work: "Palm trimming in a front yard.",
    kind: "home",
    photo: sabals,
    alt: "Two trimmed sabal palms and a pindo palm in the front yard of a brick home under a blue sky",
    focus: "50% 35%",
    service: TRIM,
  },
  {
    id: "condo-at-night",
    title: "Condo palms after dark",
    city: "Destin",
    property: "Condo building",
    work: "Palms trimmed across the front of the building.",
    kind: "commercial",
    photo: condoNight,
    alt: "A condo building at night with its trimmed palms lit from below",
    focus: "50% 55%",
    service: HOA,
  },
  {
    id: "coastal-home",
    title: "Coastal home",
    city: "Navarre",
    property: "Home",
    work: "Residential palm care across the front of the property.",
    kind: "home",
    photo: coastalHome,
    alt: "A coastal home with trimmed palms along the front and driveway under a cloudy sky",
    focus: "50% 55%",
    service: TRIM,
  },
  {
    id: "roadside-row",
    title: "Roadside row of palms",
    city: "Destin",
    property: "Commercial property",
    work: "Commercial maintenance on a row of palms.",
    kind: "commercial",
    photo: commercialRow,
    alt: "A row of trimmed sabal palms along the edge of a commercial property",
    focus: "40% 25%",
    service: HOA,
  },
  {
    id: "parking-courtyard",
    title: "Parking structure courtyard",
    city: "Fort Walton Beach",
    property: "Commercial property",
    work: "Palms trimmed in the courtyard of a parking structure, ladders still in place.",
    kind: "commercial",
    photo: garage,
    alt: "Trimmed palms in the round courtyard of a parking structure, with ladders leaning against two trunks",
    focus: "50% 35%",
    service: HOA,
  },
  {
    id: "navarre-beach-home",
    title: "Beach home",
    city: "Navarre Beach",
    property: "Home",
    work: "Palm care at a residential property.",
    kind: "home",
    photo: whiteHouse,
    alt: "A white two-story beach home with trimmed palms under a deep blue sky",
    focus: "50% 65%",
    service: TRIM,
  },
  {
    id: "condo-complex",
    title: "Condo complex at sunset",
    city: "Destin",
    property: "Condo complex",
    work: "Palm care across a condo property.",
    kind: "commercial",
    photo: condoSunset,
    alt: "A condo tower at sunset with trimmed palms and a clipped hedge",
    focus: "50% 55%",
    service: HOA,
  },
  {
    id: "commercial-frontage",
    title: "Commercial frontage",
    city: "Destin",
    property: "Commercial property",
    work: "Palm maintenance along the front of a commercial property.",
    kind: "commercial",
    photo: condoRoad,
    alt: "Trimmed palms and planting beds in front of a multi-story building",
    focus: "50% 55%",
    service: HOA,
  },
  {
    id: "driveway-row",
    title: "Driveway palms",
    property: "Home",
    work: "Palm trimming along the front of a home.",
    kind: "home",
    photo: palmRow,
    alt: "A row of trimmed palms across the front of a white home",
    focus: "50% 50%",
    service: TRIM,
  },
  {
    id: "diamond-cut-detail",
    title: "Diamond cut, close up",
    property: "Wooded lot",
    work: "The cross-hatch finish on two date palm trunks.",
    kind: "home",
    photo: diamond,
    alt: "Close view of two date palm trunks finished with a diamond-cut cross-hatch pattern",
    focus: "50% 50%",
    small: true,
    service: DIAMOND,
  },
];

export const projectById = (id: string) => projects.find((p) => p.id === id);

/**
 * The service-area page for the city a project was recorded in, where there is one.
 * A beach community with no page of its own (Navarre Beach) goes to its town's page.
 */
export function cityPage(city?: string): string | undefined {
  if (!city) return undefined;
  const match = locations.find((l) => l.city === city) ?? locations.find((l) => l.city === city.replace(/ Beach$/, ""));
  return match ? `/${match.slug}` : undefined;
}

/** Shown on the homepage, in this order. */
export const featuredProjects: Project[] = [
  "date-palm-by-the-drive", "diamond-cut-detail", "five-sabals-at-dusk", "side-yard-trunk-skinning", "waterfront-estate", "condo-at-night",
].flatMap((id) => projectById(id) ?? []);

/**
 * Projects to show on a city page: the ones recorded in that city first, then the
 * nearest along the coast. Each keeps its own city in its caption, so a photo is
 * never passed off as being somewhere it is not.
 */
const COAST = [
  "Perdido Key", "Perdido", "Pensacola", "Pace", "Gulf Breeze", "Milton", "Navarre",
  "Mary Esther", "Fort Walton Beach", "Crestview", "Niceville", "Destin", "Santa Rosa Beach", "30A",
];
const coastIndex = (city?: string) => (city ? COAST.indexOf(city.replace(" Beach", "") === "Navarre" ? "Navarre" : city) : -1);

export function nearbyProjects(city: string, count = 3): Project[] {
  const here = coastIndex(city);
  return projects
    .filter((p) => coastIndex(p.city) !== -1)
    .map((p, order) => ({ p, gap: Math.abs(coastIndex(p.city) - here), order }))
    .sort((a, b) => a.gap - b.gap || a.order - b.order)
    .slice(0, count)
    .map((x) => x.p);
}
