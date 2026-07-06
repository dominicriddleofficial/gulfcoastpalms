import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

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
  y: number; // 0-500 viewBox
  labelPos: "above" | "below";
};

// Ordered west → east so the traced route reads Pensacola → Santa Rosa Beach.
const PINS: Pin[] = [
  { city: "Pensacola",         slug: "/palm-tree-trimming-pensacola-fl",         x: 130, y: 300, labelPos: "below" },
  { city: "Pace",              slug: "/palm-tree-trimming-pace-fl",              x: 175, y: 250, labelPos: "above" },
  { city: "Milton",            slug: "/palm-tree-trimming-milton-fl",            x: 215, y: 205, labelPos: "above" },
  { city: "Gulf Breeze",       slug: "/palm-tree-trimming-gulf-breeze-fl",       x: 235, y: 345, labelPos: "below" },
  { city: "Navarre",           slug: "/palm-tree-trimming-navarre-fl",           x: 340, y: 365, labelPos: "below" },
  { city: "Mary Esther",       slug: "/palm-tree-trimming-mary-esther-fl",       x: 445, y: 340, labelPos: "above" },
  { city: "Crestview",         slug: "/palm-tree-trimming-crestview-fl",         x: 520, y: 120, labelPos: "above" },
  { city: "Fort Walton Beach", slug: "/palm-tree-trimming-fort-walton-beach-fl", x: 510, y: 375, labelPos: "below" },
  { city: "Niceville",         slug: "/palm-tree-trimming-niceville-fl",         x: 590, y: 260, labelPos: "above" },
  { city: "Destin",            slug: "/palm-tree-trimming-destin-fl",            x: 680, y: 385, labelPos: "below" },
  { city: "Santa Rosa Beach",  slug: "/palm-tree-trimming-santa-rosa-beach-fl",  x: 850, y: 390, labelPos: "below" },
];

// Route path (west → east, coastal cities only for a clean sweep).
const ROUTE_CITIES = ["Pensacola", "Gulf Breeze", "Navarre", "Mary Esther", "Fort Walton Beach", "Destin", "Santa Rosa Beach"];
const ROUTE_POINTS = ROUTE_CITIES
  .map((c) => PINS.find((p) => p.city === c))
  .filter((p): p is Pin => Boolean(p));

// Smooth cardinal-ish spline through the route points.
const buildRoutePath = (): string => {
  if (ROUTE_POINTS.length < 2) return "";
  const pts = ROUTE_POINTS;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.2;
    const cp1x = p1.x + (p2.x - p0.x) * t;
    const cp1y = p1.y + (p2.y - p0.y) * t;
    const cp2x = p2.x - (p3.x - p1.x) * t;
    const cp2y = p2.y - (p3.y - p1.y) * t;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

const ROUTE_D = buildRoutePath();

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

        .scam-pin-group { transform-box: fill-box; transform-origin: center; opacity: 0; }
        .scam-visible .scam-pin-group {
          animation: scam-pop 520ms cubic-bezier(.34,1.56,.64,1) forwards;
        }
        .scam-ping {
          transform-box: fill-box;
          transform-origin: center;
          animation: scam-ping 2.6s ease-out infinite;
        }
        .scam-core { animation: scam-core 3.2s ease-in-out infinite; }
        .scam-shore { stroke-dasharray: 6 14; animation: scam-shimmer 6s linear infinite; }
        .scam-route-base { stroke-dasharray: var(--scam-len); stroke-dashoffset: var(--scam-len); }
        .scam-visible .scam-route-base { animation: scam-draw 2.4s ease-out .3s forwards; }
        .scam-route-pulse {
          stroke-dasharray: 60 var(--scam-len);
          stroke-dashoffset: var(--scam-len);
          opacity: 0;
        }
        .scam-visible .scam-route-pulse {
          opacity: 1;
          animation: scam-travel 5s linear 2.4s infinite;
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

        @media (prefers-reduced-motion: reduce) {
          .scam-ping,
          .scam-core,
          .scam-shore,
          .scam-route-base,
          .scam-route-pulse,
          .scam-visible .scam-pin-group,
          .scam-pin-group { animation: none !important; opacity: 1 !important; stroke-dashoffset: 0 !important; }
          .scam-route-pulse { opacity: 0 !important; }
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
            Palms trimmed, removed, and installed across every city marked below — from Pensacola east to Santa Rosa Beach.
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
          {/* Vignette */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
            }}
          />

          <svg
            viewBox="0 0 1000 500"
            className="w-full h-auto block relative"
            role="img"
            aria-label="Map of Gulf Coast Palms service areas across Northwest Florida"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="scam-land-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={BRAND_GREEN} stopOpacity="0.28" />
                <stop offset="60%"  stopColor={BRAND_GREEN} stopOpacity="0.10" />
                <stop offset="100%" stopColor={BRAND_GREEN} stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="scam-gulf-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#0a2418" stopOpacity="0.9" />
                <stop offset="60%"  stopColor="#031008" stopOpacity="1" />
                <stop offset="100%" stopColor="#010805" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="scam-shore-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={BRAND_GREEN_BRIGHT} stopOpacity="0.15" />
                <stop offset="50%"  stopColor={BRAND_AMBER}        stopOpacity="0.7" />
                <stop offset="100%" stopColor={BRAND_GREEN_BRIGHT} stopOpacity="0.15" />
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
            </defs>

            {/* Gulf */}
            <rect x="0" y="330" width="1000" height="170" fill="url(#scam-gulf-grad)" />

            {/* Land mass — Panhandle silhouette */}
            <path
              d="M0,110 C120,80 220,55 360,72 C500,92 620,55 780,78 C880,92 960,108 1000,128 L1000,335 C960,330 900,332 840,340 C760,352 700,358 620,372 C540,382 480,388 400,382 C320,374 240,355 160,332 C100,318 40,315 0,318 Z"
              fill="url(#scam-land-grad)"
            />

            {/* Topographic contour lines */}
            <g stroke={BRAND_GREEN} strokeOpacity="0.10" strokeWidth="1" fill="none">
              <path d="M0,160 C220,150 500,175 1000,155" />
              <path d="M0,205 C260,195 560,220 1000,200" />
              <path d="M0,250 C280,240 600,265 1000,245" />
              <path d="M0,290 C300,282 620,300 1000,285" />
            </g>

            {/* Glowing shoreline */}
            <path
              d="M0,318 C100,320 220,332 360,340 C500,348 640,340 780,332 C880,326 960,325 1000,328"
              fill="none"
              stroke={BRAND_GREEN_BRIGHT}
              strokeOpacity="0.35"
              strokeWidth="2"
            />
            <path
              d="M0,318 C100,320 220,332 360,340 C500,348 640,340 780,332 C880,326 960,325 1000,328"
              fill="none"
              stroke="url(#scam-shore-grad)"
              strokeWidth="2"
              className="scam-shore"
            />

            {/* Route line — settled green */}
            <path
              d={ROUTE_D}
              fill="none"
              stroke={BRAND_GREEN_BRIGHT}
              strokeOpacity="0.55"
              strokeWidth="2"
              strokeLinecap="round"
              className="scam-route-base"
              style={{ ["--scam-len" as string]: 1400 }}
            />
            {/* Route line — amber traveling pulse */}
            <path
              d={ROUTE_D}
              fill="none"
              stroke={BRAND_AMBER}
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#scam-glow)"
              className="scam-route-pulse"
              style={{ ["--scam-len" as string]: 1400 }}
            />

            {/* Pins */}
            {PINS.map((p, i) => {
              const isActive = active === p.slug;
              const above = p.labelPos === "above";
              const labelY = above ? p.y - 22 : p.y + 26;
              const pillW = Math.max(72, p.city.length * 7.4 + 16);
              return (
                <g
                  key={p.slug}
                  className={`scam-pin-group ${isActive ? "is-active" : ""}`}
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  {/* Ping */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="10"
                    fill={BRAND_GREEN_BRIGHT}
                    fillOpacity="0.35"
                    className="scam-ping"
                    style={{ animationDelay: `${(i % 5) * 400}ms` }}
                  />
                  {/* Halo */}
                  <circle cx={p.x} cy={p.y} r="22" fill="url(#scam-halo)" opacity="0.25" className="scam-halo" />
                  {/* Core */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="6"
                    fill="url(#scam-core)"
                    stroke="#eafff2"
                    strokeWidth="1.2"
                    className="scam-core-dot scam-core"
                    filter="url(#scam-glow)"
                  />

                  {/* Label pill */}
                  <g>
                    <rect
                      x={p.x - pillW / 2}
                      y={labelY - 12}
                      width={pillW}
                      height={20}
                      rx="10"
                      fill="#04100a"
                      fillOpacity="0.78"
                      stroke={BRAND_GREEN}
                      strokeOpacity="0.35"
                      strokeWidth="1"
                    />
                    <text
                      x={p.x}
                      y={labelY + 2}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight={600}
                      fill="#eafff2"
                      style={{ letterSpacing: "0.01em" }}
                    >
                      {p.city}
                    </text>
                  </g>

                  {/* Tooltip */}
                  <g className="scam-tooltip" transform={`translate(${p.x}, ${p.y - 46})`}>
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
                      r="22"
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
            <text x="24" y="482" fontSize="12" fill="#7ea593" fillOpacity="0.85" letterSpacing="0.08em">
              GULF OF MEXICO · FLORIDA PANHANDLE
            </text>

            {/* Compass */}
            <g transform="translate(950, 60)" opacity="0.55">
              <circle r="18" fill="none" stroke={BRAND_AMBER} strokeOpacity="0.4" />
              <path d="M0,-14 L4,0 L0,14 L-4,0 Z" fill={BRAND_AMBER} fillOpacity="0.6" />
              <text y="-22" textAnchor="middle" fontSize="9" fill={BRAND_AMBER} fillOpacity="0.7">N</text>
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