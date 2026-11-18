/**
 * Photos for each service page.
 *
 * Only real job photos on file are used, and each caption says what the photo
 * actually shows. Where a service has no photo of its own yet, the page leads with
 * type and shows the nearest honest photo, captioned for what it is:
 *   - Tree pages: one small frame of a removal under way is all there is.
 *   - Palm removal and installation: no job photos on file at all.
 * `after` is reserved for a photo of the property once the work is done; no page has
 * one yet, and nothing is shown in its place.
 */
import type { Picture } from "../components/Photo";
import treeFrame from "@/assets/tree-removal-work.jpg?w=512&format=avif;webp;jpg&as=picture";
import sabals from "@/assets/redesign/palm-sabals-yard.jpg?w=480;800;1200;1400&format=avif;webp;jpg&as=picture";
import coastalHome from "@/assets/redesign/home-coastal.jpg?w=480;800;1206&format=avif;webp;jpg&as=picture";
import estate from "@/assets/redesign/estate-aerial.jpg?w=480;800;1082&format=avif;webp;jpg&as=picture";
import canaryTall from "@/assets/redesign/palm-canary-tall.jpg?w=480;800&format=avif;webp;jpg&as=picture";
import diamond from "@/assets/diamond-cutting.jpg?w=515&format=avif;webp;jpg&as=picture";
import skinningTall from "@/assets/redesign/skinning-tall.jpg?w=480;800;1000&format=avif;webp;jpg&as=picture";
import skinningDetail from "@/assets/redesign/skinning-detail.jpg?w=520&format=avif;webp;jpg&as=picture";
import trailer from "@/assets/redesign/trailer-loaded.jpg?w=480;640&format=avif;webp;jpg&as=picture";

export interface ServiceShot {
  photo: Picture;
  alt: string;
  caption: string;
  focus?: string;
  /** Small source files are shown as a framed print at their own size, never stretched. */
  small?: boolean;
}

export interface ServiceMedia {
  /** Opening photo. `small` shots make the page lead with type. */
  hero: ServiceShot;
  /** Closer looks at the work, shown beside the page's description. */
  details: ServiceShot[];
  /** The property after the work. None on file yet. */
  after?: ServiceShot;
  /** Quote-form labels of projects worth showing on this page. */
  projects: string[];
  route: "tree" | "palm";
}

const TREE_FRAME: ServiceShot = {
  photo: treeFrame,
  alt: "Tree removal in progress: a worker with a chainsaw cuts a leaning tree trunk beside a two-story building",
  caption: "Tree removal under way. The trunk stands as tall as the two-story building beside it.",
  small: true,
};
const TRAILER: ServiceShot = {
  photo: trailer,
  alt: "The Gulf Coast Palms truck and dump trailer loaded with cut palm fronds in a driveway",
  caption: "Cut material loaded on the trailer at a palm job.",
  small: true,
};

export const serviceMedia: Record<string, ServiceMedia> = {
  "tree-trimming-removal": { hero: TREE_FRAME, details: [], projects: [], route: "tree" },
  "tree-removal": { hero: TREE_FRAME, details: [], projects: [], route: "tree" },
  "tree-trimming": { hero: TREE_FRAME, details: [], projects: [], route: "tree" },
  "storm-damage-cleanup": { hero: TREE_FRAME, details: [], projects: [], route: "tree" },
  "palm-tree-trimming": {
    hero: { photo: sabals, alt: "Two trimmed sabal palms and a pindo palm in the front yard of a brick home", caption: "Two sabals and a pindo after trimming, Crestview.", focus: "45% 30%" },
    details: [
      { photo: coastalHome, alt: "A coastal home with trimmed palms along the front and driveway", caption: "Palms trimmed across the front of a coastal home, Navarre.", focus: "50% 50%" },
      { photo: estate, alt: "Aerial view of a waterfront estate with dozens of trimmed palms around a pool", caption: "A waterfront estate from the air, Gulf Breeze.", focus: "50% 55%" },
    ],
    projects: ["Palm Tree Trimming"],
    route: "palm",
  },
  "palm-diamond-cutting": {
    hero: { photo: canaryTall, alt: "A trimmed date palm with a diamond-cut trunk on the front lawn of a home", caption: "Date palm, diamond cut, Gulf Breeze.", focus: "30% 62%" },
    details: [
      { photo: diamond, alt: "Close view of two date palm trunks finished with a diamond-cut cross-hatch pattern", caption: "The finish up close: each old leaf base cut back to an even diamond.", small: true },
    ],
    projects: ["Palm Diamond Cutting"],
    route: "palm",
  },
  "palm-tree-trunk-skinning": {
    hero: { photo: skinningTall, alt: "A row of sabal palms with freshly skinned trunks along the side of a coastal home, a ladder leaning on the first palm", caption: "Side-yard sabals mid-job. The orange band is freshly skinned trunk.", focus: "35% 30%" },
    details: [
      { photo: skinningDetail, alt: "Close view of a sabal palm trunk: old boots left just under the crown, a freshly skinned orange band below them, and older grey trunk at the bottom", caption: "Up close: boots left under the crown, fresh orange trunk where they were cut away.", small: true },
    ],
    projects: ["Palm Tree Trunk Skinning"],
    route: "palm",
  },
  "palm-tree-removal": { hero: TRAILER, details: [], projects: [], route: "palm" },
  "palm-tree-installation": {
    hero: { photo: estate, alt: "Aerial view of a waterfront estate with dozens of palms around a pool", caption: "Palms across a waterfront estate, Gulf Breeze.", focus: "50% 55%" },
    details: [],
    projects: [],
    route: "palm",
  },
};
