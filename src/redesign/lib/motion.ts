/**
 * Homepage motion, in one place. Styles are in styles/site.css under "Motion".
 *
 * Three things happen here, all optional extras on top of a page that is complete
 * without them:
 *
 *   1. Arrivals. Blocks marked `data-rv` play a short entrance the first time they are
 *      scrolled to. A block is only held back if it is still below the screen when
 *      this starts, so nothing visible ever disappears and reappears.
 *   2. Depth. Photos marked `data-par` are given a number (--v, 0 to 1) for how far
 *      they have travelled up the screen, which the stylesheet turns into a slow drift.
 *   3. Pointer light. Panels marked `data-spot` are told where the mouse is over them.
 *
 * None of it runs for visitors who ask for less motion, or in a browser without the
 * needed features. In both cases the page simply shows everything as it is.
 */
import { useEffect } from "react";

const REDUCE = "(prefers-reduced-motion: reduce)";

/**
 * How long ago the prebuilt first screen was drawn, as a negative CSS time. Animations
 * that started in that first HTML use it to carry on from the same point when the app
 * takes the page over, instead of starting again. Undefined when there was no prebuilt
 * first screen (then animations simply start now).
 */
export function motionShift(): string | undefined {
  if (typeof window === "undefined" || typeof performance === "undefined") return undefined;
  const t0 = (window as Window & { __gcpT0?: number }).__gcpT0;
  if (typeof t0 !== "number") return undefined;
  return `${-Math.max(0, Math.round(performance.now() - t0))}ms`;
}

/** A figure as the page writes it: fixed decimals, and a comma in the thousands where the figure is marked data-group. */
const show = (el: HTMLElement, value: number) => {
  const fixed = value.toFixed(Number(el.dataset.decimals ?? 0));
  el.textContent = el.dataset.group ? fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : fixed;
};

/** Runs a figure up to its real value. The real value is what the page holds without this. */
export function countUp(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count);
    if (!Number.isFinite(end)) return;
    const from = Number(el.dataset.from ?? 0);
    const started = performance.now();
    const duration = 1500;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      show(el, t < 1 ? from + (end - from) * eased : end);
      if (t < 1) window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}

export function useHomeMotion(): void {
  useEffect(() => {
    if (typeof window.matchMedia !== "function" || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia(REDUCE).matches) return;
    const root = document.querySelector<HTMLElement>(".rd-main");
    if (!root) return;

    const timers: number[] = [];

    // 1. Arrivals
    const held: HTMLElement[] = [];
    const arrivals = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        arrivals.unobserve(el);
        el.setAttribute("data-rv", "in");
        countUp(el);
        timers.push(window.setTimeout(() => el.setAttribute("data-rv", "done"), 2800));
      }
    }, { rootMargin: "0px 0px -7% 0px", threshold: 0.01 });
    const screen = window.innerHeight;
    root.querySelectorAll<HTMLElement>("[data-rv]").forEach((el) => {
      if (el.getAttribute("data-rv")) return;
      const box = el.getBoundingClientRect();
      if (box.height === 0 || box.top < screen * 0.94) return;
      el.setAttribute("data-rv", "wait");
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((n) => show(n, Number(n.dataset.from ?? 0)));
      held.push(el);
      arrivals.observe(el);
    });

    // 2. Depth
    const moving = new Set<HTMLElement>();
    const depth = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) moving.add(entry.target as HTMLElement);
        else moving.delete(entry.target as HTMLElement);
      }
    }, { rootMargin: "12% 0px" });
    root.querySelectorAll<HTMLElement>("[data-par]").forEach((el) => depth.observe(el));
    let frame = 0;
    const place = () => {
      frame = 0;
      const h = window.innerHeight;
      moving.forEach((el) => {
        const box = el.getBoundingClientRect();
        const v = Math.min(1, Math.max(0, (h - box.top) / (h + box.height)));
        el.style.setProperty("--v", v.toFixed(3));
      });
    };
    const onScroll = () => { if (!frame && moving.size) frame = window.requestAnimationFrame(place); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // 3. Pointer light (mouse only)
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const onMove = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const panel = target && typeof target.closest === "function" ? target.closest<HTMLElement>("[data-spot]") : null;
      if (!panel) return;
      const box = panel.getBoundingClientRect();
      panel.style.setProperty("--mx", `${Math.round(event.clientX - box.left)}px`);
      panel.style.setProperty("--my", `${Math.round(event.clientY - box.top)}px`);
    };
    if (fine) root.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      arrivals.disconnect();
      depth.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (fine) root.removeEventListener("pointermove", onMove);
      // Anything still held back is shown, with its real figures.
      held.forEach((el) => {
        if (el.getAttribute("data-rv") !== "wait") return;
        el.setAttribute("data-rv", "");
        el.querySelectorAll<HTMLElement>("[data-count]").forEach((n) => show(n, Number(n.dataset.count)));
      });
    };
  }, []);
}
