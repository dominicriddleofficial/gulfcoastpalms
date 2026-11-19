/**
 * What sits behind every page, fixed to the screen: the backend's fine grid at the top
 * and its fade across the bottom half (styles/first-view.css, ".rd-atmos").
 *
 * On a mouse, the grid lines near the pointer show a little stronger. Nothing else here
 * moves, and nothing here can be clicked.
 */
import { useEffect, useRef } from "react";

export default function Atmosphere() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const place = () => {
      frame = 0;
      el.style.setProperty("--gx", `${x}px`);
      el.style.setProperty("--gy", `${y}px`);
      // The grid only reaches a little way down the screen; below that there is nothing to light.
      el.style.setProperty("--rd-near", y < 620 ? "1" : "0");
    };
    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(place);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="rd-atmos" aria-hidden="true" ref={root}>
      <div className="rd-atmos__grid" />
      <div className="rd-atmos__fade" />
    </div>
  );
}
