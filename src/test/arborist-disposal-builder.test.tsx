import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import QuoteBuilder from "@/components/platform/billing/QuoteBuilder";
import type { QuoteEditData } from "@/lib/edit-quote";
import { arboristQuoteDraft } from "@/lib/arborist-to-quote";
import { newArboristTree } from "@/lib/arborist-quotes";
import { toast } from "sonner";
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
beforeEach(() => { rpc.mockReset(); vi.mocked(toast.error).mockClear(); }); afterEach(cleanup);
function legacyDraft(fullScope = false) {
  const source = arboristQuoteDraft({ property_address: "12 Test Lane", trees: Array.from({ length: 12 }, (_, i) => ({
    ...newArboristTree(), species: "Sabal palm", service: "Trim", location: `Position ${i + 1}`, description: `Remove dead fronds from palm ${i + 1}.`,
    priceType: "range" as const, priceMin: "500", priceMax: "750", customerDiscussion: "STAFF PRIVATE discussion",
  })) });
  const data = fixture(source.lines.map((line, i) => ({ ...fixture().items[0], id: `tree-${i}`, description: line.description, unit_price: 625, line_total: 625 })));
  data.quote.scope_of_work = fullScope ? [source.scope, ...source.lines.map(l => l.description)].join("\n") : source.scope;
  return { data, source };
}
const scopeInput = () => screen.getByPlaceholderText("Describe the full job scope shown to the customer…") as HTMLTextAreaElement;
function enableDisposal() {
  fireEvent.change(screen.getByLabelText("Complete roadside job price"), { target: { value: "6500" } });
  fireEvent.click(screen.getByRole("button", { name: "Offer haul-away / roadside options" }));
}
describe("office-opted disposal choices", () => {
  it("keeps every legacy tree description in saved customer scope across enable, reopen and disable", async () => {
    const { data, source } = legacyDraft();
    const view = show(data);
    expect(scopeInput().value).toBe("Tree work at 12 Test Lane.");
    enableDisposal();
    const expected = [source.scope, ...source.lines.map(l => l.description)].join("\n");
    expect(scopeInput().value).toBe(expected);
    expect(scopeInput().value).not.toMatch(/STAFF PRIVATE|midpoint|500|750/);
    rpc.mockImplementation(async (_name, args) => ({ data: { quote: { ...data.quote, ...args._changes }, items: args._lines }, error: null }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(rpc).toHaveBeenCalledOnce());
    const args = rpc.mock.calls[0][1];
    expect(args._changes.scope_of_work).toBe(expected);
    view.unmount();
    show({ ...data, quote: { ...data.quote, ...args._changes }, items: args._lines });
    expect(scopeInput().value).toBe(expected);
    fireEvent.click(screen.getByRole("button", { name: "Turn alternatives off — keep haul-away" }));
    expect(scopeInput().value).toBe(expected);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2));
    expect(rpc.mock.calls[1][1]._changes.scope_of_work).toBe(expected);
  });
  it("does not duplicate descriptions already present in full structured scope", () => {
    const { data } = legacyDraft(true);
    show(data); enableDisposal();
    expect(scopeInput().value).toBe(data.quote.scope_of_work);
    fireEvent.click(screen.getByRole("button", { name: "Turn alternatives off — keep haul-away" }));
    enableDisposal();
    expect(scopeInput().value).toBe(data.quote.scope_of_work);
  });
  it("blocks disabling until unrelated alternatives added after enabling are resolved, without deleting work", () => {
    show(legacyDraft().data); enableDisposal();
    for (const description of ["Stump grinding", "Keep stump"]) {
      fireEvent.click(screen.getByRole("button", { name: /add line/i }));
      const descriptions = screen.getAllByLabelText("Line description");
      fireEvent.change(descriptions[descriptions.length - 1], { target: { value: description } });
      const kinds = screen.getAllByLabelText("Line type");
      fireEvent.change(kinds[kinds.length - 1], { target: { value: "alternative" } });
      const groups = screen.getAllByLabelText("Choice group name");
      fireEvent.change(groups[groups.length - 1], { target: { value: "Stump treatment" } });
    }
    const before = screen.getAllByLabelText("Line description").map(e => (e as HTMLInputElement).value);
    const scope = scopeInput().value;
    fireEvent.click(screen.getByRole("button", { name: "Turn alternatives off — keep haul-away" }));
    expect(screen.getAllByLabelText("Line description").map(e => (e as HTMLInputElement).value)).toEqual(before);
    expect(scopeInput().value).toBe(scope);
    expect(toast.error).toHaveBeenCalledWith("Resolve other choice groups before turning disposal alternatives off: remove those choices or change them to required work or optional add-ons.");
    expect(rpc).not.toHaveBeenCalled();
  });
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