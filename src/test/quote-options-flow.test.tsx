import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rpc = vi.hoisted(() => vi.fn());
const fromCalls = vi.hoisted(() => [] as string[]);
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc,
  from: (table: string) => { fromCalls.push(table); throw new Error(`unexpected direct ${table} write`); },
} }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ViewQuote from "@/pages/quote/ViewQuote";
import { publicPricingFields, liveIdentityFrom, type PublicPricing } from "../../supabase/functions/get-quote-public/pricing";
import { saveEditedQuote, type QuoteEditData } from "@/lib/edit-quote";
import { computeOptionTotals, lineCents } from "@/lib/quote-options";

const ID = { req: "00000000-0000-4000-8000-000000000001", haul: "00000000-0000-4000-8000-000000000002", road: "00000000-0000-4000-8000-000000000003", stump: "00000000-0000-4000-8000-000000000004" };
const liveLines = [
  { id: ID.req, description: "Remove 2 oaks", quantity: 2, unit_price: 1200.1, line_total: 2400.2, option_kind: "required", option_group: null, default_selected: true, customer_selected: null },
  { id: ID.haul, description: "Haul away", quantity: 1, unit_price: 400, line_total: 400, option_kind: "alternative", option_group: "Debris handling", default_selected: true, customer_selected: null },
  { id: ID.road, description: "Roadside placement", quantity: 1, unit_price: 150.55, line_total: 150.55, option_kind: "alternative", option_group: "Debris handling", default_selected: false, customer_selected: null },
  { id: ID.stump, description: "Stump grinding", quantity: 1, unit_price: 250, line_total: 250, option_kind: "optional", option_group: null, default_selected: false, customer_selected: null },
];
const snapshot = {
  selected_option_ids: [ID.road, ID.stump], subtotal: 2800.75, tax_rate: 7, tax_total: 196.05, discount_total: 50, total: 2946.8,
  approved_by: "Jane Customer", approved_at: "2026-10-20T15:00:00Z", scope_of_work: "Agreed scope: remove two oaks.",
  public_notes: null, valid_until: "2026-11-01", customer_name: "Jane Customer", customer_address: "1 Agreed St", billing_name: null,
  lines: liveLines.map(l => ({ ...l, selected: l.option_kind === "required" || l.id === ID.road || l.id === ID.stump })),
};
const pricing = (over: Partial<PublicPricing> = {}): PublicPricing => ({
  subtotal: 2650.2, discount_total: 50, tax_rate: 7, tax_total: 185.51, total: 2785.71, deposit_amount: 0,
  accepted_snapshot: null, fingerprint: "fp-1", line_items: liveLines,
  quote: { id: "q1", quote_number: "GCP-Q-000100", status: "sent", business_id: "b1", created_at: "2026-10-15T00:00:00Z", valid_until: "2027-01-01",
    public_notes: null, scope_of_work: "LATER EDIT", billing_name: null, deposit_required_flag: false, approved_at: null, approved_by: null, accepted_at: null },
  customer: { display_name: "Renamed Customer", email: null, phone: null }, property_address: "99 Moved Ave", ...over,
});
const live = { scope_of_work: "LATER EDIT", public_notes: null, valid_until: "2027-01-01", customer_name: "Renamed Customer", customer_address: "99 Moved Ave", billing_name: null, approved_at: null, approved_by: null };

function publicResponse(p: PublicPricing, status: string) {
  return { id: "q1", quote_number: "GCP-Q-000100", status, created_at: "2026-10-15T00:00:00Z", shortcode: "GCP", business_name: "Gulf Coast Palms",
    deposit_required: false, approval_token: "tok", customer_email: null, customer_phone: null, ...publicPricingFields(p, live) };
}
function renderPublic(body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
  return render(<HelmetProvider><MemoryRouter initialEntries={["/q/gcp/q1"]}><Routes><Route path="/q/:shortcode/:quoteId" element={<ViewQuote />} /></Routes></MemoryRouter></HelmetProvider>);
}

beforeEach(() => { rpc.mockReset(); fromCalls.length = 0; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("get-quote-public response shape", () => {
  it("reads header, scope, identity, prices and fingerprint from one database call only", () => {
    const src = readFileSync(resolve(__dirname, "../../supabase/functions/get-quote-public/index.ts"), "utf8");
    expect(src).toContain('rpc("quote_public_pricing"');
    for (const t of ["platform_quote_line_items", "platform_customers", "platform_properties"]) expect(src).not.toContain(`from("${t}")`);
    expect(src).not.toMatch(/from\("platform_quotes"\)\s*\.select/);
    expect(src).toContain('.or("status.is.null,status.eq.sent")');
  });
  it("never pairs an old scope or recipient with a newer price/fingerprint", () => {
    const before = pricing({ fingerprint: "fp-old", quote: { ...pricing().quote, scope_of_work: "Old scope" }, customer: { display_name: "Old Name", email: null, phone: null } });
    const after = pricing({ fingerprint: "fp-new", total: 9999, quote: { ...pricing().quote, scope_of_work: "New scope", billing_name: "New Bill" }, property_address: "2 New Rd" });
    const a = publicPricingFields(before, liveIdentityFrom(before)); const b = publicPricingFields(after, liveIdentityFrom(after));
    expect([a.scope_of_work, a.customer_name, a.pricing_fingerprint]).toEqual(["Old scope", "Old Name", "fp-old"]);
    expect([b.scope_of_work, b.customer_name, b.customer_address, b.total, b.pricing_fingerprint]).toEqual(["New scope", "New Bill", "2 New Rd", 9999, "fp-new"]);
    expect(JSON.stringify(b)).not.toContain("internal_notes");
  });
  it("an accepted quote returns the agreed totals, discount, scope and identity, not later edits", () => {
    const out = publicPricingFields(pricing({ accepted_snapshot: snapshot }), live);
    expect(out).toMatchObject({ total: 2946.8, discount_total: 50, subtotal: 2800.75, scope_of_work: "Agreed scope: remove two oaks.",
      customer_name: "Jane Customer", customer_address: "1 Agreed St", valid_until: "2026-11-01", approved_by: "Jane Customer" });
    expect(out.accepted_snapshot?.selected_option_ids).toEqual([ID.road, ID.stump]);
  });
  it("an open quote keeps its discount (no longer zeroed)", () => {
    expect(publicPricingFields(pricing(), live).discount_total).toBe(50);
  });
});

describe("customer quote page", () => {
  it("reloads an accepted quote that became a job with the customer's choices, agreed totals and no approve button", async () => {
    renderPublic(publicResponse(pricing({ accepted_snapshot: snapshot }), "converted"));
    expect(await screen.findAllByText(/2,946\.80/)).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: /approve quote/i })).toBeNull();
    expect(screen.getAllByText("Agreed scope: remove two oaks.").length).toBeGreaterThan(0);
    expect(screen.queryByText("LATER EDIT")).toBeNull();
    const haul = screen.getByText("Haul away").closest("div") as HTMLElement;
    expect(within(haul.parentElement as HTMLElement).getByText("Not included")).toBeInTheDocument();
    expect(screen.getAllByText(/-\$50\.00/).length).toBeGreaterThan(0);
  });
  it("starts on the proposed choices and recalculates the exact total as the customer toggles", async () => {
    renderPublic(publicResponse(pricing(), "viewed"));
    // proposed: required 2400.20 + haul 400 = 2800.20; tax 7% = 196.01; discount 50 -> 2946.21
    expect(await screen.findAllByText(/2,946\.21/)).not.toHaveLength(0);
    fireEvent.click(screen.getByLabelText(/Roadside placement/));
    fireEvent.click(screen.getByLabelText(/Stump grinding/));
    expect(screen.getAllByText(/2,946\.80/).length).toBeGreaterThan(0);
    expect((screen.getByLabelText(/Haul away/) as HTMLInputElement).checked).toBe(false);
  });
});

describe("option quote editing", () => {
  const data = (): QuoteEditData => ({
    quote: { id: "q1", business_id: "gcp", updated_at: "2026-10-20T00:00:00Z", version_number: 3 } as QuoteEditData["quote"],
    items: liveLines.map((l, i) => ({ ...l, quote_id: "q1", business_id: "gcp", unit: "each", discount_amount: 0, taxable_flag: true, sort_order: i, line_type: "service", service_catalog_id: null, created_at: "2026-10-15T00:00:00Z" })) as QuoteEditData["items"],
    customer: null,
  });
  it("saves header, every line and history through one transactional call with the expected revision", async () => {
    const d = data();
    rpc.mockResolvedValue({ data: { quote: { ...d.quote, version_number: 4 }, items: d.items }, error: null });
    const out = await saveEditedQuote(d, { total: 100 }, d.items.slice(0, 3), "user-1");
    expect(rpc).toHaveBeenCalledTimes(1);
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe("save_quote_edit");
    expect(args._expected_updated_at).toBe("2026-10-20T00:00:00Z");
    expect(args._lines).toHaveLength(3);
    expect(args._lines.some((l: Record<string, unknown>) => "customer_selected" in l)).toBe(false);
    expect(fromCalls).toEqual([]);
    expect(out.quote.version_number).toBe(4);
  });
  it("a stale or concurrent edit is refused without any partial writes", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "40001", message: "This quote changed while you were editing. Reopen it to load the latest version." } });
    await expect(saveEditedQuote(data(), { total: 1 }, data().items, "user-1")).rejects.toThrow(/changed while you were editing/);
    expect(fromCalls).toEqual([]);
  });
});

describe("cents rounding", () => {
  it("matches the server on fractional quantities and half cents", () => {
    expect(lineCents({ id: "a", description: "", quantity: 2.5, unit_price: 10.01 })).toBe(2503);
    expect(lineCents({ id: "b", description: "", quantity: 1.5, unit_price: 33.33 })).toBe(5000);
    expect(computeOptionTotals([{ id: "a", description: "", quantity: 2.5, unit_price: 10.01 }], [], { taxRate: 7, discountTotal: 0 }).total).toBe(26.78);
  });
});
