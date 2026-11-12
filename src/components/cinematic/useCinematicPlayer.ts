import { useCallback, useEffect, useRef, useState } from "react";
import { chapterAt, type CinematicSource } from "@/data/cinematicHero";

export type PlayerState = "poster" | "loading" | "playing" | "paused" | "ended" | "error";

interface Options {
  mobile?: CinematicSource;
  desktop?: CinematicSource;
  chapters: ReadonlyArray<{ id: string; start: number }>;
}

type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

function prefersStill() {
  if (typeof window === "undefined") return true;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return reduce || conn?.saveData === true;
}

/**
 * One responsive silent film, deferred until the poster is shown and the hero is
 * visible. Pauses offscreen / in hidden tabs, respects manual pause, never loops,
 * and cues chapters from the media's own time.
 */
export function useCinematicPlayer({ mobile, desktop, chapters }: Options) {
  const videoRef = useRef<FrameVideo | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const [source, setSource] = useState<CinematicSource | undefined>();
  const [state, setState] = useState<PlayerState>("poster");
  const [chapter, setChapter] = useState(chapters[0]?.id ?? "");
  const [stillOnly, setStillOnly] = useState(true);
  const [armed, setArmed] = useState(false);
  const manualPause = useRef(false);
  const visible = useRef(true);

  // Pick exactly one source for this device (never both).
  useEffect(() => {
    const isDesktop = window.matchMedia?.("(min-width: 768px)").matches ?? true;
    const chosen = isDesktop ? desktop ?? mobile : mobile ?? desktop;
    setSource(chosen);
    setStillOnly(!chosen || prefersStill());
  }, [mobile, desktop]);

  // Defer video bytes until the hero is on screen.
  useEffect(() => {
    if (!source || stillOnly) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setArmed(true); return; }
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      visible.current = e.isIntersecting;
      if (e.isIntersecting) setArmed(true);
      const v = videoRef.current;
      if (!v || !armed) return;
      if (!e.isIntersecting && !v.paused) v.pause();
      else if (e.isIntersecting && v.paused && !manualPause.current && state === "paused") void v.play().catch(() => undefined);
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [source, stillOnly, armed, state]);

  // Hidden tab pauses; returning resumes unless the visitor paused.
  useEffect(() => {
    const onVis = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) { if (!v.paused) v.pause(); }
      else if (visible.current && !manualPause.current && v.paused && !v.ended && armed) void v.play().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [armed]);

  // Chapter cueing from actual media time.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !armed) return;
    let id = 0;
    const update = (t: number) => setChapter((c) => { const n = chapterAt(t, chapters); return n === c ? c : n; });
    const rvfc = v.requestVideoFrameCallback?.bind(v);
    if (rvfc) {
      const tick = (_n: number, meta: { mediaTime: number }) => { update(meta.mediaTime); id = rvfc(tick); };
      id = rvfc(tick);
      return () => v.cancelVideoFrameCallback?.(id);
    }
    const onTime = () => update(v.currentTime);
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [armed, chapters]);

  const handlers = {
    onPlaying: () => setState("playing"),
    onPause: () => { const v = videoRef.current; if (v && !v.ended) setState("paused"); },
    onEnded: () => setState("ended"),
    onError: () => setState("error"),
    onWaiting: () => setState((s) => (s === "playing" ? s : "loading")),
  };

  // Attempt autoplay once armed; blocked autoplay leaves the still and a play control.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !armed) return;
    setState("loading");
    v.play().catch(() => setState("paused"));
  }, [armed]);

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) { if (source) { setStillOnly(false); setArmed(true); } return; }
    manualPause.current = false;
    void v.play().catch(() => setState("paused"));
  }, [source]);
  const pause = useCallback(() => { manualPause.current = true; videoRef.current?.pause(); }, []);
  const replay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    manualPause.current = false;
    v.currentTime = 0;
    setChapter(chapters[0]?.id ?? "");
    void v.play().catch(() => setState("paused"));
  }, [chapters]);

  return {
    videoRef, containerRef, source, state, chapter, handlers, play, pause, replay,
    /** True when there is real media to show (never render a fake play button otherwise). */
    hasMedia: Boolean(source) && state !== "error",
    videoMounted: Boolean(source) && armed && !stillOnly,
    stillOnly,
  };
}
