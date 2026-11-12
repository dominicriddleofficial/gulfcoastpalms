import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { buildRouteMeta, rawRoutes } from "@/seo/routes.data.mjs";
import { isTrackablePath } from "@/lib/analytics";
import { chapterAt, cinematicChapters, cinematicMedia, cinematicServices } from "@/data/cinematicHero";
import CinematicHero from "@/components/cinematic/CinematicHero";

describe("cinematic homepage preview", () => {
  it("is noindex, canonical to / and left out of the sitemap", () => {
    const m = buildRouteMeta().find((r) => r.path === "/preview/cinematic-home");
    expect(m?.noindex).toBe(true);
    expect(m?.canonical).toBe("https://gulfcoastpalmservices.com/");
    const indexable = rawRoutes.filter((r) => r.noindex !== true).map((r) => r.path);
    expect(indexable).not.toContain("/preview/cinematic-home");
  });

  it("leaves the homepage metadata unchanged", () => {
    const home = buildRouteMeta().find((r) => r.path === "/");
    expect(home?.title).toBe("Gulf Coast Palms | Tree Services & Palm Care on the Emerald Coast");
    expect(home?.canonical).toBe("https://gulfcoastpalmservices.com/");
    expect(home?.noindex).toBe(false);
  });

  it("is not tracked by site analytics", () => {
    expect(isTrackablePath("/preview/cinematic-home")).toBe(false);
    expect(isTrackablePath("/")).toBe(true);
  });

  it("routes the two services to the existing quote form values", () => {
    expect(cinematicServices.map((s) => s.quoteHref)).toEqual([
      "/quote?service=Tree+Removal&source=hero_cinematic_tree",
      "/quote?service=Palm+Tree+Trimming&source=hero_cinematic_palm",
    ]);
  });

  it("cues chapters from media time", () => {
    const ch = [{ id: "a", start: 0 }, { id: "b", start: 4 }, { id: "c", start: 9 }];
    expect(chapterAt(0, ch)).toBe("a");
    expect(chapterAt(4.01, ch)).toBe("b");
    expect(chapterAt(30, ch)).toBe("c");
  });

  it("shows the real heading and no play control while there is no film", () => {
    render(<MemoryRouter><CinematicHero media={{}} /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Tree Removal & Palm Tree Trimming");
    expect(screen.queryByRole("button", { name: /play film/i })).toBeNull();
    expect(screen.getByText(/service visualization/i)).toBeTruthy();
  });

  it("uses the reviewed chapter starts on one shared timeline", () => {
    expect(cinematicChapters.map((c) => [c.id, c.start])).toEqual([
      ["property", 0], ["palm", 2.5], ["removal", 8.5], ["reveal", 14],
    ]);
    expect(chapterAt(2.4)).toBe("property");
    expect(chapterAt(2.5)).toBe("palm");
    expect(chapterAt(8.49)).toBe("palm");
    expect(chapterAt(8.5)).toBe("removal");
    expect(chapterAt(14)).toBe("reveal");
  });

  it("has exactly one film per device and the corrected service wording", () => {
    expect(cinematicMedia.mobile?.mp4).toMatch(/canopy-film-portrait-720\.mp4$/);
    expect(cinematicMedia.desktop?.mp4).toMatch(/canopy-film-desktop-1600\.mp4$/);
    const copy = cinematicServices.map((s) => s.detail).join(" ");
    expect(copy).not.toMatch(/storm/i);
    expect(cinematicServices.map((s) => s.detail)).toEqual([
      "Tree removal planned around your property.",
      "Careful trimming for a clean, natural canopy.",
    ]);
  });

  it("offers a real Play control when a film exists but autoplay has not started", () => {
    render(<MemoryRouter><CinematicHero /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /play film/i })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /free quote/i }).length).toBeGreaterThan(0);
  });
});
