/**
 * Opening screen content. Kept free of image imports and browser APIs so the same data
 * builds the prebuilt first view and the live React hero.
 *
 * The photo is the business's own: a climber at the top of a tall sabal palm, from the
 * Gulf Coast Palms Facebook page (src/assets/facebook/README.md). Phones and wide
 * screens each get their own crop (scripts/build-redesign-media.mjs).
 *
 * The headline is the owner's wording. The line under it names the services and the
 * service area in plain text, and the rating comes from src/lib/business-info.ts.
 */
import { GCP_BUSINESS } from "@/lib/business-info";

const BASE = "/media/redesign";
const set = (name: string, widths: readonly number[], ext: "avif" | "jpg") =>
  widths.map((w) => `${BASE}/${name}-${w}.${ext} ${w}w`).join(", ");

/** Where the layout switches from the phone crop to the wide crop. Matches first-view.css. */
export const HERO_WIDE = "(min-width: 1000px)";
export const HERO_NARROW = "(max-width: 999.98px)";

const PHONE_WIDTHS = [780, 1182] as const;
const WIDE_WIDTHS = [1024, 1536] as const;

export const heroPhoto = {
  alt: "A Gulf Coast Palms climber in a yellow helmet at the top of a tall sabal palm, one arm out, his saw hanging on a lanyard, against a clear blue sky",
  phone: {
    avif: set("hero-climber-phone", PHONE_WIDTHS, "avif"),
    jpg: set("hero-climber-phone", PHONE_WIDTHS, "jpg"),
    fallback: `${BASE}/hero-climber-phone-780.jpg`,
    width: 1182,
    height: 1590,
    // Stated at two thirds of the screen: a sharp picture on a 3x phone for about half the download.
    sizes: "66vw",
  },
  wide: {
    avif: set("hero-climber", WIDE_WIDTHS, "avif"),
    jpg: set("hero-climber", WIDE_WIDTHS, "jpg"),
    width: 1536,
    height: 1140,
    // The photo is shown a little wider than the screen (see .rd-hero__media).
    sizes: "112vw",
  },
};

export const heroCopy = {
  /** One line each, broken on purpose. */
  lines: ["Expert tree work.", "Precision palm care."],
  /** Names the two tree services, palm care and the service area in real text. */
  lead: "Tree removal, tree trimming and palm care from Perdido Key to 30A.",
  rating: `${Number(GCP_BUSINESS.aggregateRating.ratingValue).toFixed(1)} from ${GCP_BUSINESS.aggregateRating.reviewCount} Google reviews`,
};
