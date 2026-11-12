import p828a from "@/assets/cinematic/canopy-poster-828.avif.asset.json";
import p828w from "@/assets/cinematic/canopy-poster-828.webp.asset.json";
import p828j from "@/assets/cinematic/canopy-poster-828.jpg.asset.json";
import p1280a from "@/assets/cinematic/canopy-poster-1280.avif.asset.json";
import p1280w from "@/assets/cinematic/canopy-poster-1280.webp.asset.json";
import p1280j from "@/assets/cinematic/canopy-poster-1280.jpg.asset.json";
import p1920a from "@/assets/cinematic/canopy-poster-1920.avif.asset.json";
import p1920w from "@/assets/cinematic/canopy-poster-1920.webp.asset.json";
import p1920j from "@/assets/cinematic/canopy-poster-1920.jpg.asset.json";
import q640a from "@/assets/cinematic/canopy-portrait-640.avif.asset.json";
import q640w from "@/assets/cinematic/canopy-portrait-640.webp.asset.json";
import q640j from "@/assets/cinematic/canopy-portrait-640.jpg.asset.json";
import q828a from "@/assets/cinematic/canopy-portrait-828.avif.asset.json";
import q828w from "@/assets/cinematic/canopy-portrait-828.webp.asset.json";
import q828j from "@/assets/cinematic/canopy-portrait-828.jpg.asset.json";
import q1170a from "@/assets/cinematic/canopy-portrait-1170.avif.asset.json";
import q1170w from "@/assets/cinematic/canopy-portrait-1170.webp.asset.json";
import q1170j from "@/assets/cinematic/canopy-portrait-1170.jpg.asset.json";

/** Route of the hidden, noindex cinematic homepage preview. */
export const CINEMATIC_PREVIEW_PATH = "/preview/cinematic-home";

const set = (a: string, b: string, c: string) => `${a} 828w, ${b} 1280w, ${c} 1920w`;

/** Temporary approved still (2688x1520 source), encoded locally. */
export const cinematicPoster = {
  width: 2688,
  height: 1520,
  avif: set(p828a.url, p1280a.url, p1920a.url),
  webp: set(p828w.url, p1280w.url, p1920w.url),
  jpg: set(p828j.url, p1280j.url, p1920j.url),
  fallback: p1280j.url,
  alt: "Service visualization: a Florida property with a tall palm and a large live oak",
};

const pset = (a: string, b: string, c: string) => `${a} 640w, ${b} 828w, ${c} 1170w`;

/** Native portrait still (1520x2688) for phones: same property, full trees and house. */
export const cinematicPortraitPoster = {
  width: 1520,
  height: 2688,
  avif: pset(q640a.url, q828a.url, q1170a.url),
  webp: pset(q640w.url, q828w.url, q1170w.url),
  jpg: pset(q640j.url, q828j.url, q1170j.url),
};

export interface CinematicSource {
  /** Silent, correctly edited H.264 MP4 played at 1x. */
  mp4: string;
  /** Optional first-frame poster for this device's film. */
  poster?: string;
}

/** One film per device. Empty until the reviewed motion files are supplied. */
export const cinematicMedia: { mobile?: CinematicSource; desktop?: CinematicSource } = {};

/** Story chapters cued from the film's own media time (seconds). */
export const cinematicChapters = [
  { id: "property", start: 0, label: "The property" },
  { id: "palm", start: 0, label: "Precision palm care" },
  { id: "removal", start: 0, label: "Sectional tree removal" },
  { id: "reveal", start: 0, label: "Room for what's next" },
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
    title: "Tree Removal",
    detail: "Controlled, sectional removal of oaks and pines.",
    quoteService: "Tree Removal",
    placement: "hero_cinematic_tree",
    quoteHref: quoteHref("Tree Removal", "hero_cinematic_tree"),
    pageHref: "/services/tree-removal",
  },
  {
    id: "palm",
    title: "Palm Tree Trimming",
    detail: "Clean, healthy cuts that keep palms storm-ready.",
    quoteService: "Palm Tree Trimming",
    placement: "hero_cinematic_palm",
    quoteHref: quoteHref("Palm Tree Trimming", "hero_cinematic_palm"),
    pageHref: "/services/palm-tree-trimming",
  },
] as const;
