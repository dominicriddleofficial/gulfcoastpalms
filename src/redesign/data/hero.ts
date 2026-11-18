/**
 * Opening screen content. Kept free of image imports and browser APIs so the same data
 * builds the prebuilt first view and the live React hero.
 *
 * Every claim here already appears on the current site: the heading is the
 * owner-approved hero heading (src/data/publicMarketing.ts), the Navarre base comes
 * from the business address, "Perdido Key to 30A" from the current hero, and the
 * rating from src/lib/business-info.ts.
 */
import { GCP_BUSINESS } from "@/lib/business-info";

const HERO_BASE = "/media/redesign/hero-job";
const HERO_WIDTHS = [640, 960, 1440] as const;
const set = (ext: "avif" | "jpg") => HERO_WIDTHS.map((w) => `${HERO_BASE}-${w}.${ext} ${w}w`).join(", ");

export const heroPhoto = {
  width: 1440,
  height: 1500,
  avif: set("avif"),
  jpg: set("jpg"),
  fallback: `${HERO_BASE}-960.jpg`,
  /** Phones ask for less than full width: still sharp, and half the download on a phone connection. */
  sizes: "(min-width: 1000px) 58vw, 72vw",
  /** Used once someone looks closer, so the enlarged view gets the larger file. */
  zoomSizes: "(min-width: 1000px) 110vw, 170vw",
  alt: "A Gulf Coast Palms job in progress: a row of sabal palms with freshly skinned trunks beside a coastal home, the crew's ladder against the first palm and a loaded dump trailer in the driveway",
};

export const treeFrame = {
  width: 512,
  height: 288,
  avif: "/media/redesign/tree-frame-512.avif",
  jpg: "/media/redesign/tree-frame-512.jpg",
  alt: "Tree removal in progress: a worker with a chainsaw cuts a leaning tree trunk beside a two-story building",
  to: "/services/tree-removal",
  label: "Tree removal",
};

export const heroCopy = {
  /** Same words as publicMarketing.heroHeading, broken for the layout. */
  lines: ["Tree Removal,", "Tree Trimming", "& Palm Care"],
  place: "on Florida's Emerald Coast",
  base: "Based in Navarre. Crews from Perdido Key to 30A.",
  rating: `${Number(GCP_BUSINESS.aggregateRating.ratingValue).toFixed(1)} from ${GCP_BUSINESS.aggregateRating.reviewCount} Google reviews`,
  hint: "A trunk-skinning job, photographed mid-work. Select a + to look closer.",
};

export interface HeroSpot {
  id: string;
  /** Position on the photo, in percent of its width and height. */
  x: number;
  y: number;
  /** How far the photo enlarges around this point. */
  zoom: number;
  label: string;
  note: string;
  /** Shown on wide screens only; on phones this part of the photo is under the headline panel. */
  wideOnly?: boolean;
}

/** What the photo actually shows. Nothing here is claimed beyond what is visible in it. */
export const heroSpots: HeroSpot[] = [
  { id: "crown", x: 29.3, y: 18.9, zoom: 1.9, label: "the crown", note: "Crown trimmed and cleaned up." },
  { id: "trunk", x: 30.2, y: 50.5, zoom: 2.1, label: "the trunk", note: "Old boots cut away. The orange band is fresh trunk." },
  { id: "row", x: 53, y: 56, zoom: 2, label: "the row of palms", note: "The same finish on every palm down the side yard.", wideOnly: true },
  { id: "trailer", x: 89.5, y: 76, zoom: 1.9, label: "the trailer", note: "Cut fronds loaded on the trailer.", wideOnly: true },
];
