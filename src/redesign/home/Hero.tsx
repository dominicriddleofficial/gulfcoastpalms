/**
 * Opening screen: a before and an after of the same date palm, with the headline in
 * the panel beside it.
 *
 * The two photos are stacked. The "before" is cut off at a divider that starts on the
 * trunk; a visitor drags across the photo (or uses the arrow keys) to move it. Before
 * any script has loaded, the photo simply shows half of each, which is a finished
 * picture in its own right.
 *
 * Styles live in styles/first-view.css. This file avoids browser-only code at render
 * time because the build also renders it into the page's first HTML.
 */
import { useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { GOOGLE_BUSINESS_URL, GCP_BUSINESS } from "@/lib/business-info";
import { HERO_WIDE, heroCopy, heroReveal, treeFrame, type HeroShot } from "../data/hero";
import { CallLink, QuoteLink, TextLink } from "../lib/actions";
import { CameraIcon, PhoneIcon, StarIcon } from "../lib/icons";

/** Lower-case attribute: React 18 passes it through as written and browsers read it. */
const HIGH_PRIORITY = { fetchpriority: "high" } as Record<string, string>;

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** One photo of the pair: the wide crop on wide screens, the shorter crop on phones. */
function Shot({ shot }: { shot: HeroShot }) {
  return (
    <picture>
      <source media={HERO_WIDE} type="image/avif" srcSet={shot.wide.avif} sizes={shot.wide.sizes} width={shot.wide.width} height={shot.wide.height} />
      <source media={HERO_WIDE} srcSet={shot.wide.jpg} sizes={shot.wide.sizes} width={shot.wide.width} height={shot.wide.height} />
      <source type="image/avif" srcSet={shot.phone.avif} sizes={shot.phone.sizes} />
      <img
        src={shot.phone.fallback}
        srcSet={shot.phone.jpg}
        sizes={shot.phone.sizes}
        width={shot.phone.width}
        height={shot.phone.height}
        alt={shot.alt}
        loading="eager"
        decoding="async"
        draggable={false}
        {...HIGH_PRIORITY}
      />
    </picture>
  );
}

export default function Hero() {
  const frame = useRef<HTMLDivElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: number; x: number; moved: boolean } | null>(null);
  const used = useRef(false);

  /** Moves the divider. Written straight to the page so dragging stays smooth. */
  const apply = useCallback((percent: number, byVisitor = true) => {
    const cut = clamp(percent);
    frame.current?.style.setProperty("--cut", `${cut}%`);
    if (range.current) {
      range.current.value = String(Math.round(cut));
      range.current.setAttribute("aria-valuetext", `${Math.round(cut)} percent before, ${100 - Math.round(cut)} percent after`);
    }
    (window as Window & { __gcpCut?: number }).__gcpCut = cut;
    if (byVisitor && !used.current) {
      used.current = true;
      trackEvent("before_after_used", { placement: "hero" });
    }
  }, []);

  // Carries over a position chosen before the app had loaded (see firstView.tsx).
  useEffect(() => {
    const early = (window as Window & { __gcpCut?: number }).__gcpCut;
    if (typeof early === "number" && early !== heroReveal.start) apply(early, false);
  }, [apply]);

  const at = (clientX: number) => {
    const box = frame.current?.getBoundingClientRect();
    return box && box.width ? ((clientX - box.left) / box.width) * 100 : heroReveal.start;
  };

  return (
    <section className="rd-hero" aria-labelledby="rd-hero-title">
      <div
        className="rd-hero__photo"
        ref={frame}
        data-rd-reveal
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          if ((e.target as Element).closest("a")) return;
          drag.current = { id: e.pointerId, x: e.clientX, moved: false };
          // A mouse press moves the divider at once. A finger waits to see whether this is a sideways drag or a scroll.
          if (e.pointerType === "mouse") {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current.moved = true;
            apply(at(e.clientX));
          }
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          if (!d.moved) {
            if (Math.abs(e.clientX - d.x) < 6) return;
            d.moved = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          apply(at(e.clientX));
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          // A plain tap moves the divider to where it landed.
          if (d && d.id === e.pointerId && !d.moved && !(e.target as Element).closest("a")) apply(at(e.clientX));
        }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <div className="rd-hero__layer">
          <div className="rd-hero__stage"><Shot shot={heroReveal.after} /></div>
          <span className="rd-hero__tag rd-hero__tag--after" aria-hidden="true">{heroReveal.after.label}</span>
        </div>
        <div className="rd-hero__layer rd-hero__layer--before">
          <div className="rd-hero__stage"><Shot shot={heroReveal.before} /></div>
          <span className="rd-hero__tag rd-hero__tag--before" aria-hidden="true">{heroReveal.before.label}</span>
        </div>
        <input
          ref={range}
          className="rd-hero__range"
          type="range"
          min={0}
          max={100}
          step={5}
          defaultValue={heroReveal.start}
          aria-label={heroReveal.control}
          onInput={(e) => apply(Number(e.currentTarget.value))}
        />
        <span className="rd-hero__divider" aria-hidden="true">
          <span className="rd-hero__handle">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l-5 6 5 6M15 6l5 6-5 6" />
            </svg>
          </span>
        </span>
        <Link className="rd-hero__inset" to={treeFrame.to}>
          <picture>
            <source type="image/avif" srcSet={treeFrame.avif} sizes={treeFrame.sizes} />
            <img
              src={treeFrame.fallback}
              srcSet={treeFrame.jpg}
              sizes={treeFrame.sizes}
              width={treeFrame.width}
              height={treeFrame.height}
              alt={treeFrame.alt}
              decoding="async"
              draggable={false}
            />
          </picture>
          <span>{treeFrame.label}</span>
        </Link>
        <div className="rd-hero__cap">
          <p>{heroCopy.hint}</p>
        </div>
      </div>

      <div className="rd-hero__panel">
        <h1 id="rd-hero-title" className="rd-hero__title">
          <span>{heroCopy.lines[0]}</span>{" "}
          <span>{heroCopy.lines[1]}</span>{" "}
          <span>{heroCopy.lines[2]}</span>{" "}
          <span className="rd-hero__place">{heroCopy.place}</span>
        </h1>
        <p className="rd-hero__facts">
          <span>{heroCopy.base}</span>
          <a
            className="rd-hero__stars rd-link"
            href={GOOGLE_BUSINESS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${heroCopy.rating}. Read them on Google`}
          >
            <StarIcon size={15} />
            {heroCopy.rating}
          </a>
        </p>
        <div className="rd-hero__actions" data-rd-actions>
          <QuoteLink placement="hero" className="rd-btn rd-btn--go" />
          <CallLink placement="hero" className="rd-btn rd-btn--line" ariaLabel={`Call ${GCP_BUSINESS.phoneDisplay}`}>
            <PhoneIcon size={18} />
            <span>Call<span className="rd-hero__num"> {GCP_BUSINESS.phoneDisplay}</span></span>
          </CallLink>
          <TextLink placement="hero" className="rd-btn rd-btn--line">
            <CameraIcon size={18} />
            Text a photo
          </TextLink>
        </div>
      </div>
    </section>
  );
}
