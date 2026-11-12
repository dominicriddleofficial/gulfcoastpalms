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

const REDUCE = "(prefers-reduced-motion: reduce)";
/** Must match the <picture> media breakpoint in CinematicHero. */
const DESKTOP = "(min-width: 768px)";

function saveData() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

/**
 * One responsive silent film per device. The poster is the critical image: the video
 * mounts only once the poster has loaded (or failed) AND the hero is on screen, and the
 * video layer becomes visible only after a real frame has been presented. Manual pause,
 * hidden tabs, offscreen, reduced motion and the end of the film are never overridden.
 */
export function useCinematicPlayer({ mobile, desktop, chapters }: Options) {
  const videoRef = useRef<FrameVideo | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  /** Slim progress bar driven directly from media time (transform only, no re-render/layout). */
  const progressRef = useRef<HTMLElement | null>(null);
  const [source, setSource] = useState<CinematicSource | undefined>();
  const [state, setState] = useState<PlayerState>("poster");
  const [chapter, setChapter] = useState(chapters[0]?.id ?? "");
  const [stillOnly, setStillOnly] = useState(true);
  const [posterSettled, setPosterSettled] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [frameShown, setFrameShown] = useState(false);
  const [userStarted, setUserStarted] = useState(false);

  const manualPause = useRef(false);
  const ended = useRef(false);
  const visibleRef = useRef(true);
  const stillRef = useRef(true);
  stillRef.current = stillOnly && !userStarted;

  /** Position carried across a breakpoint source swap (seconds), plus whether it was playing. */
  const pendingSwap = useRef<{ time: number; resume: boolean; ended: boolean } | null>(null);

  // Pick exactly one source for this device (never both), reduced-motion aware.
  useEffect(() => {
    const mq = window.matchMedia?.(REDUCE);
    const pick = (isDesktop: boolean) => (isDesktop ? desktop ?? mobile : mobile ?? desktop);
    const bp = window.matchMedia?.(DESKTOP);
    const chosen = pick(bp?.matches ?? true);
    setSource(chosen);
    setStillOnly(!chosen || (mq?.matches ?? false) || saveData());

    // Only an actual breakpoint change swaps the source; the old film is dropped and the
    // new one resumes at the same story position (or stays paused / ended as it was).
    const onBreakpoint = () => {
      const next = pick(bp?.matches ?? true);
      setSource((cur) => {
        if (!next || cur?.mp4 === next.mp4) return cur;
        const v = videoRef.current;
        if (v) {
          pendingSwap.current = { time: v.currentTime || 0, resume: !v.paused && !v.ended, ended: ended.current };
          v.pause();
          v.removeAttribute("src");
          v.load();
        }
        setFrameShown(false);
        return next;
      });
    };
    bp?.addEventListener?.("change", onBreakpoint);

    const onReduce = () => {
      if (mq?.matches) {
        setStillOnly(true);
        manualPause.current = true;
        videoRef.current?.pause();
      }
    };
    mq?.addEventListener?.("change", onReduce);
    return () => {
      bp?.removeEventListener?.("change", onBreakpoint);
      mq?.removeEventListener?.("change", onReduce);
    };
  }, [mobile, desktop]);

  const canAutoplay = () =>
    !manualPause.current && !ended.current && visibleRef.current && !document.hidden && !stillRef.current;

  const attemptPlay = useCallback((userGesture: boolean) => {
    const v = videoRef.current;
    if (!v) return;
    if (!userGesture && !canAutoplay()) return;
    setState((s) => (s === "playing" ? s : "loading"));
    const p = v.play();
    if (!p || typeof p.then !== "function") return;
    p.then(
      () => {
        // A pause requested while play() was pending wins.
        if (manualPause.current || !visibleRef.current || document.hidden) v.pause();
      },
      () => setState((s) => (s === "error" ? s : "paused")),
    );
  }, []);

  // Pause offscreen; resume on return only if allowed.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      visibleRef.current = e.isIntersecting;
      setOnScreen(e.isIntersecting);
      const v = videoRef.current;
      if (!v) return;
      if (!e.isIntersecting) { if (!v.paused) v.pause(); }
      else if (v.paused) attemptPlay(false);
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [attemptPlay]);

  useEffect(() => {
    const onVis = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) { if (!v.paused) v.pause(); }
      else if (v.paused) attemptPlay(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [attemptPlay]);

  const videoMounted = Boolean(source) && posterSettled && onScreen !== false && (!stillOnly || userStarted);
  // Keep the element once mounted so a paused frame is never thrown away.
  const [mountedOnce, setMountedOnce] = useState(false);
  useEffect(() => { if (videoMounted) setMountedOnce(true); }, [videoMounted]);
  const mounted = mountedOnce || videoMounted;

  // Frame presentation + chapter cueing from the media's own time.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !mounted) return;
    const update = (t: number) => {
      if (t > 0) setFrameShown(true);
      const d = v.duration;
      if (progressRef.current && Number.isFinite(d) && d > 0) {
        progressRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, t / d))})`;
      }
      setChapter((c) => { const n = chapterAt(t, chapters); return n === c ? c : n; });
    };
    const rvfc = v.requestVideoFrameCallback?.bind(v);
    if (rvfc) {
      let id = 0;
      let active = true;
      const tick = (_n: number, meta: { mediaTime: number }) => {
        setFrameShown(true);
        update(meta.mediaTime);
        if (active) id = rvfc(tick);
      };
      id = rvfc(tick);
      return () => { active = false; v.cancelVideoFrameCallback?.(id); };
    }
    const onTime = () => update(v.currentTime);
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [mounted, chapters, source]);

  // First autoplay attempt once the video element exists.
  useEffect(() => {
    if (mounted && !userStarted) attemptPlay(false);
  }, [mounted, userStarted, attemptPlay]);

  const handlers = {
    onLoadedMetadata: () => {
      const v = videoRef.current;
      const swap = pendingSwap.current;
      if (!v || !swap) return;
      pendingSwap.current = null;
      const d = Number.isFinite(v.duration) ? v.duration : swap.time;
      v.currentTime = swap.ended ? d : Math.min(swap.time, Math.max(0, d - 0.05));
      if (swap.resume && !manualPause.current && visibleRef.current && !document.hidden) attemptPlay(true);
    },
    /** A paused/ended swap presents its frame on seek; only then reveal the new layer. */
    onSeeked: () => {
      const v = videoRef.current;
      if (v && v.readyState >= 2) setFrameShown(true);
    },
    onPlaying: () => setState("playing"),
    onPause: () => { if (!ended.current) setState((s) => (s === "error" ? s : "paused")); },
    onEnded: () => {
      ended.current = true;
      setState("ended");
      setChapter(chapters[chapters.length - 1]?.id ?? "");
      if (progressRef.current) progressRef.current.style.transform = "scaleX(1)";
    },
    onError: () => { setState("error"); setFrameShown(false); },
    onWaiting: () => setState((s) => (s === "playing" ? "loading" : s)),
  };

  const play = useCallback(() => {
    manualPause.current = false;
    if (!videoRef.current) { setUserStarted(true); return; }
    attemptPlay(true);
  }, [attemptPlay]);
  // When the visitor asked for playback before the element existed, start it on mount.
  useEffect(() => { if (userStarted && mounted) attemptPlay(true); }, [userStarted, mounted, attemptPlay]);

  const pause = useCallback(() => {
    manualPause.current = true;
    videoRef.current?.pause();
    setState((s) => (s === "loading" || s === "playing" ? "paused" : s));
  }, []);

  const replay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    manualPause.current = false;
    ended.current = false;
    v.currentTime = 0;
    if (progressRef.current) progressRef.current.style.transform = "scaleX(0)";
    setChapter(chapters[0]?.id ?? "");
    attemptPlay(true);
  }, [chapters, attemptPlay]);

  const onPosterSettled = useCallback(() => setPosterSettled(true), []);

  return {
    videoRef, containerRef, progressRef, source, state, chapter, handlers, play, pause, replay, onPosterSettled,
    /** Real media exists and has not failed (never render a fake play button otherwise). */
    hasMedia: Boolean(source) && state !== "error",
    videoMounted: mounted && state !== "error",
    /** The video layer is shown only after a real frame has been presented. */
    showVideo: frameShown && state !== "error",
    posterSettled,
    stillOnly,
  };
}
