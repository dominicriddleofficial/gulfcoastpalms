/**
 * One responsive photo. Takes a vite-imagetools "picture" import (several sizes in
 * AVIF, WebP and JPEG) and lets the browser pick the right file for the screen.
 *
 * Width and height are always set, so the page never jumps while photos load.
 */
import type { CSSProperties } from "react";

export interface Picture {
  sources: Record<string, string>;
  img: { src: string; w: number; h: number };
}

/** A plain address also works (tests, and files that are not processed by imagetools). */
export type PhotoSource = Picture | string;

interface PhotoProps {
  src: PhotoSource;
  alt: string;
  /**
   * How wide the photo is shown, in CSS terms, e.g. "(min-width: 1000px) 40vw, 67vw".
   * For phones, large photos state about two thirds of their real width. A 3x phone
   * then picks a file twice as wide as the picture on screen, not three times: still
   * sharp, and roughly half the download on a cellular connection.
   */
  sizes: string;
  className?: string;
  /** Which part of the photo to keep when the frame is a different shape, e.g. "30% 20%". */
  focus?: string;
  /** Set for a photo visible as soon as the page opens. Everything else loads when scrolled near. */
  eager?: boolean;
  /**
   * Load straight away at normal priority. For photos in a sideways-scrolling row, which
   * browsers otherwise leave unloaded until they are swiped into view.
   */
  soon?: boolean;
  style?: CSSProperties;
  onLoad?: () => void;
}

const FALLBACK_FORMATS = ["jpeg", "jpg", "png"];
const MIME: Record<string, string> = { avif: "image/avif", webp: "image/webp", jpeg: "image/jpeg", jpg: "image/jpeg", png: "image/png" };

export default function Photo({ src, alt, sizes, className, focus, eager = false, soon = false, style, onLoad }: PhotoProps) {
  if (!src) return null;
  const imgStyle: CSSProperties | undefined = focus ? { objectPosition: focus, ...style } : style;
  // Lower-case fetchpriority: React 18 passes it through as written and browsers read it.
  const load: Record<string, string> = eager ? { loading: "eager", fetchpriority: "high" } : { loading: soon ? "eager" : "lazy" };

  if (typeof src === "string") {
    return <img src={src} alt={alt} className={className} style={imgStyle} decoding="async" onLoad={onLoad} {...load} />;
  }
  const formats = Object.keys(src.sources);
  const fallback = formats.find((f) => FALLBACK_FORMATS.includes(f));
  return (
    <picture>
      {formats.filter((f) => f !== fallback).map((f) => (
        <source key={f} type={MIME[f] ?? `image/${f}`} srcSet={src.sources[f]} sizes={sizes} />
      ))}
      <img
        src={src.img.src}
        srcSet={fallback ? src.sources[fallback] : undefined}
        sizes={sizes}
        width={src.img.w}
        height={src.img.h}
        alt={alt}
        className={className}
        style={imgStyle}
        decoding="async"
        onLoad={onLoad}
        {...load}
      />
    </picture>
  );
}
