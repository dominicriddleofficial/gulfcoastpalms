// Pure response shaping for get-quote-public (no Deno/network imports, so it is unit-tested directly).
// Pricing, lines, discount, fingerprint and the accepted snapshot all come from ONE database read
// (quote_public_pricing), so a page can never mix a header from one edit with lines from another.

export interface PublicPricing {
  subtotal: number | null; discount_total: number | null; tax_rate: number | null; tax_total: number | null; total: number | null;
  deposit_amount: number | null; accepted_snapshot: AcceptedSnapshot | null; fingerprint: string | null;
  line_items: Array<Record<string, unknown>>;
}
export interface AcceptedSnapshot {
  subtotal: number; tax_total: number; discount_total: number; total: number; tax_rate?: number; deposit_amount?: number;
  approved_by?: string; approved_at?: string; scope_of_work?: string | null; public_notes?: string | null; valid_until?: string | null;
  customer_name?: string | null; customer_address?: string | null; billing_name?: string | null;
  [key: string]: unknown;
}
export interface LiveIdentity {
  scope_of_work: string | null; public_notes: string | null; valid_until: string | null;
  customer_name: string; customer_address: string | null; billing_name: string | null;
  approved_at: string | null; approved_by: string | null;
}

/** Accepted quotes always show what the customer agreed to, never later edits to the customer or property. */
export function publicPricingFields(pricing: PublicPricing, live: LiveIdentity) {
  const snap = pricing.accepted_snapshot;
  const num = (v: unknown) => Number(v ?? 0) || 0;
  return {
    subtotal: num(snap ? snap.subtotal : pricing.subtotal),
    discount_total: num(snap ? snap.discount_total : pricing.discount_total),
    tax_rate: num(snap?.tax_rate ?? pricing.tax_rate),
    tax_total: num(snap ? snap.tax_total : pricing.tax_total),
    total: num(snap ? snap.total : pricing.total),
    deposit_amount: num(snap?.deposit_amount ?? pricing.deposit_amount),
    line_items: pricing.line_items ?? [],
    pricing_fingerprint: pricing.fingerprint ?? null,
    accepted_snapshot: snap ?? null,
    scope_of_work: snap ? snap.scope_of_work ?? null : live.scope_of_work,
    public_notes: snap ? snap.public_notes ?? null : live.public_notes,
    valid_until: snap ? snap.valid_until ?? null : live.valid_until,
    customer_name: (snap?.customer_name as string | undefined) || live.customer_name,
    customer_address: snap ? snap.customer_address ?? null : live.customer_address,
    billing_name: snap ? snap.billing_name ?? null : live.billing_name,
    approved_at: snap?.approved_at ?? live.approved_at,
    approved_by: snap?.approved_by ?? live.approved_by,
  };
}
