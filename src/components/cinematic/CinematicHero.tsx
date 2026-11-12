import { Link } from "react-router-dom";
import { ArrowRight, Pause, Play, RotateCcw } from "lucide-react";
import QuoteRequestButton from "@/components/cta/QuoteRequestButton";
import HeroReviewBadge from "@/components/home/HeroReviewBadge";
import { GCP_BUSINESS, TEL_HREF } from "@/lib/business-info";
import { cinematicChapters, cinematicMedia, cinematicPoster, cinematicServices } from "@/data/cinematicHero";
import { useCinematicPlayer } from "./useCinematicPlayer";

const CinematicHero = () => {
  const p = useCinematicPlayer({ ...cinematicMedia, chapters: cinematicChapters });
  const ended = p.state === "ended";

  return (
    <section
      ref={(el) => { p.containerRef.current = el; }}
      aria-labelledby="cinematic-hero-title"
      className="cine-hero relative isolate overflow-hidden bg-palm-dark text-palm-sand"
    >
      {/* Media layer: mobile frames the whole scene above; desktop fills the viewport. */}
      <div className="cine-media pointer-events-none">
        <picture>
          <source type="image/avif" srcSet={cinematicPoster.avif} sizes="100vw" />
          <source type="image/webp" srcSet={cinematicPoster.webp} sizes="100vw" />
          <img
            src={cinematicPoster.fallback}
            srcSet={cinematicPoster.jpg}
            sizes="100vw"
            alt={cinematicPoster.alt}
            width={cinematicPoster.width}
            height={cinematicPoster.height}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="cine-frame"
          />
        </picture>
        {p.videoMounted && p.source && (
          <video
            ref={(el) => { p.videoRef.current = el; }}
            className={`cine-frame absolute inset-0 transition-opacity duration-500 ${p.state === "playing" || p.state === "paused" || ended ? "opacity-100" : "opacity-0"}`}
            src={p.source.mp4}
            poster={p.source.poster}
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
            {...p.handlers}
          />
        )}
        <div className="cine-scrim" aria-hidden="true" />
        <p className="cine-label">Service visualization — not a customer job</p>
      </div>

      <div className="cine-content container mx-auto px-5 md:px-10">
        <div className="cine-copy max-w-2xl">
          <p className="font-body text-[11px] md:text-xs uppercase tracking-[0.22em] text-palm-gold mb-3">
            Care for the canopy. Room for what's next.
          </p>
          <h1 id="cinematic-hero-title" className="font-display font-bold text-primary-foreground leading-[1.04] text-[34px] sm:text-5xl lg:text-[64px] mb-3 md:mb-5">
            Tree Removal &amp; Palm Tree Trimming
          </h1>
          <p className="font-body text-sm md:text-lg text-palm-sand/85 max-w-xl mb-4 md:mb-6">
            Experienced tree crews and established palm expertise across Florida's Emerald Coast, from Perdido Key to 30A.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <QuoteRequestButton source="hero_cinematic_main" className="w-full sm:w-auto">
              {ended ? "Get your free quote" : "Get a Free Quote"}
            </QuoteRequestButton>
            <a href={TEL_HREF} data-track-placement="hero_cinematic" className="font-body text-sm text-palm-sand/80 hover:text-primary-foreground underline-offset-4 hover:underline">
              or call <span className="font-semibold text-primary-foreground">{GCP_BUSINESS.phoneDisplay}</span>
            </a>
            <HeroReviewBadge compact />
          </div>
        </div>

        <nav aria-label="Choose a service" className="cine-journey">
          <p className="font-body text-[11px] uppercase tracking-[0.2em] text-palm-sand/65 mb-2">
            {ended ? "Your property, your next step" : "Two services, one crew"}
          </p>
          <ul className="grid grid-cols-2 gap-2 md:gap-3">
            {cinematicServices.map((s) => (
              <li key={s.id} className="cine-card">
                <Link
                  to={s.quoteHref}
                  data-track-cta="quote_request"
                  data-track-placement={s.placement}
                  className="group block rounded-t-xl px-3 pt-3 pb-2 md:px-4 md:pt-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-palm-gold"
                >
                  <span className="flex items-center justify-between gap-2 font-display text-base md:text-xl font-semibold text-primary-foreground">
                    {s.title}
                    <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                  <span className="hidden md:block font-body text-sm text-palm-sand/75 mt-1">{s.detail}</span>
                  <span className="block font-body text-xs text-palm-gold mt-1">Free quote</span>
                </Link>
                <Link to={s.pageHref} className="block px-3 pb-3 md:px-4 font-body text-xs text-palm-sand/70 underline-offset-4 hover:underline hover:text-primary-foreground">
                  About {s.title.toLowerCase()}
                </Link>
              </li>
            ))}
          </ul>

          {p.hasMedia && (
            <div className="mt-3 flex items-center gap-3">
              {ended ? (
                <button type="button" onClick={p.replay} className="cine-ctrl" aria-label="Replay film">
                  <RotateCcw className="w-4 h-4" aria-hidden="true" /> Replay
                </button>
              ) : p.state === "playing" || p.state === "loading" ? (
                <button type="button" onClick={p.pause} className="cine-ctrl" aria-label="Pause film">
                  <Pause className="w-4 h-4" aria-hidden="true" /> Pause
                </button>
              ) : (
                <button type="button" onClick={p.play} className="cine-ctrl" aria-label="Play film">
                  <Play className="w-4 h-4" aria-hidden="true" /> Play
                </button>
              )}
              <ol className="flex gap-1.5" aria-label="Film chapters">
                {cinematicChapters.map((c) => (
                  <li key={c.id} aria-current={p.chapter === c.id ? "step" : undefined}
                    className={`h-1 w-6 rounded-full ${p.chapter === c.id ? "bg-palm-gold" : "bg-palm-sand/25"}`}>
                    <span className="sr-only">{c.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </nav>
      </div>
    </section>
  );
};

export default CinematicHero;
