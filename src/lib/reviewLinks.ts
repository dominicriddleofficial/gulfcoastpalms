/**
 * Per-business Google review links used by the "Send Review Message" flow
 * in the Schedule tab. Keyed by platform business_id.
 *
 * GCP link mirrors the canonical marketing link in src/data/reviews.ts and
 * src/lib/business-info.ts (g.page/r/CVI5xmZYC-NAEBM). PPS does not yet have
 * a review URL in the codebase — leave as placeholder until provided.
 */
export const REVIEW_LINKS: Record<string, string> = {
  // Gulf Coast Palms
  "b0000000-0000-0000-0000-000000000001":
    "https://g.page/r/CVI5xmZYC-NAEBM/review",
  // Prestige Property Services — no link found in codebase
  "b0000000-0000-0000-0000-000000000002": "REPLACE_WITH_GOOGLE_REVIEW_LINK",
};

export function getReviewLink(businessId: string | null | undefined): string {
  if (!businessId) return "REPLACE_WITH_GOOGLE_REVIEW_LINK";
  return REVIEW_LINKS[businessId] ?? "REPLACE_WITH_GOOGLE_REVIEW_LINK";
}

/** Display name used inside the review-request SMS body per business. */
export const REVIEW_BUSINESS_NAMES: Record<string, string> = {
  "b0000000-0000-0000-0000-000000000001": "Gulf Coast Palms",
  "b0000000-0000-0000-0000-000000000002": "Prestige Property Services",
};

export function getReviewBusinessName(businessId: string | null | undefined): string {
  if (!businessId) return "our team";
  return REVIEW_BUSINESS_NAMES[businessId] ?? "our team";
}

export const GCP_BUSINESS_ID = "b0000000-0000-0000-0000-000000000001";

// NOTE: the review message body now lives in src/lib/review-sms.ts
// (buildReviewMessage), rendered from the owner-editable business_settings
// template. The old hardcoded paragraph was removed — it contained conditional
// solicitation ("if you're happy…"), which Google's policy prohibits.

/** Strip to digits, drop leading US country code. Empty string if invalid. */
export function smsDigits(phone: string | null | undefined): string {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return d.slice(1);
  return d.length === 10 ? d : d; // permissive — let the OS decide
}

/** iOS-friendly sms: deep link with encoded body. */
export function buildSmsHref(phone: string | null | undefined, body: string): string {
  const digits = smsDigits(phone);
  const encoded = encodeURIComponent(body);
  // iOS accepts sms:NUMBER&body=... ; Android accepts sms:NUMBER?body=...
  // The `&` form works on both when a query separator is missing.
  return `sms:${digits}&body=${encoded}`;
}