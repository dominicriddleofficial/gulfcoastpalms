/**
 * Shared helpers for building the customer-ready quote message and the public
 * quote link. Mirrors src/lib/invoice-message.ts — quotes and invoices must
 * behave identically in the send / copy flows.
 *
 * The public quote route is /quote/:shortcode/:quoteId (see PortalRoutes.tsx),
 * so a link can only be built AFTER the quote row exists. buildQuoteUrl throws
 * on a missing or placeholder id rather than emitting a broken URL.
 */

export { copyTextToClipboard } from "./invoice-message";

export interface QuoteMessageInput {
  quoteId: string;
  quoteNumber: string;
  customerName: string | null | undefined;
  total: number | null | undefined;
  businessName: string | null | undefined;
  shortcode: string | null | undefined;
  origin?: string;
  /**
   * When a recipient-name override is set (an HOA / condo association rather than a
   * person), greet with the full name instead of splitting off a first name.
   */
  useFullName?: boolean;
}

const PLACEHOLDER = /^(pending|undefined|null|new|draft)$/i;

export function isUsableQuoteId(quoteId: string | null | undefined): boolean {
  return !!quoteId && !PLACEHOLDER.test(quoteId.trim());
}

export function getQuotePublicUrl(input: {
  quoteId: string;
  quoteNumber?: string | null;
  shortcode: string | null | undefined;
  origin?: string;
}): string {
  if (!isUsableQuoteId(input.quoteId)) {
    throw new Error("Quote link requested before the quote was saved");
  }
  const origin = input.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const sc = (input.shortcode || input.quoteNumber?.split("-")[0] || "gcp").toLowerCase();
  return `${origin}/quote/${sc}/${input.quoteId}`;
}

export function buildQuoteMessage(input: QuoteMessageInput): string {
  const full = (input.customerName || "there").trim();
  const firstName = input.useFullName ? full : full.split(/\s+/)[0];
  const totalStr = `$${Number(input.total || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const bizName = input.businessName || "Gulf Coast Palms";
  const link = getQuotePublicUrl(input);
  return `Hi ${firstName}, here's your quote from ${bizName} — ${input.quoteNumber} for ${totalStr}. View and approve it here: ${link}\nThank you for considering ${bizName}!`;
}

/** Default customer SMS for a saved quote (includes the real public link). */
export function buildQuoteSms(input: QuoteMessageInput): string {
  const full = (input.customerName || "there").trim();
  const firstName = input.useFullName ? full : full.split(/\s+/)[0];
  const totalStr = `$${Number(input.total || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const bizName = input.businessName || "Gulf Coast Palms";
  const link = getQuotePublicUrl(input);
  return `Hi ${firstName}, ${bizName} has sent you a quote for ${totalStr}. View and approve here: ${link} Reply STOP to unsubscribe.`;
}
