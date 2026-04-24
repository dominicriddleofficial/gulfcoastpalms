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

export function getBusinessLogo(shortcode: string, dbLogoUrl?: string | null): string | null {
  if (dbLogoUrl) return dbLogoUrl;
  return LOGO_MAP[shortcode] ?? null;
}

export const BUSINESS_LOGOS = LOGO_MAP;
