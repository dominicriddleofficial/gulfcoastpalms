import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { buildRouteMeta, rawRoutes } from "@/seo/routes.data.mjs";
import { isTrackablePath } from "@/lib/analytics";
import { chapterAt, cinematicServices } from "@/data/cinematicHero";
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
    render(<MemoryRouter><CinematicHero /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Tree Removal & Palm Tree Trimming");
    expect(screen.queryByRole("button", { name: /play film/i })).toBeNull();
    expect(screen.getByText(/service visualization/i)).toBeTruthy();
  });
});
