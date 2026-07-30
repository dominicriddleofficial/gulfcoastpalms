/**
 * Review-request SMS: template rendering + SMS segment math.
 * Shared by the owner Settings UI. The edge function
 * (supabase/functions/process-review-queue) keeps its own copy of the
 * same logic because Deno functions cannot import from src/.
 */

export const DEFAULT_REVIEW_TEMPLATE =
  "Hi {first_name}! Hope everything looks great — thanks again for having Gulf Coast Palms out. We're trying to reach 200 Google reviews by the end of the season, and every single one gets us a little closer. Here's the link to make it easy: {review_link} Thanks again and see you next time 👍";

// Verified working Google review form redirect (search.google.com/local/writereview).
export const FALLBACK_REVIEW_LINK = "https://g.page/r/CVI5xmZYC-NAEBM/review";

/**
 * LEGAL / CARRIER REQUIREMENT — the opt-out sentence is not editable.
 * Every automated marketing SMS must carry an opt-out instruction
 * (TCPA + carrier 10DLC rules). It is appended to the final message
 * whenever the owner's template does not already contain it.
 */
export const OPT_OUT_SUFFIX = " Reply STOP to opt out.";

export interface ReviewMessageInput {
  customerName?: string | null;
  businessName?: string | null;
  template?: string | null;
  reviewLink?: string | null;
}

/** First word of the customer name; "there" when empty/null/"NA". */
export function resolveFirstName(customerName?: string | null): string {
  const raw = (customerName ?? "").trim();
  if (!raw || raw.toLowerCase() === "na") return "there";
  return raw.split(/\s+/)[0] || "there";
}

export function buildReviewMessage(input: ReviewMessageInput): string {
  const template = (input.template ?? "").trim() || DEFAULT_REVIEW_TEMPLATE;
  const link = (input.reviewLink ?? "").trim() || FALLBACK_REVIEW_LINK;
  const raw = (input.customerName ?? "").trim();
  const fullName = !raw || raw.toLowerCase() === "na" ? "there" : raw;

  let msg = template
    .split("{first_name}").join(resolveFirstName(input.customerName))
    .split("{full_name}").join(fullName)
    .split("{business_name}").join((input.businessName ?? "").trim() || "Gulf Coast Palms")
    .split("{review_link}").join(link);

  // Non-negotiable compliance suffix (see OPT_OUT_SUFFIX above).
  if (!msg.includes("Reply STOP to opt out.")) msg = `${msg.trimEnd()}${OPT_OUT_SUFFIX}`;
  return msg;
}

// --- SMS segment math -------------------------------------------------

const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXTENDED = "^{}\\[~]|€";

export interface SmsSegmentInfo {
  characters: number;
  segments: number;
  encoding: "GSM-7" | "UCS-2";
  /** Chars-per-segment used for this message. */
  perSegment: number;
}

export function analyzeSms(message: string): SmsSegmentInfo {
  const chars = Array.from(message);
  let isGsm = true;
  let units = 0;
  for (const ch of chars) {
    if (GSM7_BASIC.includes(ch)) units += 1;
    else if (GSM7_EXTENDED.includes(ch)) units += 2;
    else { isGsm = false; break; }
  }

  if (!isGsm) {
    // UCS-2: count UTF-16 code units (emoji = 2).
    const ucsUnits = message.length;
    const single = 70;
    const multi = 67;
    const segments = ucsUnits <= single ? 1 : Math.ceil(ucsUnits / multi);
    return { characters: chars.length, segments: Math.max(1, segments), encoding: "UCS-2", perSegment: ucsUnits <= single ? single : multi };
  }

  const single = 160;
  const multi = 153;
  const segments = units <= single ? 1 : Math.ceil(units / multi);
  return { characters: chars.length, segments: Math.max(1, segments), encoding: "GSM-7", perSegment: units <= single ? single : multi };
}

export function formatSegmentLabel(info: SmsSegmentInfo): string {
  const base = `${info.characters} characters · ${info.segments} SMS segment${info.segments === 1 ? "" : "s"}`;
  return info.encoding === "UCS-2"
    ? `${base} (emoji detected — emoji cuts segment size from 160 to 70 characters)`
    : base;
}
