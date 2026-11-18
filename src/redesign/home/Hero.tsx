/**
 * Opening screen: a real job photo with the headline in the panel beside it.
 *
 * The photo is a trunk-skinning job photographed mid-work. Visitors can select a
 * mark to look closer at a part of it. There is no matched before-and-after pair on
 * file, so this stands in for the reveal; components/BeforeAfter.tsx is ready for a
 * real pair.
 *
 * Styles live in styles/first-view.css. This file avoids browser-only code at render
 * time because the build also renders it into the page's first HTML.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GOOGLE_BUSINESS_URL, GCP_BUSINESS } from "@/lib/business-info";
import { heroCopy, heroPhoto, heroSpots, treeFrame } from "../data/hero";
import { CallLink, QuoteLink, TextLink } from "../lib/actions";
import { CameraIcon, PhoneIcon, PlusIcon, StarIcon } from "../lib/icons";

/** Lower-case attribute: React 18 passes it through as written and browsers read it. */
const HIGH_PRIORITY = { fetchpriority: "high" } as Record<string, string>;

export default function Hero() {
  const [active, setActive] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const spot = heroSpots.find((s) => s.id === active) ?? null;

  useEffect(() => {
    if (!active) return;
    setZoomed(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const stageStyle = spot
    ? ({ "--z": spot.zoom, "--zx": `${spot.x}%`, "--zy": `${spot.y}%` } as React.CSSProperties)
    : undefined;
  const sizes = zoomed ? heroPhoto.zoomSizes : heroPhoto.sizes;

  return (
    <section className="rd-hero" aria-labelledby="rd-hero-title">
      <div className="rd-hero__photo">
        <div className="rd-hero__stage" style={stageStyle}>
          <picture>
            <source type="image/avif" srcSet={heroPhoto.avif} sizes={sizes} />
            <img
              src={heroPhoto.fallback}
              srcSet={heroPhoto.jpg}
              sizes={sizes}
              width={heroPhoto.width}
              height={heroPhoto.height}
              alt={heroPhoto.alt}
              loading="eager"
              decoding="async"
              {...HIGH_PRIORITY}
            />
          </picture>
          {heroSpots.map((s) => {
            const on = s.id === active;
            if (spot && !on) return null;
            return (
              <button
                key={s.id}
                type="button"
                className={`rd-hero__spot${s.wideOnly ? " rd-hero__spot--desk" : ""}`}
                style={{ "--x": `${s.x}%`, "--y": `${s.y}%` } as React.CSSProperties}
                aria-pressed={on}
                aria-label={on ? "Back to the whole photo" : `Look closer at ${s.label}`}
                onClick={() => setActive(on ? null : s.id)}
              >
                <span><PlusIcon size={16} /></span>
              </button>
            );
          })}
        </div>
        {!spot && (
          <Link className="rd-hero__inset" to={treeFrame.to}>
            <picture>
              <source type="image/avif" srcSet={treeFrame.avif} />
              <img src={treeFrame.jpg} width={treeFrame.width} height={treeFrame.height} alt={treeFrame.alt} decoding="async" />
            </picture>
            <span>{treeFrame.label}</span>
          </Link>
        )}
        <div className={`rd-hero__cap${spot ? "" : " rd-hero__cap--hint"}`} aria-live="polite">
          <p>{spot ? spot.note : heroCopy.hint}</p>
        </div>
      </div>

      <div className="rd-hero__panel">
        <h1 id="rd-hero-title" className="rd-hero__title">
          <span className="rd-hero__reach">{heroCopy.lines[0]}</span>{" "}
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
