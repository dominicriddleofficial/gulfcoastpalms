import { useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Pause, Play, RotateCcw } from "lucide-react";
import QuoteRequestButton from "@/components/cta/QuoteRequestButton";
import HeroReviewBadge from "@/components/home/HeroReviewBadge";
import { GCP_BUSINESS, TEL_HREF } from "@/lib/business-info";
import {
  cinematicChapters, cinematicMedia, cinematicPortraitPoster, cinematicPoster, cinematicServices,
  type CinematicSource,
} from "@/data/cinematicHero";
import { useCinematicPlayer } from "./useCinematicPlayer";

const MOBILE = "(max-width: 767px)";

interface Props {
  /** Defaults to the reviewed films in cinematicHero data (empty until supplied). */
  media?: { mobile?: CinematicSource; desktop?: CinematicSource };
}

const CinematicHero = ({ media = cinematicMedia }: Props) => {
  const p = useCinematicPlayer({ ...media, chapters: cinematicChapters });
  const ended = p.state === "ended";
  const running = p.state === "playing" || p.state === "loading" || p.state === "paused";
  /** Service card to highlight: only while the film is genuinely on that chapter. */
  const active = p.showVideo && running ? p.chapter : "";
  const chapterLabel = cinematicChapters.find((c) => c.id === p.chapter)?.label;
  const { onPosterSettled } = p;

  // Cached images may finish before React attaches onLoad.
  const posterRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) onPosterSettled();
  }, [onPosterSettled]);

  return (
    <section
      ref={(el) => { p.containerRef.current = el; }}
      aria-labelledby="cinematic-hero-title"
      className="cine-hero relative isolate overflow-hidden bg-palm-dark text-palm-sand"
    >
      <div className="cine-media pointer-events-none" aria-hidden={false}>
        <picture>
          <source media={MOBILE} type="image/avif" srcSet={cinematicPortraitPoster.avif} sizes="100vw" />
          <source media={MOBILE} type="image/webp" srcSet={cinematicPortraitPoster.webp} sizes="100vw" />
          <source media={MOBILE} srcSet={cinematicPortraitPoster.jpg} sizes="100vw" />
          <source type="image/avif" srcSet={cinematicPoster.avif} sizes="100vw" />
          <source type="image/webp" srcSet={cinematicPoster.webp} sizes="100vw" />
          <img
            ref={posterRef}
            src={cinematicPoster.fallback}
            srcSet={cinematicPoster.jpg}
            sizes="100vw"
            alt={cinematicPoster.alt}
            width={cinematicPoster.width}
            height={cinematicPoster.height}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            onLoad={onPosterSettled}
            onError={onPosterSettled}
            className="cine-frame"
          />
        </picture>
        {p.videoMounted && p.source && (
          <video
            ref={(el) => { p.videoRef.current = el; }}
            data-testid="cinematic-video"
            data-frame-shown={p.showVideo ? "true" : "false"}
            className={`cine-frame absolute inset-0 transition-opacity duration-500 ${p.showVideo ? "opacity-100" : "opacity-0"}`}
            src={p.source.mp4}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            {...p.handlers}
          />
        )}
        <div className="cine-scrim" aria-hidden="true" />
      </div>

      <div className="cine-content container mx-auto px-5 md:px-10">
        <div className="cine-copy max-w-2xl">
          <p className="cine-eyebrow font-body uppercase text-palm-gold">Care for the canopy. Room for what's next.</p>
          <h1 id="cinematic-hero-title" className="cine-title font-display font-bold text-primary-foreground">
            Tree Removal &amp; Palm Tree Trimming
          </h1>
          <p className="cine-sub font-body text-palm-sand/85">
            Experienced tree crews and established palm expertise across Florida's Emerald Coast, from Perdido Key to 30A.
          </p>
          <div className="cine-actions">
            <QuoteRequestButton source="hero_cinematic_main" className="cine-quote">
              {ended ? "Get your free quote" : "Get a Free Quote"}
            </QuoteRequestButton>
            <a href={TEL_HREF} data-track-placement="hero_cinematic" className="cine-call font-body text-palm-sand/85 hover:text-primary-foreground underline-offset-4 hover:underline">
              or call <span className="font-semibold text-primary-foreground">{GCP_BUSINESS.phoneDisplay}</span>
            </a>
            <span className="cine-badge"><HeroReviewBadge compact /></span>
          </div>
        </div>

        <nav aria-label="Choose a service" className="cine-journey">
          <ul className="grid grid-cols-2 gap-2 md:gap-3">
            {cinematicServices.map((s) => (
              <li key={s.id} className="cine-card" data-active={active === s.chapter ? "true" : undefined} data-settled={ended ? "true" : undefined}>
                <Link
                  to={s.quoteHref}
                  data-track-cta="quote_request"
                  data-track-placement={s.placement}
                  className="group block rounded-xl px-3 py-2.5 md:px-4 md:pt-4 md:pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-palm-gold"
                >
                  <span className="flex items-center justify-between gap-2 font-display text-[15px] leading-tight md:text-xl font-semibold text-primary-foreground">
                    {s.title}
                    <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                  <span className="hidden md:block font-body text-sm text-palm-sand/80 mt-1">{s.detail}</span>
                  <span className="block font-body text-xs text-palm-gold mt-0.5">Free quote</span>
                </Link>
                <Link to={s.pageHref} className="hidden md:block px-4 pb-3 font-body text-xs text-palm-sand/75 underline-offset-4 hover:underline hover:text-primary-foreground">
                  About {s.title.toLowerCase()}
                </Link>
              </li>
            ))}
          </ul>

        </nav>
      </div>
      <div className="cine-player">
        <div className="cine-player-row">
          <p className="cine-label">
            Service visualization
            {p.showVideo && chapterLabel && <span className="cine-chapter"> · {chapterLabel}</span>}
          </p>
          {p.hasMedia && (ended ? (
            <button type="button" onClick={p.replay} className="cine-ctrl" aria-label="Replay film">
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /><span className="cine-ctrl-text">Replay</span>
            </button>
          ) : p.state === "playing" || p.state === "loading" ? (
            <button type="button" onClick={p.pause} className="cine-ctrl" aria-label="Pause film">
              <Pause className="w-3.5 h-3.5" aria-hidden="true" /><span className="cine-ctrl-text">Pause</span>
            </button>
          ) : (
            <button type="button" onClick={p.play} className="cine-ctrl" aria-label="Play film">
              <Play className="w-3.5 h-3.5" aria-hidden="true" /><span className="cine-ctrl-text">Play</span>
            </button>
          ))}
        </div>
        {p.hasMedia && (
          <div className="cine-progress" aria-hidden="true">
            <span ref={(el) => { p.progressRef.current = el; }} className="cine-progress-fill" />
          </div>
        )}
      </div>
    </section>
  );
};

export default CinematicHero;
