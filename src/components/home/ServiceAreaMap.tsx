import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Cinematic Emerald Coast service map — pure SVG + CSS animation.
 * Brand: deep dark bg, brand green #1E8549, amber #F4A825 accents.
 * Respects prefers-reduced-motion.
 */

const BRAND_GREEN = "#1E8549";
const BRAND_GREEN_BRIGHT = "#2FBE68";
const BRAND_AMBER = "#F4A825";

type Pin = {
  city: string;
  slug: string;
  x: number; // 0-1000 viewBox
  y: number; // 0-560 viewBox
  labelPos: "above" | "below";
};

// Ordered west → east. Positions map to the stylized Panhandle geography:
// mainland spans y≈60-360 with two bay indentations (Pensacola Bay + Choctawhatchee Bay);
// a thin barrier island runs y≈420-438; open Gulf below.
const PINS: Pin[] = [
  { city: "Perdido",           slug: "/palm-tree-trimming-perdido-key-fl",       x:  45, y: 345, labelPos: "above" },
  { city: "Pensacola",         slug: "/palm-tree-trimming-pensacola-fl",         x: 140, y: 335, labelPos: "above" },
  { city: "Pace",              slug: "/palm-tree-trimming-pace-fl",              x: 205, y: 230, labelPos: "above" },
  { city: "Milton",            slug: "/palm-tree-trimming-milton-fl",            x: 260, y: 175, labelPos: "above" },
  { city: "Gulf Breeze",       slug: "/palm-tree-trimming-gulf-breeze-fl",       x: 220, y: 395, labelPos: "below" },
  { city: "Navarre",           slug: "/palm-tree-trimming-navarre-fl",           x: 355, y: 428, labelPos: "below" },
  { city: "Mary Esther",       slug: "/palm-tree-trimming-mary-esther-fl",       x: 455, y: 350, labelPos: "above" },
  { city: "Fort Walton Beach", slug: "/palm-tree-trimming-fort-walton-beach-fl", x: 525, y: 355, labelPos: "below" },
  { city: "Crestview",         slug: "/palm-tree-trimming-crestview-fl",         x: 585, y: 105, labelPos: "above" },
  { city: "Niceville",         slug: "/palm-tree-trimming-niceville-fl",         x: 645, y: 270, labelPos: "above" },
  { city: "Destin",            slug: "/palm-tree-trimming-destin-fl",            x: 735, y: 395, labelPos: "below" },
  { city: "Santa Rosa Beach",  slug: "/palm-tree-trimming-santa-rosa-beach-fl",  x: 855, y: 415, labelPos: "above" },
  { city: "30A",               slug: "/palm-tree-trimming-30a-fl",               x: 955, y: 428, labelPos: "below" },
];

// Offshore flight-path arc — smooth, independent of pin coordinates, sitting
// in the open Gulf just south of the barrier island. Reads instantly as
// "our coastline service route", not a squiggle through cities.
const ROUTE_D = "M 30 505 C 260 470, 740 470, 970 505";
const ROUTE_LEN = 970;

// Composite south coast (mainland shore w/ Pensacola Bay + Choctawhatchee Bay indents)
const COAST_D =
  "M 0,360 L 95,360 " +
  "C 92,340 100,300 148,285 C 208,270 258,275 272,302 C 285,325 292,355 292,360 " +
  "L 555,360 C 555,355 558,325 572,302 C 590,272 645,265 700,285 C 750,302 776,345 790,360 " +
  "L 1000,360";

// Full mainland silhouette (top edge + right + composite coast + left)
const LAND_D =
  "M 0,80 C 150,55 300,70 480,60 C 660,52 820,75 1000,68 L 1000,360 L 790,360 " +
  "C 776,345 750,302 700,285 C 645,265 590,272 572,302 C 558,325 555,355 555,360 " +
  "L 292,360 C 292,355 285,325 272,302 C 258,275 208,270 148,285 C 100,300 92,340 95,360 " +
  "L 0,360 Z";

// Distant hills (back land layer, slightly north)
const HILLS_D =
  "M 0,95 C 180,68 340,88 520,72 C 700,58 840,88 1000,78 L 1000,180 L 0,180 Z";

// Thin barrier island (Santa Rosa Island feel)
const BARRIER_D =
  "M 15,420 C 200,412 400,425 500,420 C 620,415 800,425 985,418 " +
  "L 985,440 C 800,447 620,435 500,442 C 400,447 200,432 15,438 Z";

const ServiceAreaMap = () => {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="section-padding bg-background" ref={sectionRef}>
      <style>{`
        @keyframes scam-ping {
          0%   { transform: scale(0.6); opacity: 0.55; }
          70%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes scam-core {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.75; }
        }
        @keyframes scam-shimmer {
          0%   { stroke-dashoffset: 0; opacity: 0.35; }
          50%  { opacity: 0.9; }
          100% { stroke-dashoffset: -180; opacity: 0.35; }
        }
        @keyframes scam-draw {
          from { stroke-dashoffset: var(--scam-len); }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes scam-travel {
          0%   { stroke-dashoffset: var(--scam-len); }
          100% { stroke-dashoffset: calc(var(--scam-len) * -1); }
        }
        @keyframes scam-pop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes scam-wave {
          from { transform: translateX(0); }
          to   { transform: translateX(-200px); }
        }
        @keyframes scam-glint {
          0%   { transform: translateX(-40%); opacity: 0; }
          20%  { opacity: 0.6; }
          80%  { opacity: 0.6; }
          100% { transform: translateX(140%); opacity: 0; }
        }
        @keyframes scam-mote {
          0%   { transform: translate(0,0); opacity: 0; }
          20%  { opacity: 0.35; }
          80%  { opacity: 0.35; }
          100% { transform: translate(-60px,-24px); opacity: 0; }
        }
        @keyframes scam-ring {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes scam-land-fade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scam-sheen {
          0%   { transform: translateX(-60%) skewX(-18deg); opacity: 0; }
          40%  { opacity: 0.55; }
          100% { transform: translateX(160%) skewX(-18deg); opacity: 0; }
        }
        @keyframes scam-head {
          0%   { offset-distance: 0%; opacity: 0; }
          6%   { opacity: 1; }
          94%  { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }

        .scam-pin-group { transform-box: fill-box; transform-origin: center; opacity: 0; }
        .scam-visible .scam-pin-group {
          animation: scam-pop 520ms cubic-bezier(.34,1.56,.64,1) forwards;
          animation-delay: var(--scam-pin-delay, 0ms);
        }
        .scam-ping {
          transform-box: fill-box;
          transform-origin: center;
          animation: scam-ping 2.6s ease-out infinite;
        }
        .scam-core { animation: scam-core 3.2s ease-in-out infinite; }
        .scam-shore { stroke-dasharray: 6 14; animation: scam-shimmer 6s linear infinite; }
        .scam-beacon-ring {
          transform-box: fill-box;
          transform-origin: center;
          animation: scam-ring 10s linear infinite;
          opacity: 0.5;
        }
        .scam-pin-group.is-active .scam-beacon-ring {
          animation-duration: 4s;
          stroke: ${BRAND_AMBER};
          opacity: 0.9;
        }
        .scam-land-back { opacity: 0; }
        .scam-visible .scam-land-back {
          animation: scam-land-fade 900ms ease-out .55s forwards;
        }
        .scam-land-main { opacity: 0; }
        .scam-visible .scam-land-main {
          animation: scam-land-fade 900ms ease-out .8s forwards;
        }
        .scam-wave-a { animation: scam-wave 22s linear infinite; }
        .scam-wave-b { animation: scam-wave 34s linear infinite reverse; }
        .scam-wave-c { animation: scam-wave 48s linear infinite; }
        .scam-glint {
          pointer-events: none;
          position: absolute; left: 0; right: 0;
          top: 66%; height: 20%;
          background: linear-gradient(90deg, transparent 0%, rgba(234,255,242,0.10) 45%, rgba(244,168,37,0.14) 50%, rgba(234,255,242,0.10) 55%, transparent 100%);
          transform: translateX(-40%);
          mix-blend-mode: screen;
          filter: blur(6px);
          opacity: 0;
        }
        .scam-visible .scam-glint { animation: scam-glint 14s ease-in-out 1.5s infinite; }
        .scam-sheen {
          pointer-events: none;
          position: absolute; inset: 0;
          background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.10) 45%, rgba(244,168,37,0.10) 50%, rgba(255,255,255,0.10) 55%, transparent 70%);
          mix-blend-mode: screen;
          transform: translateX(-60%) skewX(-18deg);
          opacity: 0;
        }
        .scam-visible .scam-sheen { animation: scam-sheen 1600ms ease-out 2.4s 1; }
        .scam-mote { animation: scam-mote linear infinite; }
        .scam-head {
          offset-path: path("${ROUTE_D}");
          offset-rotate: 0deg;
          opacity: 0;
        }
        .scam-visible .scam-head {
          animation: scam-head 5s linear 2.4s infinite;
        }
        .scam-route-base { stroke-dasharray: var(--scam-len); stroke-dashoffset: var(--scam-len); }
        .scam-visible .scam-route-base { animation: scam-draw 2.2s ease-out 1.4s forwards; }
        .scam-route-pulse {
          stroke-dasharray: 60 var(--scam-len);
          stroke-dashoffset: var(--scam-len);
          opacity: 0;
        }
        .scam-visible .scam-route-pulse {
          opacity: 1;
          animation: scam-travel 5s linear 3.6s infinite;
        }
        .scam-pin-hit { cursor: pointer; }
        .scam-pin-hit:hover .scam-core-dot,
        .scam-pin-hit:focus .scam-core-dot,
        .scam-pin-group.is-active .scam-core-dot {
          r: 9;
          filter: drop-shadow(0 0 10px ${BRAND_AMBER});
        }
        .scam-pin-hit:hover .scam-halo,
        .scam-pin-group.is-active .scam-halo { opacity: 0.55; }
        .scam-tooltip { pointer-events: none; opacity: 0; transition: opacity .18s ease-out; }
        .scam-pin-group.is-active .scam-tooltip { opacity: 1; }
        .scam-shore-draw { stroke-dasharray: 1700; stroke-dashoffset: 1700; }
        .scam-visible .scam-shore-draw { animation: scam-draw 1200ms ease-out .1s forwards; }
        .scam-shore-draw { --scam-len: 1700; }

        @media (prefers-reduced-motion: reduce) {
          .scam-ping,
          .scam-core,
          .scam-shore,
          .scam-route-base,
          .scam-route-pulse,
          .scam-wave-a, .scam-wave-b, .scam-wave-c,
          .scam-glint, .scam-sheen, .scam-mote,
          .scam-beacon-ring, .scam-head,
          .scam-land-back, .scam-land-main,
          .scam-shore-draw,
          .scam-visible .scam-pin-group,
          .scam-pin-group { animation: none !important; opacity: 1 !important; stroke-dashoffset: 0 !important; }
          .scam-route-pulse, .scam-head, .scam-mote, .scam-glint, .scam-sheen { opacity: 0 !important; }
        }

        .scam-chip-active {
          background-color: ${BRAND_GREEN} !important;
          color: #fff !important;
          box-shadow: 0 0 0 3px ${BRAND_AMBER}33;
        }
      `}</style>

      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <p className="font-body text-sm uppercase tracking-[0.2em] text-palm-gold font-semibold mb-3">
            Where We've Worked
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">
            Served Across the Emerald Coast
          </h2>
          <p className="font-body text-muted-foreground max-w-2xl mx-auto">
            Palms trimmed, removed, and installed across every city marked below — from Perdido west to 30A east.
          </p>
        </div>

        <div
          className={`relative rounded-2xl overflow-hidden border border-border shadow-elev-xl ${visible ? "scam-visible" : ""}`}
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(30,133,73,0.18), transparent 70%), " +
              "radial-gradient(ellipse 60% 40% at 80% 90%, rgba(30,133,73,0.10), transparent 70%), " +
              "linear-gradient(180deg, #06170d 0%, #04100a 100%)",
            boxShadow:
              "0 30px 80px -20px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(244,168,37,0.10), inset 0 0 60px rgba(30,133,73,0.08)",
          }}
        >
          {/* Header pill badge */}
          <div
            aria-hidden="true"
            className="absolute bottom-3 left-3 z-10 flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide"
            style={{
              background: "rgba(4,16,10,0.72)",
              border: `1px solid ${BRAND_AMBER}55`,
              color: "#eafff2",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: BRAND_AMBER, boxShadow: `0 0 8px ${BRAND_AMBER}` }}
            />
            {PINS.length} cities · Perdido → 30A
          </div>

          {/* Vignette */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
            }}
          />
          {/* Water glint sweep */}
          <div aria-hidden="true" className="scam-glint" />
          {/* Final sheen sweep */}
          <div aria-hidden="true" className="scam-sheen" />

          <svg
            viewBox="0 0 1000 560"
            className="w-full h-auto block relative"
            role="img"
            aria-label="Map of Gulf Coast Palms service areas across Northwest Florida"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="scam-land-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#0f3a1f" stopOpacity="0.95" />
                <stop offset="55%"  stopColor="#155a2d" stopOpacity="0.75" />
                <stop offset="100%" stopColor={BRAND_GREEN_BRIGHT} stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id="scam-land-back-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#0a2915" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#0a2915" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="scam-gulf-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#0d4638" stopOpacity="1" />
                <stop offset="35%"  stopColor="#0a2f28" stopOpacity="1" />
                <stop offset="100%" stopColor="#020c0a" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="scam-sound-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#1b6a52" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#0a3a2d" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="scam-barrier-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#f4e9c9" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#8a7a4a" stopOpacity="0.28" />
              </linearGradient>
              <linearGradient id="scam-shore-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={BRAND_GREEN_BRIGHT} stopOpacity="0.15" />
                <stop offset="50%"  stopColor={BRAND_AMBER}        stopOpacity="0.7" />
                <stop offset="100%" stopColor={BRAND_GREEN_BRIGHT} stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="scam-route-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={BRAND_AMBER} stopOpacity="0.45" />
                <stop offset="50%"  stopColor={BRAND_AMBER} stopOpacity="0.95" />
                <stop offset="100%" stopColor={BRAND_AMBER} stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id="scam-wave-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#7fe6b5" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#7fe6b5" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="scam-core" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%"   stopColor="#eafff2" />
                <stop offset="50%"  stopColor={BRAND_GREEN_BRIGHT} />
                <stop offset="100%" stopColor={BRAND_GREEN} />
              </radialGradient>
              <radialGradient id="scam-halo" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%"   stopColor={BRAND_GREEN_BRIGHT} stopOpacity="0.5" />
                <stop offset="100%" stopColor={BRAND_GREEN_BRIGHT} stopOpacity="0" />
              </radialGradient>
              <filter id="scam-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="scam-noise" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
                <feColorMatrix values="0 0 0 0 0.12  0 0 0 0 0.28  0 0 0 0 0.18  0 0 0 0.35 0" />
                <feComposite in2="SourceGraphic" operator="in" />
              </filter>
            </defs>

            {/* Gulf (open water south of barrier) */}
            <rect x="0" y="360" width="1000" height="200" fill="url(#scam-gulf-grad)" />
            {/* Sound (between mainland shore & barrier island) */}
            <rect x="0" y="360" width="1000" height="62" fill="url(#scam-sound-grad)" />

            {/* Layered animated waves (parallax) */}
            <g aria-hidden="true">
              <g className="scam-wave-c">
                <path
                  d="M-200,455 Q -100,446 0,455 T 200,455 T 400,455 T 600,455 T 800,455 T 1000,455 T 1200,455 T 1400,455 L 1400,472 L -200,472 Z"
                  fill="url(#scam-wave-grad)"
                  opacity="0.75"
                />
              </g>
              <g className="scam-wave-b">
                <path
                  d="M-200,485 Q -100,476 0,485 T 200,485 T 400,485 T 600,485 T 800,485 T 1000,485 T 1200,485 T 1400,485 L 1400,504 L -200,504 Z"
                  fill="url(#scam-wave-grad)"
                  opacity="0.65"
                />
              </g>
              <g className="scam-wave-a">
                <path
                  d="M-200,520 Q -100,510 0,520 T 200,520 T 400,520 T 600,520 T 800,520 T 1000,520 T 1200,520 T 1400,520 L 1400,540 L -200,540 Z"
                  fill="url(#scam-wave-grad)"
                  opacity="0.55"
                />
              </g>
            </g>

            {/* Distant hills (back land layer) */}
            <path
              className="scam-land-back"
              d={HILLS_D}
              fill="url(#scam-land-back-grad)"
            />

            {/* Land mass — Panhandle silhouette */}
            <g className="scam-land-main">
              <path
                d={LAND_D}
                fill="url(#scam-land-grad)"
              />
              {/* Subtle grain overlay on land */}
              <path
                d={LAND_D}
                fill="#000"
                filter="url(#scam-noise)"
                opacity="0.28"
              />
              {/* Bay labels */}
              <text x="185" y="325" fontSize="9" fill="#7ea593" fillOpacity="0.55" letterSpacing="0.14em">PENSACOLA BAY</text>
              <text x="605" y="330" fontSize="9" fill="#7ea593" fillOpacity="0.55" letterSpacing="0.14em">CHOCTAWHATCHEE BAY</text>
            </g>

            {/* Barrier island (Santa Rosa Island) */}
            <path d={BARRIER_D} fill="url(#scam-barrier-grad)" opacity="0.85" />
            <path d={BARRIER_D} fill="#000" filter="url(#scam-noise)" opacity="0.22" />

            {/* Topographic contour lines */}
            <g stroke={BRAND_GREEN_BRIGHT} strokeOpacity="0.08" strokeWidth="1" fill="none">
              <path d="M0,140 C220,128 500,150 1000,132" />
              <path d="M0,190 C260,178 560,202 1000,182" />
              <path d="M0,240 C280,228 600,252 1000,232" />
            </g>

            {/* Foam line where water meets sand — bright hint */}
            <path
              d={COAST_D}
              fill="none"
              stroke="#f4e9c9"
              strokeOpacity="0.5"
              strokeWidth="1.2"
            />
            {/* Glowing shoreline (draws in first) */}
            <path
              className="scam-shore-draw"
              d={COAST_D}
              fill="none"
              stroke={BRAND_GREEN_BRIGHT}
              strokeOpacity="0.7"
              strokeWidth="2"
            />
            <path
              d={COAST_D}
              fill="none"
              stroke="url(#scam-shore-grad)"
              strokeWidth="2"
              className="scam-shore"
            />

            {/* Motes over water (fireflies) */}
            <g aria-hidden="true">
              {[
                { x: 120, y: 470, dur: 11, delay: 0 },
                { x: 260, y: 510, dur: 14, delay: 2 },
                { x: 380, y: 480, dur: 12, delay: 4 },
                { x: 520, y: 515, dur: 15, delay: 1 },
                { x: 640, y: 490, dur: 13, delay: 3 },
                { x: 760, y: 520, dur: 16, delay: 5 },
                { x: 880, y: 495, dur: 12, delay: 2.5 },
                { x: 200, y: 535, dur: 17, delay: 6 },
              ].map((m, i) => (
                <circle
                  key={i}
                  cx={m.x}
                  cy={m.y}
                  r="1.6"
                  fill={BRAND_AMBER}
                  opacity="0"
                  className="scam-mote"
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    animationDuration: `${m.dur}s`,
                    animationDelay: `${m.delay}s`,
                    filter: "drop-shadow(0 0 3px rgba(244,168,37,0.7))",
                  }}
                />
              ))}
            </g>

            {/* Offshore flight-path arc — dashed, amber, sweeps Perdido → 30A */}
            <path
              d={ROUTE_D}
              fill="none"
              stroke="url(#scam-route-grad)"
              strokeOpacity="0.95"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="10 8"
              filter="url(#scam-glow)"
              className="scam-route-base"
              style={{ ["--scam-len" as string]: ROUTE_LEN }}
            />
            {/* Route — flowing dash overlay */}
            <path
              d={ROUTE_D}
              fill="none"
              stroke={BRAND_AMBER}
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeDasharray="10 8"
              filter="url(#scam-glow)"
              className="scam-route-pulse"
              style={{ ["--scam-len" as string]: ROUTE_LEN }}
            />
            {/* Route head — bright leading dot */}
            <circle
              r="4"
              fill="#fffbe6"
              className="scam-head"
              filter="url(#scam-glow)"
              style={{ filter: `drop-shadow(0 0 8px ${BRAND_AMBER})` }}
            />

            {/* Route endpoint markers */}
            <circle cx="30"  cy="505" r="3" fill={BRAND_AMBER} opacity="0.85" />
            <circle cx="970" cy="505" r="3" fill={BRAND_AMBER} opacity="0.85" />

            {/* Pins */}
            {PINS.map((p, i) => {
              const isActive = active === p.slug;
              const above = p.labelPos === "above";
              const labelY = above ? p.y - 26 : p.y + 32;
              const pillW = Math.max(96, p.city.length * 9.4 + 22);
              return (
                <g
                  key={p.slug}
                  className={`scam-pin-group ${isActive ? "is-active" : ""}`}
                  style={{ ["--scam-pin-delay" as string]: `${1600 + i * 90}ms` }}
                >
                  {/* Ping */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="13"
                    fill={BRAND_GREEN_BRIGHT}
                    fillOpacity="0.35"
                    className="scam-ping"
                    style={{ animationDelay: `${(i % 5) * 400}ms` }}
                  />
                  {/* Halo */}
                  <circle cx={p.x} cy={p.y} r="28" fill="url(#scam-halo)" opacity="0.28" className="scam-halo" />
                  {/* Rotating beacon ring */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="14"
                    fill="none"
                    stroke={BRAND_GREEN_BRIGHT}
                    strokeWidth="1"
                    strokeDasharray="3 5"
                    className="scam-beacon-ring"
                  />
                  {/* Core */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="8.5"
                    fill="url(#scam-core)"
                    stroke="#eafff2"
                    strokeWidth="1.4"
                    className="scam-core-dot scam-core"
                    filter="url(#scam-glow)"
                  />

                  {/* Label pill */}
                  <g>
                    <rect
                      x={p.x - pillW / 2}
                      y={labelY - 14}
                      width={pillW}
                      height={24}
                      rx="12"
                      fill="#04100a"
                      fillOpacity="0.82"
                      stroke={BRAND_GREEN}
                      strokeOpacity="0.45"
                      strokeWidth="1"
                    />
                    <text
                      x={p.x}
                      y={labelY + 3}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight={600}
                      fill="#eafff2"
                      style={{ letterSpacing: "0.01em" }}
                    >
                      {p.city}
                    </text>
                  </g>

                  {/* Tooltip */}
                  <g className="scam-tooltip" transform={`translate(${p.x}, ${p.y - 54})`}>
                    <rect
                      x={-92}
                      y={-24}
                      width={184}
                      height={30}
                      rx="6"
                      fill="#04100a"
                      stroke={BRAND_AMBER}
                      strokeOpacity="0.5"
                    />
                    <text x="0" y="-5" textAnchor="middle" fontSize="11" fill="#f4e9c9">
                      Palm trimming & removal in {p.city}
                    </text>
                  </g>

                  {/* Hit area (link) */}
                  <Link to={p.slug} aria-label={`Palm services in ${p.city}`}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="26"
                      fill="transparent"
                      className="scam-pin-hit"
                      onMouseEnter={() => setActive(p.slug)}
                      onMouseLeave={() => setActive((cur) => (cur === p.slug ? null : cur))}
                      onFocus={() => setActive(p.slug)}
                      onBlur={() => setActive((cur) => (cur === p.slug ? null : cur))}
                    />
                  </Link>
                </g>
              );
            })}

            {/* Caption */}
            <text x="24" y="548" fontSize="12" fill="#7ea593" fillOpacity="0.85" letterSpacing="0.08em">
              GULF OF MEXICO · FLORIDA PANHANDLE
            </text>

            {/* Top-right cluster — radar sweep + compass fill the dead zone */}
            <g transform="translate(905, 78)" opacity="0.7">
              {/* Radar arcs */}
              <g fill="none" stroke={BRAND_AMBER} strokeOpacity="0.22">
                <circle r="34" />
                <circle r="52" />
                <circle r="70" />
              </g>
              <g fill="none" stroke={BRAND_GREEN_BRIGHT} strokeOpacity="0.35" strokeWidth="1">
                <path d="M -70 0 A 70 70 0 0 1 0 -70" />
                <path d="M -52 0 A 52 52 0 0 1 0 -52" />
              </g>
              {/* Compass rose */}
              <circle r="26" fill="#04100a" fillOpacity="0.55" stroke={BRAND_AMBER} strokeOpacity="0.55" />
              <path d="M0,-20 L5,0 L0,20 L-5,0 Z" fill={BRAND_AMBER} fillOpacity="0.85" />
              <path d="M-20,0 L0,4 L20,0 L0,-4 Z" fill={BRAND_AMBER} fillOpacity="0.35" />
              <text y="-32" textAnchor="middle" fontSize="11" fontWeight={700} fill={BRAND_AMBER} fillOpacity="0.9">N</text>
            </g>
          </svg>
        </div>

        {/* Chips grid */}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {PINS.map((p) => (
            <Link
              key={p.slug + "-chip"}
              to={p.slug}
              onMouseEnter={() => setActive(p.slug)}
              onMouseLeave={() => setActive((cur) => (cur === p.slug ? null : cur))}
              onFocus={() => setActive(p.slug)}
              onBlur={() => setActive((cur) => (cur === p.slug ? null : cur))}
              className={`px-4 py-2 rounded-full bg-secondary text-secondary-foreground font-body font-medium text-sm hover:bg-primary hover:text-primary-foreground transition-all ${active === p.slug ? "scam-chip-active" : ""}`}
            >
              <span aria-hidden="true" className="text-palm-green mr-1.5">✓</span>{p.city}
            </Link>
          ))}
        </div>

        <p className="text-center font-body text-sm text-muted-foreground mt-6">
          Don't see your city? We probably cover it — call{" "}
          <a href="tel:8509101290" className="text-primary font-semibold">(850) 910-1290</a>.
        </p>
      </div>
    </section>
  );
};

export default ServiceAreaMap;