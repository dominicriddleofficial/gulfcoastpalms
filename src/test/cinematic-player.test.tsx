import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CinematicHero from "@/components/cinematic/CinematicHero";

const media = { mobile: { mp4: "/m.mp4" }, desktop: { mp4: "/d.mp4" } };
let resolvePlay: (() => void) | null = null;
let rejectPlay: ((e: Error) => void) | null = null;
const pauseSpy = vi.fn();

beforeEach(() => {
  pauseSpy.mockReset();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function () {
    return new Promise<void>((res, rej) => { resolvePlay = res; rejectPlay = rej; });
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    pauseSpy();
    this.dispatchEvent(new Event("pause"));
  });
});
afterEach(() => vi.restoreAllMocks());

const setup = () => render(<MemoryRouter><CinematicHero media={media} /></MemoryRouter>);
const loadPoster = () => fireEvent.load(screen.getByRole("img", { name: /service visualization/i }));

describe("cinematic player", () => {
  it("does not mount the film until the poster has loaded", () => {
    setup();
    expect(screen.queryByTestId("cinematic-video")).toBeNull();
    loadPoster();
    expect(screen.getByTestId("cinematic-video")).toBeTruthy();
  });

  it("keeps the poster visible when autoplay is blocked", async () => {
    setup();
    loadPoster();
    await act(async () => { rejectPlay?.(new Error("NotAllowedError")); });
    const video = screen.getByTestId("cinematic-video");
    expect(video.getAttribute("data-frame-shown")).toBe("false");
    expect(video.className).toContain("opacity-0");
    expect(screen.getByRole("img", { name: /service visualization/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /play film/i })).toBeTruthy();
  });

  it("hides the film layer after a load error", async () => {
    setup();
    loadPoster();
    fireEvent.error(screen.getByTestId("cinematic-video"));
    expect(screen.queryByTestId("cinematic-video")).toBeNull();
    expect(screen.queryByRole("button", { name: /play film/i })).toBeNull();
  });

  it("honours a pause pressed while play() is still pending", async () => {
    setup();
    loadPoster();
    fireEvent.click(screen.getByRole("button", { name: /pause film/i }));
    pauseSpy.mockClear();
    await act(async () => { resolvePlay?.(); });
    expect(pauseSpy).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /play film/i })).toBeTruthy();
  });

  it("does not restart on tab return after the visitor paused", async () => {
    setup();
    loadPoster();
    await act(async () => { resolvePlay?.(); });
    fireEvent.click(screen.getByRole("button", { name: /pause film/i }));
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    play.mockClear();
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(play).not.toHaveBeenCalled();
  });

  describe("breakpoint source swap", () => {
    let desktop = false;
    const listeners: Array<() => void> = [];
    beforeEach(() => {
      desktop = false;
      listeners.length = 0;
      vi.spyOn(window, "matchMedia").mockImplementation((q: string) => ({
        get matches() { return q.includes("min-width: 768px") ? desktop : false; },
        media: q, onchange: null,
        addEventListener: (_: string, l: () => void) => { if (q.includes("min-width")) listeners.push(l); },
        removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
      }) as unknown as MediaQueryList);
    });
    const seekable = (v: HTMLElement, t: number) => {
      let cur = t;
      Object.defineProperty(v, "currentTime", { configurable: true, get: () => cur, set: (x: number) => { cur = x; } });
      Object.defineProperty(v, "duration", { configurable: true, get: () => 15.5 });
      return () => cur;
    };
    const cross = async () => { desktop = true; await act(async () => { listeners.forEach((l) => l()); }); };

    it("swaps to one new source while paused, keeps the position and does not resume", async () => {
      setup();
      loadPoster();
      const first = screen.getByTestId("cinematic-video") as HTMLVideoElement;
      expect(first.getAttribute("src")).toBe("/m.mp4");
      await act(async () => { resolvePlay?.(); });
      fireEvent.click(screen.getByRole("button", { name: /pause film/i }));
      seekable(first, 6);
      const play = vi.mocked(HTMLMediaElement.prototype.play);
      play.mockClear();
      await cross();
      const next = screen.getByTestId("cinematic-video") as HTMLVideoElement;
      expect(next.getAttribute("src")).toBe("/d.mp4");
      expect(screen.getAllByTestId("cinematic-video")).toHaveLength(1);
      expect(next.getAttribute("data-frame-shown")).toBe("false");
      const time = seekable(next, 0);
      fireEvent.loadedMetadata(next);
      expect(time()).toBe(6);
      expect(play).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /play film/i })).toBeTruthy();
    });

    it("swaps while playing and continues from the same story position", async () => {
      setup();
      loadPoster();
      const first = screen.getByTestId("cinematic-video") as HTMLVideoElement;
      await act(async () => { resolvePlay?.(); });
      Object.defineProperty(first, "paused", { configurable: true, get: () => false });
      seekable(first, 9);
      const play = vi.mocked(HTMLMediaElement.prototype.play);
      play.mockClear();
      await cross();
      const next = screen.getByTestId("cinematic-video") as HTMLVideoElement;
      expect(next.getAttribute("src")).toBe("/d.mp4");
      const time = seekable(next, 0);
      fireEvent.loadedMetadata(next);
      expect(time()).toBe(9);
      expect(play).toHaveBeenCalledTimes(1);
    });
  });
});
