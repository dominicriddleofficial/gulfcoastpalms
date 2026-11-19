/**
 * Opening screen, built like the business's own backend dashboard turned to face the
 * customer: a headline block, the three ways to reach the office, a framed panel that
 * shows the work, and four small cards of proof.
 *
 * The work panel has two scenes with a switch between them (the dashboard's
 * Week / Month control): the condo building after dark, then the waterfront estate
 * from the air, which plays as a short silent clip. It moves on by itself until the
 * visitor picks a scene. The clip is only fetched once the page has finished loading,
 * never on a data-saving connection, and never for visitors who ask for less motion;
 * they get the two stills and the switch.
 *
 * As the page starts to scroll, the picture in the panel settles back slightly.
 * Scrolling itself is untouched and the buttons work from the first frame.
 *
 * Styles live in styles/first-view.css. This file avoids browser-only code at render
 * time because the build also renders it into the page's first HTML.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { locations } from "@/data/locations";
import { GOOGLE_BUSINESS_URL, GCP_BUSINESS } from "@/lib/business-info";
import { HERO_WIDE, heroCopy, heroScenes } from "../data/hero";
import { CallLink, QuoteLink, TextLink } from "../lib/actions";
import { ArrowUpRightIcon, CameraIcon, CheckIcon, HomeIcon, MapPinIcon, PhoneIcon, QuoteDocIcon, StarIcon } from "../lib/icons";
import { countUp, motionShift } from "../lib/motion";

/** Lower-case attribute: React 18 passes it through as written and browsers read it. */
const HIGH_PRIORITY = { fetchpriority: "high" } as Record<string, string>;
const REDUCE = "(prefers-reduced-motion: reduce)";

type Conn = { saveData?: boolean; effectiveType?: string };
const canPlayClip = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  if (window.matchMedia(REDUCE).matches) return false;
  const conn = (navigator as Navigator & { connection?: Conn }).connection;
  return !(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType ?? "")));
};

/** Each word of the headline in its own box, so the words can arrive one after another. */
function Words({ text, from }: { text: string; from: number }) {
  const words = text.split(" ");
  return (
    <span className="rd-hero__line">
      {words.map((word, i) => (
        <span key={i}>
          <span className="rd-word" style={{ "--w": from + i } as CSSProperties}>{word}</span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

function Reel() {
  const [index, setIndex] = useState(0);
  /** The scene underneath during a change. */
  const [under, setUnder] = useState<number | null>(null);
  /** Moves on by itself until the visitor chooses a scene. */
  const [auto, setAuto] = useState(true);
  /** True until the first change of scene: the opening has its own timing (see first-view.css). */
  const [first, setFirst] = useState(true);
  /** Scenes whose picture has been asked for. The first is always there. */
  const [asked, setAsked] = useState<boolean[]>(() => heroScenes.map((_, i) => i === 0));
  const [loaded, setLoaded] = useState<boolean[]>(() => heroScenes.map((_, i) => i === 0));
  const [clip, setClip] = useState<{ src: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  /** On screen and the tab in front: the only time anything moves or counts down. */
  const [live, setLive] = useState(true);
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const scene = heroScenes[index];

  const go = (next: number, byVisitor: boolean) => {
    if (byVisitor) setAuto(false);
    if (next === index) return;
    setFirst(false);
    setAsked((was) => was.map((v, i) => v || i === next));
    setUnder(index);
    setIndex(next);
  };

  // A tap on the switch before the app had loaded (see firstView.tsx) is honoured now.
  useEffect(() => {
    const w = window as Window & { __gcpSceneWanted?: string };
    const wanted = heroScenes.findIndex((s) => s.id === w.__gcpSceneWanted);
    w.__gcpSceneWanted = undefined;
    if (wanted > 0) { setAuto(false); setFirst(false); setAsked((was) => was.map((v, i) => v || i === wanted)); setIndex(wanted); }
  }, []);

  // Once the page has finished loading: fetch the other stills, then the clip.
  useEffect(() => {
    let timer = 0;
    const start = () => {
      timer = window.setTimeout(() => {
        setAsked(heroScenes.map(() => true));
        const withClip = heroScenes.find((s) => s.clip);
        if (withClip?.clip && canPlayClip()) {
          setClip({ src: window.matchMedia(HERO_WIDE).matches ? withClip.clip.wide : withClip.clip.phone });
        }
      }, 900);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => { window.removeEventListener("load", start); window.clearTimeout(timer); };
  }, []);

  // Nothing runs while the panel is off screen or the tab is in the background.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let seen = true;
    const update = () => setLive(seen && document.visibilityState !== "hidden");
    const io = new IntersectionObserver(([entry]) => { seen = entry.isIntersecting; update(); }, { threshold: 0.15 });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);

  // The scene underneath stays until the new one has arrived and faded in over it.
  const arrived = loaded[index];
  useEffect(() => {
    if (under === null || !arrived) return;
    const timer = window.setTimeout(() => setUnder(null), 900);
    return () => window.clearTimeout(timer);
  }, [under, arrived]);

  // Never leave the visitor waiting on a slow picture: show the scene after a moment regardless.
  useEffect(() => {
    if (loaded[index]) return;
    const timer = window.setTimeout(() => setLoaded((was) => was.map((v, i) => v || i === index)), 1500);
    return () => window.clearTimeout(timer);
  }, [index, loaded]);

  // The clip plays while its scene is up, and rests on its first frame otherwise. Asking
  // it to play is also what makes a phone fetch it; until frames arrive the still shows.
  const onClipScene = Boolean(scene.clip);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (onClipScene && live) {
      const run = el.play();
      if (run && typeof run.catch === "function") run.catch(() => setPlaying(false));
      return;
    }
    el.pause();
    if (onClipScene) return;
    setPlaying(false);
    // Back to the start once it has faded out, ready for the next showing.
    const timer = window.setTimeout(() => { try { el.currentTime = 0; } catch { /* not seekable yet */ } }, 700);
    return () => window.clearTimeout(timer);
  }, [onClipScene, live, clip]);

  const next = () => go((index + 1) % heroScenes.length, false);

  return (
    <section className="rd-reel rd-panel" ref={root} data-live={live} data-auto={auto} data-first={first || undefined} aria-labelledby="rd-reel-title">
      <i className="rd-reel__beam" key={`beam-${index}`} aria-hidden />
      <div className="rd-reel__head">
        <div className="rd-reel__name">
          <h2 className="rd-reel__title" id="rd-reel-title" key={scene.id}>{scene.title}</h2>
          <p className="rd-reel__sub" key={`${scene.id}-sub`}>{scene.facts.where}</p>
        </div>
        <div className="rd-seg" role="group" aria-label="Choose what the panel shows">
          {heroScenes.map((s, i) => (
            <button key={s.id} type="button" aria-pressed={i === index} data-rd-scene={s.id} onClick={() => go(i, true)}>
              {s.tab}
              {i === index && auto && (
                // The line under the word runs for as long as the scene stays up; when it ends, the next scene comes on.
                <i key={`${s.id}-${index}`} className="rd-seg__run" style={{ "--dur": `${s.seconds}s` } as CSSProperties} onAnimationEnd={next} aria-hidden />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="rd-reel__stage">
        <div className="rd-reel__scenes">
          {heroScenes.map((s, i) => asked[i] && (
            <figure
              key={s.id}
              className="rd-reel__scene"
              data-on={i === index && loaded[i]}
              data-under={i === under || undefined}
              data-playing={Boolean(s.clip) && playing}
              style={{ "--dur": `${s.seconds + 1.5}s` } as CSSProperties}
              aria-hidden={i !== index}
            >
              <picture>
                <source type="image/avif" srcSet={s.photo.avif} sizes={s.photo.sizes} />
                <img
                  src={s.photo.fallback}
                  srcSet={s.photo.jpg}
                  sizes={s.photo.sizes}
                  width={s.photo.width}
                  height={s.photo.height}
                  alt={s.photo.alt}
                  loading="eager"
                  decoding="async"
                  onLoad={() => setLoaded((was) => (was[i] ? was : was.map((v, n) => v || n === i)))}
                  {...(i === 0 ? HIGH_PRIORITY : {})}
                />
              </picture>
              {s.clip && clip && (
                <video
                  ref={video}
                  src={clip.src}
                  muted
                  playsInline
                  preload="auto"
                  loop={!auto}
                  tabIndex={-1}
                  aria-hidden
                  onPlaying={() => setPlaying(true)}
                />
              )}
            </figure>
          ))}
        </div>
        <p className="rd-reel__tag" key={`${scene.id}-tag`}><i aria-hidden />{scene.tag}</p>
      </div>

      <dl className="rd-reel__stats" key={`${scene.id}-stats`}>
        <div><dt>Where</dt><dd><Link to={scene.wherePath}>{scene.facts.where}</Link></dd></div>
        <div><dt>Property</dt><dd>{scene.facts.property}</dd></div>
        <div><dt>Work</dt><dd>{scene.facts.work}</dd></div>
      </dl>
      <Link to="/jobs" className="rd-reel__more">
        See all completed projects
        <ArrowUpRightIcon size={16} />
      </Link>
    </section>
  );
}

function Kpis() {
  const root = useRef<HTMLDivElement>(null);
  // On a wide screen the cards are on the first screen, so their figures run up as the
  // page opens. Not when the app takes over a first screen that has been up for a
  // while: the visitor has already read them. (Further down the page, on a phone, they
  // run when they are scrolled to; lib/motion.ts does that.)
  useEffect(() => {
    const el = root.current;
    if (!el || typeof window.matchMedia !== "function" || window.matchMedia(REDUCE).matches) return;
    const shift = motionShift();
    if (shift && Number.parseInt(shift, 10) < -1600) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.94) countUp(el);
  }, []);
  return (
    <div className="rd-kpis" data-rv="" ref={root}>
      <a className="rd-kpi" data-featured="true" href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer">
        <span className="rd-kpi__top"><span className="rd-kpi__label">Google rating</span><span className="rd-kpi__icon"><StarIcon size={15} /></span></span>
        <span className="rd-kpi__value">{heroCopy.rating}</span>
        <span className="rd-kpi__foot"><span><span data-count={heroCopy.reviews}>{heroCopy.reviews}</span> reviews</span><ArrowUpRightIcon size={15} /></span>
      </a>
      <Link className="rd-kpi" to="/jobs">
        <span className="rd-kpi__top"><span className="rd-kpi__label">Properties served</span><span className="rd-kpi__icon"><HomeIcon size={15} /></span></span>
        <span className="rd-kpi__value"><span data-count="1000" data-group="true">1,000</span>+</span>
        <span className="rd-kpi__foot"><span>See projects</span><ArrowUpRightIcon size={15} /></span>
      </Link>
      <Link className="rd-kpi" to="/service-areas">
        <span className="rd-kpi__top"><span className="rd-kpi__label">Cities covered</span><span className="rd-kpi__icon"><MapPinIcon size={15} /></span></span>
        <span className="rd-kpi__value"><span data-count={locations.length}>{locations.length}</span></span>
        <span className="rd-kpi__foot"><span>Perdido Key to 30A</span><ArrowUpRightIcon size={15} /></span>
      </Link>
      <QuoteLink placement="hero_card" className="rd-kpi">
        <span className="rd-kpi__top"><span className="rd-kpi__label">Written quote</span><span className="rd-kpi__icon"><QuoteDocIcon size={15} /></span></span>
        <span className="rd-kpi__value">Free</span>
        <span className="rd-kpi__foot"><span>Start yours</span><ArrowUpRightIcon size={15} /></span>
      </QuoteLink>
    </div>
  );
}

export default function Hero() {
  const open = useRef<HTMLDivElement>(null);

  // Feeds how far the opening has scrolled away (0 to 1) to the stylesheet. One number,
  // written at most once a frame, and only while the opening is still on screen.
  useEffect(() => {
    const el = open.current;
    if (!el || typeof window.matchMedia !== "function") return;
    if (window.matchMedia(REDUCE).matches) return;
    let frame = 0;
    let last = -1;
    const update = () => {
      frame = 0;
      const height = el.offsetHeight || 1;
      const p = Math.min(1, Math.max(0, window.scrollY / height));
      if (Math.abs(p - last) < 0.002) return;
      last = p;
      el.style.setProperty("--p", p.toFixed(3));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // On a mouse, the work panel leans a degree or two toward the pointer.
    const reel = el.querySelector<HTMLElement>(".rd-reel");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let lean = 0;
    let tx = 0;
    let ty = 0;
    const place = () => {
      lean = 0;
      reel?.style.setProperty("--tx", tx.toFixed(3));
      reel?.style.setProperty("--ty", ty.toFixed(3));
    };
    const onMove = (event: PointerEvent) => {
      if (!reel) return;
      const box = reel.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2)));
      ty = Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / (window.innerHeight / 2)));
      if (!lean) lean = window.requestAnimationFrame(place);
    };
    const onLeave = () => { tx = 0; ty = 0; if (!lean) lean = window.requestAnimationFrame(place); };
    if (fine && reel) {
      el.addEventListener("pointermove", onMove, { passive: true });
      el.addEventListener("pointerleave", onLeave, { passive: true });
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
      if (lean) window.cancelAnimationFrame(lean);
    };
  }, []);

  const firstWords = heroCopy.lines[0].split(" ").length;

  return (
    <div className="rd-open" ref={open}>
      <section className="rd-hero" aria-labelledby="rd-hero-title">
        <div className="rd-wrap rd-hero__grid">
          <div className="rd-hero__head">
            <a className="rd-eyebrow rd-hero__proof" href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer" aria-label={heroCopy.proofLabel}>
              <StarIcon size={13} />
              <span>{heroCopy.proof}</span>
              <span className="rd-hero__proof-n">{heroCopy.proofCount}</span>
            </a>
            <h1 id="rd-hero-title" className="rd-hero__title">
              <Words text={heroCopy.lines[0]} from={0} />{" "}
              <Words text={heroCopy.lines[1]} from={firstWords} />
            </h1>
            <p className="rd-hero__lead">{heroCopy.lead}</p>
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
            <ul className="rd-hero__assure">
              {heroCopy.assure.map((line) => <li key={line}><CheckIcon size={15} />{line}</li>)}
            </ul>
          </div>
          <Reel />
          <Kpis />
        </div>
      </section>
    </div>
  );
}
