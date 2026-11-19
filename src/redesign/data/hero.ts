/**
 * Opening screen content. Kept free of image imports and browser APIs so the same data
 * builds the prebuilt first view and the live React hero.
 *
 * The work panel has two scenes, both sent by the owner (src/assets/owner/README.md):
 * the white condo building after dark, and the waterfront estate from the air, which
 * plays as a short clip. Each is the same job as a project already on the Completed
 * Jobs page, so the town, the property and the work are the ones recorded there.
 * The files are made by scripts/build-redesign-media.mjs.
 *
 * The headline is the owner's wording. The line under it names the services and the
 * service area in plain text, and the figures come from src/lib/business-info.ts and
 * the site's own list of service areas.
 */
import { GCP_BUSINESS } from "@/lib/business-info";

const BASE = "/media/redesign";
const set = (name: string, widths: readonly number[], ext: "avif" | "jpg") =>
  widths.map((w) => `${BASE}/${name}-${w}.${ext} ${w}w`).join(", ");

/** Where the layout switches from one column to two. Matches first-view.css. */
export const HERO_WIDE = "(min-width: 1000px)";

/**
 * How wide the work panel's picture is on screen. Phones state a little over half the
 * screen, so a 3x phone takes the 660-pixel file: twice as many pixels as the picture
 * on screen, sharp, for a third of the download of the next size up.
 */
const SIZES = "(min-width: 1000px) 30rem, 56vw";

export interface HeroScene {
  id: "night" | "air";
  /** The word on the switch. */
  tab: string;
  title: string;
  /** The small label on the picture saying what it is. */
  tag: string;
  /** The project's facts as recorded on the Completed Jobs page. */
  facts: { where: string; property: string; work: string };
  /** The service-area page for the town. */
  wherePath: string;
  photo: { avif: string; jpg: string; fallback: string; width: number; height: number; sizes: string; alt: string };
  /** A short silent clip that plays in place of the photo, where the connection allows. */
  clip?: { phone: string; wide: string; seconds: number };
  /** Seconds a still scene stays up before the panel moves on. */
  seconds: number;
}

export const heroScenes: HeroScene[] = [
  {
    id: "night",
    tab: "Night",
    title: "Condo, after dark",
    tag: "Our own job photo",
    facts: { where: "Destin, FL", property: "Condo building", work: "Palm trimming" },
    wherePath: "/palm-tree-trimming-destin-fl",
    photo: {
      avif: set("hero-night", [660, 990, 1242], "avif"),
      jpg: set("hero-night", [660, 990, 1242], "jpg"),
      fallback: `${BASE}/hero-night-660.jpg`,
      width: 1242,
      height: 1552,
      sizes: SIZES,
      alt: "A white five-story condo building at night with the trimmed palms across its front lit from below, the Gulf Coast Palms truck parked in front",
    },
    seconds: 6,
  },
  {
    id: "air",
    tab: "Aerial",
    title: "Estate, from the air",
    tag: "Our own drone footage",
    facts: { where: "Gulf Breeze, FL", property: "Waterfront estate", work: "Palm trimming" },
    wherePath: "/palm-tree-trimming-gulf-breeze-fl",
    photo: {
      avif: set("hero-air", [540, 720, 1080], "avif"),
      jpg: set("hero-air", [540, 720, 1080], "jpg"),
      fallback: `${BASE}/hero-air-540.jpg`,
      width: 1080,
      height: 1350,
      sizes: SIZES,
      alt: "Drone view of a waterfront estate with trimmed palms around the house, the pool and the drive, the bay behind it",
    },
    clip: { phone: `${BASE}/hero-air-540.mp4`, wide: `${BASE}/hero-air-720.mp4`, seconds: 7 },
    seconds: 7,
  },
];

const rating = Number(GCP_BUSINESS.aggregateRating.ratingValue).toFixed(1);
const reviews = Number(GCP_BUSINESS.aggregateRating.reviewCount);

export const heroCopy = {
  /** One line each, broken on purpose. */
  lines: ["Expert tree work.", "Precision palm care."],
  /** Three short assurances beside the buttons, each one already stated elsewhere on the site. */
  assure: ["Free written quote", "Site assessment first", "Quotes by text from a photo"],
  /** Names the two tree services, palm care and the service area in real text. */
  lead: "Tree removal, tree trimming and palm care from Perdido Key to 30A.",
  rating,
  reviews,
  /** The small line above the headline: the Google rating, said in full for screen readers. */
  proof: `${rating} on Google`,
  proofCount: `${reviews} reviews`,
  proofLabel: `Rated ${rating} from ${reviews} Google reviews. Read them on Google`,
};
