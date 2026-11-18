/**
 * Photos for each service page.
 *
 * Only real job photos on file are used, and each caption says what the photo
 * actually shows. Where a service has no photo of its own yet, the page shows the
 * nearest honest photo, captioned for what it is:
 *   - Tree pages: frames from the one removal on video. There is no tree-trimming or
 *     storm-cleanup photo yet, so those pages show the removal, labelled as a removal.
 *   - Palm removal and installation: no job photos on file at all.
 * `after` is reserved for a photo of the property once the work is done; no page has
 * one yet, and nothing is shown in its place.
 */
import type { Picture } from "../components/Photo";
import type { SequenceFrame } from "../components/Sequence";
import { treeRemovalSequence, treeRemovalShots } from "./treeRemoval";
import climber from "@/assets/facebook/climber-sabal.jpg?w=480;800;1152&format=avif;webp;jpg&as=picture";
import palmBefore from "@/assets/facebook/date-palm-before.jpg?w=480;800;1200&format=avif;webp;jpg&as=picture";
import palmAfter from "@/assets/facebook/date-palm-after.jpg?w=480;800;1200&format=avif;webp;jpg&as=picture";
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
  /** The same job in order, one moment after another. */
  sequence?: { heading: string; frames: SequenceFrame[] };
  /** Quote-form labels of projects worth showing on this page. */
  projects: string[];
  route: "tree" | "palm";
}

/** 720 pixels wide, so each is shown as a framed print at its own size. */
const TREE_STANDING: ServiceShot = { ...treeRemovalShots.standing, caption: "Tree removal: the sawyer at the base of a leaning tree beside a building.", small: true };
const TREE_GOING: ServiceShot = { ...treeRemovalShots.goingOver, caption: "Tree removal: the tree goes over, away from the building.", small: true };
const TREE_DOWN: ServiceShot = { ...treeRemovalShots.down, caption: "Tree removal: down, with the trunk clear of the wall.", small: true };
const TRAILER: ServiceShot = {
  photo: trailer,
  alt: "The Gulf Coast Palms truck and dump trailer loaded with cut palm fronds in a driveway",
  caption: "Cut material loaded on the trailer at a palm job.",
  small: true,
};

export const serviceMedia: Record<string, ServiceMedia> = {
  "tree-trimming-removal": { hero: TREE_STANDING, details: [], projects: [], route: "tree" },
  "tree-removal": {
    hero: TREE_GOING,
    details: [],
    // This page opens with the frames in order instead of a single photo.
    sequence: { heading: "One tree removal in three frames", frames: treeRemovalSequence },
    projects: [],
    route: "tree",
  },
  "tree-trimming": { hero: TREE_STANDING, details: [], projects: [], route: "tree" },
  "storm-damage-cleanup": { hero: TREE_DOWN, details: [], projects: [], route: "tree" },
  "palm-tree-trimming": {
    hero: { photo: climber, alt: "A climber in a yellow helmet at the top of a tall sabal palm, his saw hanging on a lanyard, a ladder against the next palm", caption: "Trimming a tall sabal from the top, saw on a lanyard.", focus: "50% 38%" },
    // The same date palm, before and after.
    details: [
      { photo: palmBefore, alt: "Before: a date palm in a back yard with old boots, dead growth and ferns covering the top of its trunk", caption: "Before: old boots, dead growth and ferns on the trunk.", focus: "50% 58%" },
      { photo: palmAfter, alt: "After: the same date palm with the growth removed, a clean trimmed crown and a tidy trunk", caption: "After: the same palm, crown trimmed and trunk cleaned up.", focus: "50% 58%" },
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
