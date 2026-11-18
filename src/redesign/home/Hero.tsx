/**
 * Opening screen: one photograph across the full width, with the headline set in its
 * open sky. The lower part of the photo dissolves into the dark surface and the
 * emerald glow carried over from the CRM, so photo and text read as one piece.
 *
 * One movement: as the page starts to scroll, the photo settles back slightly and
 * dims while the glow on its lower edge runs on into the next section. Scrolling
 * itself is untouched, the buttons work from the first frame, and visitors who ask
 * for less motion get the same picture held still.
 *
 * Styles live in styles/first-view.css. This file avoids browser-only code at render
 * time because the build also renders it into the page's first HTML.
 */
import { useEffect, useRef } from "react";
import { GOOGLE_BUSINESS_URL, GCP_BUSINESS } from "@/lib/business-info";
import { HERO_WIDE, heroCopy, heroPhoto } from "../data/hero";
import { CallLink, QuoteLink, TextLink } from "../lib/actions";
import { CameraIcon, PhoneIcon, StarIcon } from "../lib/icons";

/** Lower-case attribute: React 18 passes it through as written and browsers read it. */
const HIGH_PRIORITY = { fetchpriority: "high" } as Record<string, string>;

export default function Hero() {
  const hero = useRef<HTMLElement>(null);

  // Feeds how far the opening has scrolled away (0 to 1) to the stylesheet. One number,
  // written at most once a frame, and only while the opening is still on screen.
  useEffect(() => {
    const el = hero.current;
    if (!el || typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="rd-hero" aria-labelledby="rd-hero-title" ref={hero}>
      <div className="rd-hero__media">
        <picture>
          <source media={HERO_WIDE} type="image/avif" srcSet={heroPhoto.wide.avif} sizes={heroPhoto.wide.sizes} width={heroPhoto.wide.width} height={heroPhoto.wide.height} />
          <source media={HERO_WIDE} srcSet={heroPhoto.wide.jpg} sizes={heroPhoto.wide.sizes} width={heroPhoto.wide.width} height={heroPhoto.wide.height} />
          <source type="image/avif" srcSet={heroPhoto.phone.avif} sizes={heroPhoto.phone.sizes} />
          <img
            src={heroPhoto.phone.fallback}
            srcSet={heroPhoto.phone.jpg}
            sizes={heroPhoto.phone.sizes}
            width={heroPhoto.phone.width}
            height={heroPhoto.phone.height}
            alt={heroPhoto.alt}
            loading="eager"
            decoding="async"
            {...HIGH_PRIORITY}
          />
        </picture>
      </div>
      <div className="rd-fade rd-hero__glow" aria-hidden="true" />
      <div className="rd-hero__shade" aria-hidden="true" />

      <div className="rd-hero__inner">
        <h1 id="rd-hero-title" className="rd-hero__title">
          <span>{heroCopy.lines[0]}</span>{" "}
          <span>{heroCopy.lines[1]}</span>
        </h1>
        <p className="rd-hero__lead">{heroCopy.lead}</p>
        <a
          className="rd-hero__proof"
          href={GOOGLE_BUSINESS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${heroCopy.rating}. Read them on Google`}
        >
          <StarIcon size={15} />
          <span>{heroCopy.rating}</span>
        </a>
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
