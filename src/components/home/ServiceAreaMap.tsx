import { Link } from "react-router-dom";

/**
 * Stylized Emerald Coast map — pure SVG, no external tiles or fabricated
 * per-city counts. Cities are positioned by relative geography (Pensacola
 * to Santa Rosa Beach) inside a decorative panel. Each label links to its
 * location page.
 */

type Pin = {
  city: string;
  slug: string;
  x: number; // 0-1000 viewBox
  y: number; // 0-500 viewBox
  anchor?: "start" | "middle" | "end";
  dy?: number;
};

const PINS: Pin[] = [
  { city: "Pensacola",         slug: "/palm-tree-trimming-pensacola-fl",         x: 130, y: 300, anchor: "end", dy: 4 },
  { city: "Milton",            slug: "/palm-tree-trimming-milton-fl",            x: 195, y: 210, anchor: "middle", dy: -12 },
  { city: "Pace",              slug: "/palm-tree-trimming-pace-fl",              x: 175, y: 250, anchor: "end", dy: 4 },
  { city: "Gulf Breeze",       slug: "/palm-tree-trimming-gulf-breeze-fl",       x: 215, y: 345, anchor: "start", dy: 4 },
  { city: "Navarre",           slug: "/palm-tree-trimming-navarre-fl",           x: 320, y: 360, anchor: "middle", dy: 22 },
  { city: "Mary Esther",       slug: "/palm-tree-trimming-mary-esther-fl",       x: 440, y: 350, anchor: "middle", dy: -12 },
  { city: "Fort Walton Beach", slug: "/palm-tree-trimming-fort-walton-beach-fl", x: 490, y: 375, anchor: "start", dy: 4 },
  { city: "Niceville",         slug: "/palm-tree-trimming-niceville-fl",         x: 555, y: 260, anchor: "middle", dy: -12 },
  { city: "Crestview",         slug: "/palm-tree-trimming-crestview-fl",         x: 560, y: 130, anchor: "middle", dy: -12 },
  { city: "Destin",            slug: "/palm-tree-trimming-destin-fl",            x: 650, y: 380, anchor: "start", dy: 4 },
  { city: "Santa Rosa Beach",  slug: "/palm-tree-trimming-santa-rosa-beach-fl",  x: 830, y: 385, anchor: "start", dy: 4 },
];

const ServiceAreaMap = () => (
  <section className="section-padding bg-background">
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

      <div className="relative rounded-3xl overflow-hidden bg-palm-dark border border-border shadow-lg">
        <svg
          viewBox="0 0 1000 500"
          className="w-full h-auto block"
          role="img"
          aria-label="Map of Gulf Coast Palms service areas across Northwest Florida"
        >
          <defs>
            <linearGradient id="scam-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--palm-dark))" />
              <stop offset="100%" stopColor="hsl(var(--palm-dark))" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="scam-land" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--palm-green) / 0.18)" />
              <stop offset="100%" stopColor="hsl(var(--palm-green) / 0.05)" />
            </linearGradient>
            <linearGradient id="scam-gulf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--palm-green) / 0.08)" />
              <stop offset="100%" stopColor="hsl(var(--palm-dark))" />
            </linearGradient>
            <radialGradient id="scam-pin" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="hsl(var(--palm-light))" />
              <stop offset="100%" stopColor="hsl(var(--palm-green))" />
            </radialGradient>
          </defs>

          {/* sky */}
          <rect x="0" y="0" width="1000" height="500" fill="url(#scam-sky)" />

          {/* stylized land mass (Panhandle) */}
          <path
            d="M0,120 C120,90 220,60 360,80 C500,100 620,60 780,80 C880,95 960,110 1000,130 L1000,340 C960,330 900,335 840,345 C760,360 700,365 620,380 C540,390 480,395 400,388 C320,380 240,360 160,335 C100,320 40,315 0,320 Z"
            fill="url(#scam-land)"
            stroke="hsl(var(--palm-green) / 0.4)"
            strokeWidth="1.5"
          />

          {/* gulf */}
          <path
            d="M0,340 C120,360 240,380 360,395 C480,408 600,410 720,400 C820,392 900,382 1000,375 L1000,500 L0,500 Z"
            fill="url(#scam-gulf)"
          />

          {/* subtle inland roads / lat lines */}
          <g stroke="hsl(var(--palm-green) / 0.15)" strokeWidth="1" strokeDasharray="4 6" fill="none">
            <path d="M0,180 C250,175 600,190 1000,175" />
            <path d="M0,260 C280,250 620,270 1000,255" />
          </g>

          {/* pins */}
          {PINS.map((p) => (
            <g key={p.slug}>
              <circle cx={p.x} cy={p.y} r="7" fill="url(#scam-pin)" stroke="hsl(var(--palm-light))" strokeWidth="1.5" />
              <circle cx={p.x} cy={p.y} r="16" fill="hsl(var(--palm-light) / 0.15)" />
            </g>
          ))}

          {/* clickable labels */}
          {PINS.map((p) => (
            <Link key={p.slug + "-label"} to={p.slug}>
              <text
                x={p.x}
                y={p.y}
                dy={p.dy ?? -12}
                textAnchor={p.anchor ?? "middle"}
                className="font-semibold"
                fontSize="15"
                fill="hsl(var(--palm-light))"
                style={{ cursor: "pointer" }}
              >
                {p.city}
              </text>
            </Link>
          ))}

          {/* caption inside map */}
          <text x="30" y="470" fontSize="14" fill="hsl(var(--palm-sand) / 0.75)" className="font-body">
            Gulf of Mexico · Florida Panhandle
          </text>
        </svg>
      </div>

      {/* mobile-friendly chip list beneath the map */}
      <div className="flex flex-wrap justify-center gap-2 mt-8">
        {PINS.map((p) => (
          <Link
            key={p.slug + "-chip"}
            to={p.slug}
            className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground font-body font-medium text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
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

export default ServiceAreaMap;