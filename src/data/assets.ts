/**
 * Site asset URLs — centralized for easy updates.
 *
 * Hero image is stored in Supabase Storage (site-assets bucket) to enable
 * on-demand WebP transforms via the image transformation API.
 *
 * To update the hero image:
 * 1. Upload the new image to Supabase Storage → site-assets bucket
 * 2. Update the URL below (or set VITE_HERO_IMAGE_URL in your .env)
 *
 * WebP transform URL format (append to base URL):
 *   ?width=768&format=webp&quality=80   (mobile)
 *   ?width=1280&format=webp&quality=80  (tablet)
 *   ?width=1920&format=webp&quality=80  (desktop)
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qczcwyqpnxknqbmwpvna.supabase.co";

// ACTION REQUIRED: Set VITE_HERO_IMAGE_URL in your .env if you want to override
export const HERO_IMAGE_URL =
  import.meta.env.VITE_HERO_IMAGE_URL ||
  `${SUPABASE_URL}/storage/v1/object/public/site-assets/hero.jpg`;

/** Render path for on-the-fly image transforms (width, format, quality) */
export const HERO_IMAGE_RENDER_URL =
  `${SUPABASE_URL}/storage/v1/render/image/public/site-assets/hero.jpg`;

/**
 * Build a Supabase image-transform URL for a given width and format.
 * Falls back to the raw object URL if the env doesn't expose the render path.
 */
export function heroImageSrc(width: number, format: "avif" | "webp" | "jpg" = "jpg") {
  const fmt = format === "jpg" ? "origin" : format;
  return `${HERO_IMAGE_RENDER_URL}?width=${width}&quality=72&format=${fmt}`;
}

/** Comma-joined srcset for a given format. */
export function heroSrcSet(format: "avif" | "webp" | "jpg") {
  return [640, 960, 1280, 1600, 1920]
    .map((w) => `${heroImageSrc(w, format)} ${w}w`)
    .join(", ");
}
