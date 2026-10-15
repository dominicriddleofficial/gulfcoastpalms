import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import QuoteBuilder from "@/components/platform/billing/QuoteBuilder";
import { saveEditedQuote, type QuoteEditData } from "@/lib/edit-quote";
import { toast } from "sonner";

const db = vi.hoisted(() => ({
  quote: {} as Record<string, any>, lines: [] as Array<Record<string, any>>,
  writes: [] as Array<{ table: string; op: string; value: any }>,
  failOnce: "", rpc: vi.fn(), invoke: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc: db.rpc, functions: { invoke: db.invoke },
  storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
  from(table: string) {
    let op = "read", value: any;
    const filters: Array<[string, any]> = [];
    let ids: string[] | undefined;
    const query: Record<string, any> = {};
    for (const name of ["select", "order", "limit", "or"]) query[name] = () => query;
    query.eq = (key: string, val: any) => { filters.push([key, val]); return query; };
    query.in = (_key: string, val: string[]) => { ids = val; return query; };
    for (const name of ["insert", "update", "upsert", "delete"]) query[name] = (v: any) => { op = name; value = v; return query; };
    const execute = () => {
      const matches = (row: any) => filters.every(([k, v]) => row[k] === v) && (!ids || ids.includes(row.id));
      if (op !== "read") {
        db.writes.push({ table, op, value: structuredClone(value) });
        if (db.failOnce === `${table}:${op}`) {
          db.failOnce = "";
          return { data: null, error: { message: "Simulated save failure" } };
        }
      }
      if (table === "platform_quotes") {
        if (!matches(db.quote)) return { data: null, error: { message: "Quote changed" } };
        if (op === "update") Object.assign(db.quote, value, { updated_at: "2026-10-15T16:00:00Z" });
        if (op === "update" && db.failOnce === "lost-update-response") {
          db.failOnce = "";
          throw new Error("Network response lost after saving");
        }
        if (op === "insert") throw new Error("Editing must never insert a quote");
        return { data: structuredClone(db.quote), error: null };
      }
      if (table === "platform_quote_line_items") {
        if (op === "upsert") {
          for (const line of value) {
            const index = db.lines.findIndex(l => l.id === line.id);
            if (index === -1) db.lines.push(structuredClone(line)); else db.lines[index] = structuredClone(line);
          }
          return { data: structuredClone(value), error: null };
        }
        const selected = db.lines.filter(matches);
        if (op === "delete") db.lines = db.lines.filter(l => !matches(l));
        return { data: structuredClone(selected), error: null };
      }
      return { data: [], error: null };
    };
    query.single = async () => execute();
    query.maybeSingle = async () => execute();
    query.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve().then(execute).then(resolve, reject);
    return query;
  },
} }));

function fixture(): QuoteEditData {
  const quote = {
    id: "quote-37", business_id: "gcp", quote_number: "GCP-Q-000037", customer_id: "customer-1",
    property_id: "property-1", lead_id: "lead-1", status: "viewed", is_read_only: false, deleted_at: null,
    billing_name: "Sean Whitehead", subtotal: 4350, total: 4350, tax_rate: 0, tax_total: 0, discount_total: 0,
    deposit_required_flag: false, deposit_type: "percentage", deposit_value: 50, deposit_amount_calculated: 0,
    scope_of_work: "Storm cleanup", public_notes: "", internal_notes: "Call before arrival",
    valid_until: "2026-11-14", created_at: "2026-10-15T15:00:00Z", updated_at: "2026-10-15T15:17:50Z",
    version_number: 1, sent_at: "2026-10-15T15:10:00Z", accepted_at: null,
  } as QuoteEditData["quote"];
  const prices = [750, 450, 750, 500, 300, 800, 800];
  const items = prices.map((price, i) => ({
    id: `item-${i}`, business_id: "gcp", quote_id: "quote-37", description: `Tree removal ${i + 1}`,
    quantity: 1, unit: "each", unit_price: price, line_total: price, discount_amount: 0,
    taxable_flag: true, sort_order: i, line_type: "service", service_catalog_id: null,
    created_at: "2026-10-15T15:00:00Z",
  }));
  return { quote, items, customer: { id: "customer-1", display_name: "Sean Whitehead", email: null, phone: null } };
}
const completed = vi.fn();
function setup(data: QuoteEditData | null = fixture()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>
    <QuoteBuilder businessId="gcp" businesses={[{ id: "gcp", public_brand_name: "Gulf Coast Palms", shortcode: "gcp", logo_url: null }]}
      userId="owner-1" editingQuote={data ?? undefined} onClose={() => {}} onCreated={completed} />
  </QueryClientProvider>);
}
function save() { fireEvent.click(screen.getByRole("button", { name: "Save Changes" })); }

beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  const original = fixture(); db.quote = structuredClone(original.quote); db.lines = structuredClone(original.items);
  db.writes = []; db.failOnce = "";
  db.rpc.mockResolvedValue({ data: "GCP-Q-000038", error: null });
});

describe("Editing saved quotes", () => {
  it("keeps new quotes on the existing create and send flow", async () => {
    setup(null);
    await waitFor(() => expect(db.rpc).toHaveBeenCalledWith("generate_next_number", { _business_id: "gcp", _record_type: "quote" }));
    expect(screen.getByRole("heading", { name: "New Quote" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save as Draft" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send Quote" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save Changes" })).toBeNull();
    expect(db.writes).toHaveLength(0);
  });

  it("preserves existing units, item discounts, tax exclusions, notes, and deposit settings", async () => {
    const data = fixture();
    data.items[0] = { ...data.items[0], unit: "hour", discount_amount: 50, taxable_flag: false, service_catalog_id: "service-1", line_total: 700 };
    data.quote = { ...data.quote, subtotal: 4300, tax_rate: 10, tax_total: 360, discount_total: 100,
      total: 4560, deposit_required_flag: true, deposit_type: "fixed", deposit_value: 250, deposit_amount_calculated: 250 };
    db.quote = structuredClone(data.quote); db.lines = structuredClone(data.items);
    setup(data); save();
    await waitFor(() => expect(completed).toHaveBeenCalledOnce());
    expect(db.lines[0]).toMatchObject({ unit: "hour", discount_amount: 50, taxable_flag: false, service_catalog_id: "service-1", line_total: 700 });
    expect(db.quote).toMatchObject({ total: 4560, tax_total: 360, discount_total: 100,
      deposit_type: "fixed", deposit_amount_calculated: 250, internal_notes: "Call before arrival", valid_until: "2026-11-14" });
  });

  it.each(["draft", "sent", "viewed"])("loads a %s quote without generating a number or changing data", async status => {
    const data = fixture(); data.quote.status = status;
    setup(data);
    expect(screen.getByRole("heading", { name: "Edit Quote" })).toBeTruthy();
    expect(screen.getAllByLabelText("Line description")).toHaveLength(7);
    expect(screen.getAllByLabelText("Unit price")[0]).toHaveValue(750);
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Send Quote" })).toBeNull();
    expect(document.body.textContent).toContain("$4,350.00");
    await act(async () => {});
    expect(db.rpc).not.toHaveBeenCalled(); expect(db.writes).toHaveLength(0);
  });

  it("edits prices and quantities, adds/removes lines, and persists the same quote for reopening", async () => {
    const view = setup();
    fireEvent.change(screen.getAllByLabelText("Unit price")[0], { target: { value: "650" } });
    fireEvent.change(screen.getAllByLabelText("Quantity")[1], { target: { value: "2" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Remove line" })[6]);
    fireEvent.click(screen.getByRole("button", { name: "Add Line" }));
    fireEvent.change(screen.getAllByLabelText("Line description")[6], { target: { value: "Haul debris" } });
    fireEvent.change(screen.getAllByLabelText("Unit price")[6], { target: { value: "125" } });
    save();
    await waitFor(() => expect(completed).toHaveBeenCalledOnce());
    expect(db.quote).toMatchObject({ id: "quote-37", quote_number: "GCP-Q-000037", total: 4025,
      status: "viewed", customer_id: "customer-1", property_id: "property-1", lead_id: "lead-1",
      deposit_required_flag: false, tax_rate: 0, version_number: 2, public_notes: null,
      sent_at: "2026-10-15T15:10:00Z" });
    expect(db.lines).toHaveLength(7);
    expect(db.lines.find(l => l.id === "item-6")).toBeUndefined();
    expect(db.writes.filter(w => w.table === "platform_quote_versions")).toHaveLength(1);
    expect(db.writes.some(w => w.table === "platform_quotes" && w.op === "insert")).toBe(false);
    expect(db.invoke).not.toHaveBeenCalled();
    view.unmount();
    setup({ ...fixture(), quote: db.quote as any, items: db.lines as any });
    expect(screen.getAllByLabelText("Unit price")[0]).toHaveValue(650);
    expect(document.body.textContent).toContain("$4,025.00");
    await act(async () => {});
  });

  it.each(["platform_quote_line_items:upsert", "platform_quotes:update"])("keeps the editor open and restores originals after %s fails", async failure => {
    setup(); db.failOnce = failure;
    fireEvent.change(screen.getAllByLabelText("Unit price")[0], { target: { value: "650" } });
    save();
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(completed).not.toHaveBeenCalled();
    expect(db.quote.total).toBe(4350); expect(db.lines[0].unit_price).toBe(750);
    expect(screen.getAllByLabelText("Unit price")[0]).toHaveValue(650);
    save();
    await waitFor(() => expect(completed).toHaveBeenCalledOnce());
    expect(db.quote.total).toBe(4250); expect(db.lines).toHaveLength(7);
  });

  it("verifies a successful save after a lost response without restoring stale line items", async () => {
    setup(); db.failOnce = "lost-update-response";
    fireEvent.change(screen.getAllByLabelText("Unit price")[0], { target: { value: "650" } });
    save();
    await waitFor(() => expect(completed).toHaveBeenCalledOnce());
    expect(db.quote.total).toBe(4250); expect(db.lines[0].unit_price).toBe(650);
    expect(db.writes.filter(w => w.table === "platform_quote_line_items" && w.op === "upsert")).toHaveLength(1);
  });

  it("rejects a stale or read-only quote before any writes", async () => {
    const data = fixture(); db.quote.updated_at = "changed";
    await expect(saveEditedQuote(data, { total: 4350 }, data.items, "owner-1")).rejects.toThrow("changed while");
    db.quote.updated_at = data.quote.updated_at; db.quote.is_read_only = true;
    await expect(saveEditedQuote(data, { total: 4350 }, data.items, "owner-1")).rejects.toThrow("cannot be edited");
    expect(db.writes).toHaveLength(0);
  });

  it("rejects zero quantity and double taps do not duplicate saves", async () => {
    setup();
    fireEvent.change(screen.getAllByLabelText("Quantity")[0], { target: { value: "0" } });
    save();
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(db.writes).toHaveLength(0);
    fireEvent.change(screen.getAllByLabelText("Quantity")[0], { target: { value: "2" } });
    const button = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(completed).toHaveBeenCalledOnce());
    expect(db.writes.filter(w => w.table === "platform_quotes" && w.op === "update")).toHaveLength(1);
  });
});
