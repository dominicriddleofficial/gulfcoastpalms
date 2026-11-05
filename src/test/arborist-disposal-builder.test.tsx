import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import QuoteBuilder from "@/components/platform/billing/QuoteBuilder";
import type { QuoteEditData } from "@/lib/edit-quote";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc, storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
  from: () => { const q = { select: () => q, eq: () => q, order: () => q, limit: () => q, or: () => q, then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve) }; return q; } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/components/platform/billing/QuotePreviewPanel", () => ({ default: () => null }));
vi.mock("@/components/platform/billing/SendQuoteModal", () => ({ default: () => null }));
vi.mock("@/components/platform/billing/NewCustomerSheet", () => ({ default: () => null }));
const fixture = (items?: QuoteEditData["items"]): QuoteEditData => ({
  quote: { id: "q", business_id: "gcp", customer_id: "c", quote_number: "GCP-Q-1", source_arborist_quote_id: "report", status: "draft", tax_rate: 0, discount_total: 0, deposit_required_flag: false, created_at: "2026-11-05T00:00:00Z", updated_at: "2026-11-05T00:00:00Z", scope_of_work: "All trees" } as QuoteEditData["quote"],
  customer: { id: "c", display_name: "Fixture", email: null, phone: null },
  items: items ?? [{ id: "base", quote_id: "q", business_id: "gcp", description: "All tree work with haul-away", quantity: 1, unit_price: 7500, line_total: 7500, option_kind: "required", default_selected: true, discount_amount: 0, taxable_flag: true } as QuoteEditData["items"][number]] });
function show(d = fixture()) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><QuoteBuilder businessId="gcp" businesses={[{ id: "gcp", shortcode: "GCP", public_brand_name: "Gulf Coast Palms", logo_url: null }]} userId="office" editingQuote={d} onClose={vi.fn()} onCreated={vi.fn()} /></QueryClientProvider>); }
beforeEach(() => rpc.mockReset()); afterEach(cleanup);
describe("office-opted disposal choices", () => {
  it("saves two complete totals only after enabling, reopens and turns off keeping haul-away", async () => {
    const view = show();
    expect(screen.getAllByLabelText("Unit price")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Complete roadside job price"), { target: { value: "6500" } });
    fireEvent.click(screen.getByRole("button", { name: "Offer haul-away / roadside options" }));
    expect(screen.getAllByLabelText("Unit price").map(e => (e as HTMLInputElement).value)).toEqual(["6500.00", "1000.00", "0.00"]);
    rpc.mockImplementation(async (_name, args) => ({ data: { quote: fixture().quote, items: args._lines }, error: null }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(rpc).toHaveBeenCalledOnce());
    const saved = rpc.mock.calls[0][1]._lines as QuoteEditData["items"];
    expect(saved.map(l => [l.option_kind, l.unit_price, l.default_selected])).toEqual([["required",6500,true],["alternative",1000,true],["alternative",0,false]]);
    view.unmount(); show(fixture(saved));
    fireEvent.click(screen.getByRole("button", { name: "Turn alternatives off — keep haul-away" }));
    expect(screen.getAllByLabelText("Unit price").map(e => (e as HTMLInputElement).value)).toEqual(["7500.00"]);
    expect((screen.getByLabelText("Complete roadside job price") as HTMLInputElement).value).toBe("6500.00");
  });
  it("never invents an unpriced roadside alternative", () => {
    show(); fireEvent.click(screen.getByRole("button", { name: "Offer haul-away / roadside options" }));
    expect(screen.getAllByLabelText("Unit price")).toHaveLength(1); expect(rpc).not.toHaveBeenCalled();
  });
});