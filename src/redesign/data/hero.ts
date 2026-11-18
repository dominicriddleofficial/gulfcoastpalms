/**
 * Opening screen content. Kept free of image imports and browser APIs so the same data
 * builds the prebuilt first view and the live React hero.
 *
 * The photo is the business's own, sent by the owner: a date palm beside a paver drive
 * after the crown was trimmed and the head diamond cut (src/assets/owner/README.md).
 * Phones and wide screens each get their own cut of it (scripts/build-redesign-media.mjs).
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
const WIDE_WIDTHS = [1024, 1536, 1932] as const;

export const heroPhoto = {
  alt: "A date palm beside a paver driveway after Gulf Coast Palms trimmed it: an even crown, the head finished in a diamond-cut pattern, and a clean trunk",
  phone: {
    avif: set("hero-date-palm-phone", PHONE_WIDTHS, "avif"),
    jpg: set("hero-date-palm-phone", PHONE_WIDTHS, "jpg"),
    fallback: `${BASE}/hero-date-palm-phone-780.jpg`,
    width: 1932,
    height: 2576,
    // Stated at three fifths of the screen, so every phone takes the 780-pixel file: still
    // sharp on a 3x screen, at well under half the download of the next size up.
    sizes: "60vw",
  },
  wide: {
    avif: set("hero-date-palm", WIDE_WIDTHS, "avif"),
    jpg: set("hero-date-palm", WIDE_WIDTHS, "jpg"),
    width: 1932,
    height: 1434,
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
