import { supabase } from "@/integrations/supabase/client";

/**
 * ONE place that decides how an invoice's service address is built, saved and displayed.
 *
 * Background: platform_invoices stores the address twice — the parts
 * (service_address_line1/2 + city/state/zip) and a flattened
 * service_formatted_address. The invoice page, the public pay page and the PDF all
 * render the flattened value, so if a save updates only the parts, the customer keeps
 * seeing the old address. Everything here exists so those two can never disagree again.
 */

export type ServiceAddressParts = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

const clean = (v: string | null | undefined) => (typeof v === "string" ? v.trim() : "");

/** Flatten address parts into the single string customers see. */
export function buildFormattedAddress(parts: ServiceAddressParts): string | null {
  const line1 = clean(parts.line1);
  const line2 = clean(parts.line2);
  const city = clean(parts.city);
  const state = clean(parts.state);
  const zip = clean(parts.zip);
  const cityStateZip = [[city, state].filter(Boolean).join(", "), zip].filter(Boolean).join(" ");
  const out = [line1, line2, cityStateZip].filter(Boolean).join(", ");
  return out || null;
}

const normalize = (v: string) => v.replace(/[^a-z0-9]/gi, "").toLowerCase();

/**
 * True when a stored formatted string still matches the current line1 — i.e. it is safe
 * to render. A formatted value that does not start with line1 is stale.
 */
export function formattedMatchesParts(formatted: string | null | undefined, line1: string | null | undefined): boolean {
  const f = normalize(clean(formatted));
  const l = normalize(clean(line1));
  if (!f) return false;
  if (!l) return true; // no line1 to contradict it
  return f.startsWith(l);
}

/**
 * Resolve the address to display, in order:
 * service_formatted_address (only when it agrees with line1) → parts → property → customer.
 */
export function resolveInvoiceDisplayAddress(input: {
  service?: (ServiceAddressParts & { formatted?: string | null }) | null;
  propertyAddress?: string | null;
  customerAddress?: string | null;
}): string | null {
  const s = input.service;
  if (s) {
    const fromParts = buildFormattedAddress(s);
    if (formattedMatchesParts(s.formatted, s.line1)) return clean(s.formatted) || fromParts;
    if (fromParts) return fromParts;
  }
  return clean(input.propertyAddress) || clean(input.customerAddress) || null;
}

/**
 * The ONLY payload shape used to persist an invoice service address. Always writes the
 * parts and the rebuilt formatted string together.
 */
export function serviceAddressUpdatePayload(
  parts: ServiceAddressParts,
  /** A Google-formatted string is kept only while it still agrees with line1. */
  existingFormatted?: string | null,
) {
  return {
    service_address_line1: clean(parts.line1) || null,
    service_address_line2: clean(parts.line2) || null,
    service_city: clean(parts.city) || null,
    service_state: clean(parts.state) || null,
    service_zip: clean(parts.zip) || null,
    service_formatted_address: formattedMatchesParts(existingFormatted, parts.line1)
      ? clean(existingFormatted)
      : buildFormattedAddress(parts),
  };
}


export type ServiceAddressUpdatePayload = ReturnType<typeof serviceAddressUpdatePayload>;

/** Single save path for editing an existing invoice's service address. */
export async function saveInvoiceServiceAddress(
  invoiceId: string,
  parts: ServiceAddressParts,
  existingFormatted?: string | null,
) {
  const payload = serviceAddressUpdatePayload(parts, existingFormatted);
  const { error } = await supabase.from("platform_invoices").update(payload).eq("id", invoiceId);
  return { error, payload };
}

