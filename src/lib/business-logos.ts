import gcpLogo from "@/assets/logo.png";
import ppsLogo from "@/assets/logo-pps.png";

/**
 * Local fallback logos by business shortcode.
 * Used when business.logo_url is not set in the database.
 */
const LOGO_MAP: Record<string, string> = {
  GCP: gcpLogo,
  PPS: ppsLogo,
};

function normalizeShortcode(shortcode: string): string {
  return shortcode.trim().toUpperCase();
}

export function getFallbackBusinessLogo(shortcode: string): string | null {
  return LOGO_MAP[normalizeShortcode(shortcode)] ?? null;
}

export function getBusinessLogo(shortcode: string, dbLogoUrl?: string | null): string | null {
  if (dbLogoUrl?.trim()) return dbLogoUrl;
  return getFallbackBusinessLogo(shortcode);
}

export const BUSINESS_LOGOS = LOGO_MAP;
