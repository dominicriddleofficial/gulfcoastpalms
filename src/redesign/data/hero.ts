/**
 * Opening screen content. Kept free of image imports and browser APIs so the same data
 * builds the prebuilt first view and the live React hero.
 *
 * Every claim here already appears on the current site: the heading is the
 * owner-approved hero heading (src/data/publicMarketing.ts), the Navarre base comes
 * from the business address, "Perdido Key to 30A" from the current hero, and the
 * rating from src/lib/business-info.ts.
 *
 * The photos are a before and an after of the same date palm, from the business's own
 * Facebook page (src/assets/facebook/README.md). They are cropped so the trunk sits in
 * the same place in both, which is what lets a visitor drag between them.
 */
import { GCP_BUSINESS } from "@/lib/business-info";

const BASE = "/media/redesign";
const set = (name: string, widths: readonly number[], ext: "avif" | "jpg") =>
  widths.map((w) => `${BASE}/${name}-${w}.${ext} ${w}w`).join(", ");

/** Where the layout switches from the phone crop to the wide crop. Matches first-view.css. */
export const HERO_WIDE = "(min-width: 1000px)";
export const HERO_NARROW = "(max-width: 999.98px)";

const PHONE_WIDTHS = [640, 800, 1200] as const;
const WIDE_WIDTHS = [960, 1440] as const;

export interface HeroShot {
  alt: string;
  /** Short word shown on the photo. */
  label: string;
  phone: { avif: string; jpg: string; fallback: string; width: number; height: number; sizes: string };
  wide: { avif: string; jpg: string; width: number; height: number; sizes: string };
}

const shot = (which: "before" | "after", label: string, alt: string): HeroShot => ({
  alt,
  label,
  phone: {
    avif: set(`hero-${which}-phone`, PHONE_WIDTHS, "avif"),
    jpg: set(`hero-${which}-phone`, PHONE_WIDTHS, "jpg"),
    fallback: `${BASE}/hero-${which}-phone-800.jpg`,
    width: 1440,
    height: 960,
    // Phones ask for a little under full width: still sharp, and a smaller download on a phone connection.
    sizes: "68vw",
  },
  wide: {
    avif: set(`hero-${which}`, WIDE_WIDTHS, "avif"),
    jpg: set(`hero-${which}`, WIDE_WIDTHS, "jpg"),
    width: 1440,
    height: 1500,
    sizes: "57vw",
  },
});

/** Described from what each photo shows. */
export const heroReveal = {
  before: shot(
    "before",
    "Before",
    "Before: a date palm in a back yard with old boots, dead growth and ferns covering the top of its trunk, a tarp spread at its base",
  ),
  after: shot(
    "after",
    "After",
    "After: the same date palm with the growth removed, a clean trimmed crown and a tidy trunk, the lawn cleared",
  ),
  /** Where the divider starts, in percent of the photo's width: on the trunk. */
  start: 50,
  control: "Slide to compare the before and after photos",
};

export const treeFrame = {
  width: 720,
  height: 540,
  avif: `${BASE}/tree-frame-360.avif 360w, ${BASE}/tree-frame-720.avif 720w`,
  jpg: `${BASE}/tree-frame-360.jpg 360w, ${BASE}/tree-frame-720.jpg 720w`,
  fallback: `${BASE}/tree-frame-360.jpg`,
  sizes: "(min-width: 1000px) 14rem, 33vw",
  alt: "Tree removal in progress: a worker in a helmet with a chainsaw at the base of a tree as it starts to fall, beside a multi-story building",
  to: "/services/tree-removal",
  label: "Tree removal",
};

export const heroCopy = {
  /** Same words as publicMarketing.heroHeading, broken for the layout. */
  lines: ["Tree Removal,", "Tree Trimming", "& Palm Care"],
  place: "on Florida's Emerald Coast",
  base: "Based in Navarre. Crews from Perdido Key to 30A.",
  rating: `${Number(GCP_BUSINESS.aggregateRating.ratingValue).toFixed(1)} from ${GCP_BUSINESS.aggregateRating.reviewCount} Google reviews`,
  /** Wide screens only; phones show just the two labels on the photo. */
  hint: "The same date palm, before and after. Drag across the photo to compare.",
};
