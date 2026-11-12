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
});
