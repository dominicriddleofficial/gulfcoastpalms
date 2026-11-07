import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import QuoteBuilder from "@/components/platform/billing/QuoteBuilder";
import type { QuoteEditData } from "@/lib/edit-quote";
import { toast } from "sonner";

/* In-memory backend that mirrors the server's customer-assignment rules (the trigger itself is
   exercised against real SQL in scripts/test-quote-assignment.mjs). */
const db = vi.hoisted(() => ({
  quote: {} as Record<string, any>, lines: [] as Array<Record<string, any>>,
  customers: [] as Array<Record<string, any>>, inserted: [] as Array<{ table: string; value: any }>,
  writes: [] as Array<{ table: string; op: string; value: any; filters: Array<[string, any]> }>,
  failAssignOnce: false, rpc: vi.fn(), invoke: vi.fn(),
  applyDraft: { scope: "", lines: [] as Array<{ description: string; qty: string; unit: string; price: string; issue: string | null }> },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/components/platform/billing/QuoteAssistant", () => ({
  default: ({ open, onApply }: { open: boolean; onApply: (d: unknown) => void }) =>
    open ? <button type="button" onClick={() => onApply(db.applyDraft)}>mock-apply</button> : null,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc: db.rpc, functions: { invoke: db.invoke },
  auth: { getSession: async () => ({ data: { session: null } }) },
  storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
  from(table: string) {
    let op = "read", value: any;
    const filters: Array<[string, any]> = [];
    const query: Record<string, any> = {};
    for (const name of ["select", "order", "limit", "or", "in"]) query[name] = () => query;
    query.eq = (k: string, v: any) => { filters.push([k, v]); return query; };
    query.is = (k: string, v: any) => { filters.push([k, v]); return query; };
    for (const name of ["insert", "update", "upsert", "delete"]) query[name] = (v: any) => { op = name; value = v; return query; };
    const matches = (row: any) => filters.every(([k, v]) => (row[k] ?? null) === v);
    const execute = () => {
      if (op !== "read") db.writes.push({ table, op, value: structuredClone(value), filters: [...filters] });
      if (table === "platform_customers") return { data: db.customers.filter(matches), error: null };
      if (table === "platform_quotes") {
        if (op === "insert") { const row = { id: "new-quote", ...value }; db.inserted.push({ table, value: row }); return { data: row, error: null }; }
        if (!matches(db.quote)) return { data: null, error: { message: "Quote changed" } };
        if (op === "update" && "customer_id" in value) {
          if (db.failAssignOnce) { db.failAssignOnce = false; return { data: null, error: { message: "Network error" } }; }
          const c = db.customers.find(x => x.id === value.customer_id);
          if (db.quote.customer_id || db.quote.status !== "draft" || db.quote.sent_at) return { data: null, error: { code: "23514", message: "Only an unassigned, unsent draft can have its customer chosen." } };
          if (!c || c.business_id !== db.quote.business_id) return { data: null, error: { code: "23514", message: "The customer belongs to a different workspace." } };
        }
        if (op === "update") Object.assign(db.quote, value, { updated_at: "2026-11-06T16:00:00Z" });
        return { data: structuredClone(db.quote), error: null };
      }
      if (table === "platform_quote_line_items") {
        if (op === "insert") { db.inserted.push({ table, value }); return { data: value, error: null }; }
        if (op === "upsert") {
          for (const line of value) { const i = db.lines.findIndex(l => l.id === line.id); if (i === -1) db.lines.push(structuredClone(line)); else db.lines[i] = structuredClone(line); }
          return { data: structuredClone(value), error: null };
        }
        const selected = db.lines.filter(matches);
        if (op === "delete") db.lines = db.lines.filter(l => !matches(l));
        return { data: structuredClone(selected), error: null };
      }
      return { data: op === "read" ? [] : null, error: null };
    };
    query.single = async () => execute();
    query.maybeSingle = async () => execute();
    query.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve().then(execute).then(res, rej);
    return query;
  },
} }));
vi.mock("@/components/platform/AddressAutocomplete", () => ({
  default: ({ value, onTextChange, label }: { value: string; onTextChange: (v: string) => void; label?: string }) => (
    <input aria-label={label} value={value} onChange={(e) => onTextChange(e.target.value)} />
  ),
}));

const PPS = "pps-biz";
function fixture(over: Partial<QuoteEditData["quote"]> = {}): QuoteEditData {
  const quote = {
    id: "quote-7", business_id: PPS, quote_number: "PPS-Q-000099", customer_id: null, property_id: null, lead_id: null,
    status: "draft", is_read_only: false, deleted_at: null, billing_name: null, subtotal: 10875, total: 10875,
    tax_rate: 0, tax_total: 0, discount_total: 0, deposit_required_flag: false, deposit_type: "percentage", deposit_value: 50,
    deposit_amount_calculated: 0, scope_of_work: "Patio and garage coating", public_notes: "", internal_notes: "",
    valid_until: null, created_at: "2026-11-06T15:00:00Z", updated_at: "2026-11-06T15:00:00Z", version_number: 1,
    sent_at: null, accepted_at: null, ...over,
  } as QuoteEditData["quote"];
  const items = [["Patio", 605, 7.5, 4537.5], ["Garage", 975, 6.5, 6337.5]].map(([d, q, p, t], i) => ({
    id: `item-${i}`, business_id: PPS, quote_id: "quote-7", description: String(d), quantity: Number(q), unit: "sq ft",
    unit_price: Number(p), line_total: Number(t), discount_amount: 0, taxable_flag: true, sort_order: i, line_type: "service",
    service_catalog_id: null, created_at: "2026-11-06T15:00:00Z", option_kind: "required", option_group: null, default_selected: true, customer_selected: null,
  }));
  return { quote, items, customer: null } as unknown as QuoteEditData;
}
function setup(data?: QuoteEditData) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>
    <QuoteBuilder businessId={PPS} businesses={[{ id: PPS, public_brand_name: "Prestige Property Services", shortcode: "pps", logo_url: null }]}
      userId="owner-1" editingQuote={data} onClose={() => {}} onCreated={() => {}} />
  </QueryClientProvider>);
}
const assignWrites = () => db.writes.filter(w => w.table === "platform_quotes" && w.op === "update" && "customer_id" in w.value);

beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  const f = fixture(); db.quote = structuredClone(f.quote); db.lines = structuredClone(f.items);
  db.customers = [{ id: "cust-pps", business_id: PPS, display_name: "Pat Prestige", email: null, phone: null, company_name: null },
    { id: "cust-gcp", business_id: "gcp-biz", display_name: "Gail Gulf", email: null, phone: null, company_name: null }];
  db.writes = []; db.inserted = []; db.failAssignOnce = false;
  db.rpc.mockResolvedValue({ data: "PPS-Q-000100", error: null });
});

async function pickCustomer(name: string) {
  fireEvent.focus(screen.getByPlaceholderText("Search customer…"));
  await waitFor(() => expect(screen.getByText(name)).toBeTruthy(), { timeout: 2000 });
  fireEvent.click(screen.getByText(name));
}

describe("Unassigned draft customer selection", () => {
  it("saves an unassigned PPS draft with 25% deposit and preserves it after reopening", async () => {
    const view = setup(fixture());
    fireEvent.click(screen.getByRole("checkbox", { name: "Deposit Required" }));
    fireEvent.click(screen.getByRole("button", { name: "25%" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(db.quote.deposit_value).toBe(25));
    expect(db.quote).toMatchObject({ customer_id: null, status: "draft", total: 10875,
      deposit_required_flag: true, deposit_type: "percentage", deposit_amount_calculated: 2718.75 });
    expect(db.lines.map(l => l.id)).toEqual(["item-0", "item-1"]);
    expect(db.invoke).not.toHaveBeenCalled();
    view.unmount();
    setup({ quote: structuredClone(db.quote), items: structuredClone(db.lines), customer: null } as QuoteEditData);
    expect(screen.getByRole("checkbox", { name: "Deposit Required" })).toBeChecked();
    expect(screen.getByLabelText("Deposit percentage")).toHaveValue(25);
    expect(screen.getAllByText("$2,718.75").length).toBeGreaterThan(0);
    expect(screen.getByText("$8,156.25")).toBeTruthy();
  });

  it("blocks a required zero or excessive deposit with a persistent error and keeps work editable", async () => {
    setup(fixture());
    fireEvent.click(screen.getByRole("checkbox", { name: "Deposit Required" }));
    for (const value of ["0", "101", ""]) {
      fireEvent.change(screen.getByLabelText("Deposit percentage"), { target: { value } });
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
      expect(screen.getByRole("alert")).toHaveTextContent("no more than 100");
      expect(db.writes).toHaveLength(0);
    }
  });

  it("keeps a concurrency refusal visible and preserves unsaved scope", async () => {
    setup(fixture());
    fireEvent.change(screen.getByLabelText("Scope of Work"), { target: { value: "Patio revised scope" } });
    db.quote.updated_at = "2026-11-07T00:00:00Z";
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Reopen it"));
    expect(screen.getByLabelText("Scope of Work")).toHaveValue("Patio revised scope");
    expect(db.writes).toHaveLength(0);
  });

  it("offers only same-workspace customers and attaches the chosen one on save", async () => {
    setup(fixture());
    fireEvent.focus(screen.getByPlaceholderText("Search customer…"));
    await waitFor(() => expect(screen.getByText("Pat Prestige")).toBeTruthy(), { timeout: 2000 });
    expect(screen.queryByText("Gail Gulf")).toBeNull();
    fireEvent.click(screen.getByText("Pat Prestige"));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(db.quote.customer_id).toBe("cust-pps"));
    const [w] = assignWrites();
    expect(w.filters).toEqual(expect.arrayContaining([["id", "quote-7"], ["business_id", PPS], ["customer_id", null], ["status", "draft"]]));
    expect(db.quote.status).toBe("draft");
    expect(db.invoke).not.toHaveBeenCalled();
  });

  it("rejects a foreign-workspace customer at the server and leaves the draft unassigned", async () => {
    // Force the foreign row into the picker to prove the server boundary holds even if the UI were bypassed.
    db.customers[1].business_id = PPS;
    setup(fixture());
    await pickCustomer("Gail Gulf");
    db.customers[1].business_id = "gcp-biz";
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("different workspace")));
    expect(db.quote.customer_id).toBeNull();
  });

  it("keeps the draft unassigned after a failed attach and succeeds on retry", async () => {
    setup(fixture());
    await pickCustomer("Pat Prestige");
    db.failAssignOnce = true;
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("customer couldn't be attached")));
    expect(db.quote.customer_id).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(db.quote.customer_id).toBe("cust-pps"));
    expect(assignWrites()).toHaveLength(2);
  });

  it.each([
    ["an assigned draft", { customer_id: "cust-pps" }],
    ["a sent quote", { customer_id: "cust-pps", status: "sent", sent_at: "2026-11-06T15:10:00Z" }],
  ])("never offers or writes a customer change on %s", async (_label, over) => {
    const f = fixture(over as Partial<QuoteEditData["quote"]>);
    db.quote = structuredClone(f.quote);
    setup({ ...f, customer: { id: "cust-pps", display_name: "Pat Prestige", email: null, phone: null } } as QuoteEditData);
    expect(screen.queryByPlaceholderText("Search customer…")).toBeNull();
    expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
    expect(screen.queryByTestId("quote-new-customer")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(db.writes.some(w => w.table === "platform_quotes")).toBe(true));
    expect(assignWrites()).toHaveLength(0);
    expect(db.quote.customer_id).toBe("cust-pps");
  });
});

describe("AI-origin lines cannot be saved without a valid quantity and rate", () => {
  async function applyAi() {
    db.applyDraft = { scope: "Patio", lines: [
      { description: "Patio coating", qty: "605", unit: "sq ft", price: "", issue: "Price not stated — enter it." },
    ] };
    setup();
    await waitFor(() => expect(db.rpc).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId("quote-ai-open"));
    fireEvent.click(screen.getByRole("button", { name: "mock-apply" }));
  }
  const saveDraft = () => fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }));
  const blocked = () => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("flagged line"));

  it("editing only the quantity keeps the missing price blocking save", async () => {
    await applyAi();
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "600" } });
    expect(screen.getByTestId("ai-line-issue")).toBeTruthy();
    saveDraft(); blocked();
    expect(db.inserted).toHaveLength(0);
  });

  it("deleting a previously entered rate blocks save again", async () => {
    await applyAi();
    fireEvent.change(screen.getByLabelText("Unit price"), { target: { value: "7.50" } });
    expect(screen.queryByTestId("ai-line-issue")).toBeNull();
    fireEvent.change(screen.getByLabelText("Unit price"), { target: { value: "" } });
    expect(screen.getByTestId("ai-line-issue")).toBeTruthy();
    saveDraft(); blocked();
    expect(db.inserted).toHaveLength(0);
  });

  it("rejects zero, huge and non-finite values", async () => {
    await applyAi();
    for (const price of ["0", "1e308", "99999999999"]) {
      fireEvent.change(screen.getByLabelText("Unit price"), { target: { value: price } });
      vi.mocked(toast.error).mockClear();
      saveDraft(); blocked();
    }
    fireEvent.change(screen.getByLabelText("Unit price"), { target: { value: "7.5" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "1e9" } });
    vi.mocked(toast.error).mockClear(); saveDraft(); blocked();
    expect(db.inserted).toHaveLength(0);
  });

  it("saves exact cents once quantity and rate are valid", async () => {
    await applyAi();
    fireEvent.change(screen.getByLabelText("Unit price"), { target: { value: "7.50" } });
    saveDraft();
    await waitFor(() => expect(db.inserted.some(i => i.table === "platform_quote_line_items")).toBe(true));
    const quote = db.inserted.find(i => i.table === "platform_quotes")!.value;
    const [line] = db.inserted.find(i => i.table === "platform_quote_line_items")!.value;
    expect(line).toMatchObject({ quantity: 605, unit: "sq ft", unit_price: 7.5, line_total: 4537.5 });
    // New-quote tax/deposit defaults are the builder's visible settings and are untouched by Apply.
    expect(quote).toMatchObject({ subtotal: 4537.5, customer_id: null, status: "draft" });
    await act(async () => {});
  });
});
