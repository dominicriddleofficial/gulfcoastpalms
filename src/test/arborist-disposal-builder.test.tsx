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
describe("independent GCP add-on authoring", () => {
  it("adds optional work off by default and saves/reopens an unassigned draft without groups", async () => {
    const data = fixture();
    data.quote.customer_id = null; data.customer = null;
    data.items[0].description = "Removing branches and leaving base of trunk";
    data.items[0].unit_price = 1300; data.items[0].line_total = 1300;
    const view = show(data);
    for (const [description, price] of [["Haul-away", "200"], ["Stump Grinding", "100"], ["Cut remaining trunk down to ground level", "250"]]) {
      fireEvent.click(screen.getByRole("button", { name: "Add optional item" }));
      const inputs = screen.getAllByLabelText("Line description");
      fireEvent.change(inputs[inputs.length - 1], { target: { value: description } });
      const prices = screen.getAllByLabelText("Unit price");
      fireEvent.change(prices[prices.length - 1], { target: { value: price } });
    }
    rpc.mockImplementation(async (_name, args) => ({ data: { quote: { ...data.quote, ...args._changes }, items: args._lines }, error: null }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(rpc).toHaveBeenCalledOnce());
    const args = rpc.mock.calls[0][1];
    expect(args._changes).toMatchObject({ subtotal: 1300, total: 1300 });
    expect(args._lines.map((l: QuoteEditData["items"][number]) => [l.option_kind, l.option_group, l.default_selected, l.unit_price])).toEqual([
      ["required", null, true, 1300], ["optional", null, false, 200], ["optional", null, false, 100], ["optional", null, false, 250],
    ]);
    view.unmount(); show({ ...data, quote: { ...data.quote, ...args._changes }, items: args._lines });
    expect(screen.getAllByRole("checkbox", { name: "Pre-selected for customer" }).every(e => !(e as HTMLInputElement).checked)).toBe(true);
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Pre-selected for customer" })[0]);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2));
    expect(rpc.mock.calls[1][1]._changes.total).toBe(1500);
    expect(rpc.mock.calls[1][1]._lines[1].default_selected).toBe(true);
  });
  it("retains twelve detailed tree lines and scope without offering disposal auto-grouping", async () => {
    const { data, source } = legacyDraft(); show(data);
    expect(screen.queryByRole("button", { name: /haul-away \/ roadside/i })).toBeNull();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Optional — customer can choose" })[1]);
    rpc.mockImplementation(async (_name, args) => ({ data: { quote: { ...data.quote, ...args._changes }, items: args._lines }, error: null }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(rpc).toHaveBeenCalledOnce());
    const args = rpc.mock.calls[0][1];
    expect(args._changes.scope_of_work).toBe(source.scope);
    expect(args._lines.map((l: QuoteEditData["items"][number]) => l.description)).toEqual(source.lines.map(l => l.description));
    expect(args._lines[1]).toMatchObject({ option_kind: "optional", default_selected: false });
  });
  it("preserves saved legacy groups until explicit conversion and blocks a negative delta as an extra", async () => {
    const data = fixture();
    data.items.push(...["Haul-away", "Roadside placement"].map((description, i) => ({ ...data.items[0], id: `alt-${i}`, description,
      unit_price: i ? -1000 : 0, line_total: i ? -1000 : 0, option_kind: "alternative", option_group: "Disposal", default_selected: !i })));
    show(data);
    expect(screen.getAllByLabelText("Legacy line type")).toHaveLength(2);
    fireEvent.change(screen.getAllByLabelText("Legacy line type")[1], { target: { value: "optional" } });
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("negative"));
    expect((screen.getAllByLabelText("Legacy line type")[1] as HTMLSelectElement).value).toBe("alternative");
    expect(screen.getAllByLabelText("Line description").map(e => (e as HTMLInputElement).value)).toEqual(data.items.map(l => l.description));
    expect(rpc).not.toHaveBeenCalled();
  });
});
