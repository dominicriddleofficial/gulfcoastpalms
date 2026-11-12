import { describe, expect, it } from "vitest";
import { cinematicPosterPreloads, renderCinematicShell } from "@/components/cinematic/cinematicShell";
import { cinematicCopy, cinematicPortraitPoster, cinematicPoster, cinematicServices } from "@/data/cinematicHero";

const doc = () => {
  const d = document.implementation.createHTMLDocument("t");
  d.body.innerHTML = renderCinematicShell();
  return d;
};

describe("cinematic preview first view (prerendered)", () => {
  it("has the real single H1 and working quote, service, call and text links", () => {
    const d = doc();
    const h1s = d.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe(cinematicCopy.title);
    expect(d.querySelector('#seo-static-content a.cine-quote')?.getAttribute("href")).toBe("/quote");
    const cardHrefs = [...d.querySelectorAll(".cine-journey a.cs-card")].map((a) => a.getAttribute("href"));
    expect(cardHrefs).toEqual(cinematicServices.map((s) => s.quoteHref));
    expect(d.querySelector('a[href^="tel:"]')).toBeTruthy();
    expect(d.querySelector('a[href^="sms:"]')).toBeTruthy();
  });

  it("draws no play, pause or menu control before they work", () => {
    expect(doc().querySelectorAll("button")).toHaveLength(0);
  });

  it("uses the film first-frame posters with one preload per device", () => {
    const d = doc();
    const img = d.querySelector("img.cine-frame");
    expect(img?.getAttribute("width")).toBe(String(cinematicPoster.width));
    expect(d.querySelector('source[media="(max-width: 767px)"][type="image/avif"]')?.getAttribute("srcset")).toBe(cinematicPortraitPoster.avif);
    const p = cinematicPosterPreloads();
    expect(p.match(/rel="preload"/g)).toHaveLength(2);
    expect(p).toContain('media="(max-width: 767px)"');
    expect(p).toContain('media="(min-width: 768px)"');
  });
});
