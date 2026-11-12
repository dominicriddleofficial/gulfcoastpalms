import d960a from "@/assets/cinematic/canopy-first-frame-960.avif.asset.json";
import d960w from "@/assets/cinematic/canopy-first-frame-960.webp.asset.json";
import d960j from "@/assets/cinematic/canopy-first-frame-960.jpg.asset.json";
import d1280a from "@/assets/cinematic/canopy-first-frame-1280.avif.asset.json";
import d1280w from "@/assets/cinematic/canopy-first-frame-1280.webp.asset.json";
import d1280j from "@/assets/cinematic/canopy-first-frame-1280.jpg.asset.json";
import d1600a from "@/assets/cinematic/canopy-first-frame-1600.avif.asset.json";
import d1600w from "@/assets/cinematic/canopy-first-frame-1600.webp.asset.json";
import d1600j from "@/assets/cinematic/canopy-first-frame-1600.jpg.asset.json";
import m480a from "@/assets/cinematic/canopy-first-frame-portrait-480.avif.asset.json";
import m480w from "@/assets/cinematic/canopy-first-frame-portrait-480.webp.asset.json";
import m480j from "@/assets/cinematic/canopy-first-frame-portrait-480.jpg.asset.json";
import m720a from "@/assets/cinematic/canopy-first-frame-portrait-720.avif.asset.json";
import m720w from "@/assets/cinematic/canopy-first-frame-portrait-720.webp.asset.json";
import m720j from "@/assets/cinematic/canopy-first-frame-portrait-720.jpg.asset.json";
import filmDesktop from "@/assets/cinematic/canopy-film-desktop-1600.mp4.asset.json";
import filmPortrait from "@/assets/cinematic/canopy-film-portrait-720.mp4.asset.json";

/** Route of the hidden, noindex cinematic homepage preview. */
export const CINEMATIC_PREVIEW_PATH = "/preview/cinematic-home";

const set = (a: string, b: string, c: string) => `${a} 960w, ${b} 1280w, ${c} 1600w`;

/** Exact first frame of the desktop film (1600x904), so poster and film never differ. */
export const cinematicPoster = {
  width: 1600,
  height: 904,
  avif: set(d960a.url, d1280a.url, d1600a.url),
  webp: set(d960w.url, d1280w.url, d1600w.url),
  jpg: set(d960j.url, d1280j.url, d1600j.url),
  fallback: d1280j.url,
  alt: "Service visualization: a Florida property with a tall palm and a large live oak",
};

const pset = (a: string, b: string) => `${a} 480w, ${b} 720w`;

/** Exact first frame of the portrait film (720x1276); never upscaled past the film. */
export const cinematicPortraitPoster = {
  width: 720,
  height: 1276,
  avif: pset(m480a.url, m720a.url),
  webp: pset(m480w.url, m720w.url),
  jpg: pset(m480j.url, m720j.url),
};

export interface CinematicSource {
  /** Silent, correctly edited H.264 MP4 played at 1x. */
  mp4: string;
  /** Optional first-frame poster for this device's film. */
  poster?: string;
}

/** One reviewed film per device (silent H.264, 24fps, 15.5s, faststart, played once at 1x). */
export const cinematicMedia: { mobile?: CinematicSource; desktop?: CinematicSource } = {
  mobile: { mp4: filmPortrait.url },
  desktop: { mp4: filmDesktop.url },
};

/** Total film length in seconds (both edits share one timeline). */
export const CINEMATIC_FILM_SECONDS = 15.5;

/** Story chapters cued from the film's own media time (seconds). */
export const cinematicChapters = [
  { id: "property", start: 0, label: "The property" },
  { id: "palm", start: 2.5, label: "Palm trimming" },
  { id: "removal", start: 8.5, label: "Tree removal" },
  { id: "reveal", start: 14.0, label: "Room for what's next" },
] as const;

export type CinematicChapterId = (typeof cinematicChapters)[number]["id"];

/** Chapter active at a given media time; chapters must be sorted by start. */
export function chapterAt(time: number, chapters: ReadonlyArray<{ id: string; start: number }> = cinematicChapters): string {
  let current = chapters[0]?.id ?? "";
  for (const c of chapters) if (time >= c.start) current = c.id;
  return current;
}

const quoteHref = (service: string, source: string) => `/quote?${new URLSearchParams({ service, source }).toString()}`;

/** Two equal service paths; values match existing quote-form labels and SEO pages. */
export const cinematicServices = [
  {
    id: "tree",
    chapter: "removal",
    title: "Tree Removal",
    shortTitle: "Tree removal",
    detail: "Tree removal planned around your property.",
    quoteService: "Tree Removal",
    placement: "hero_cinematic_tree",
    quoteHref: quoteHref("Tree Removal", "hero_cinematic_tree"),
    pageHref: "/services/tree-removal",
  },
  {
    id: "palm",
    chapter: "palm",
    title: "Palm Tree Trimming",
    /** Compact label for short phones only; quote value is unchanged. */
    shortTitle: "Palm trimming",
    detail: "Careful trimming for a clean, natural canopy.",
    quoteService: "Palm Tree Trimming",
    placement: "hero_cinematic_palm",
    quoteHref: quoteHref("Palm Tree Trimming", "hero_cinematic_palm"),
    pageHref: "/services/palm-tree-trimming",
  },
] as const;
