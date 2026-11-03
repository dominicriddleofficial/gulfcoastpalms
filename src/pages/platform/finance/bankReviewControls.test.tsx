import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Fake backend: records every call; nothing leaves the test.
type Call = { table: string; op: string; payload?: unknown; filters: Array<[string, string, unknown]> };
const calls: Call[] = [];
let responder: (c: Call) => { data: unknown; error: { message: string } | null } = () => ({ data: [], error: null });
function builder(table: string) {
  const c: Call = { table, op: "select", filters: [] };
  const b: Record<string, unknown> = {};
  const chain = (name: string) => (...args: unknown[]) => {
    if (["update", "insert", "delete"].includes(name)) { c.op = name; c.payload = args[0]; }
    else if (["eq", "gte", "lt", "in"].includes(name)) c.filters.push([name, String(args[0]), args[1]]);
    return b;
  };
  for (const n of ["select", "update", "insert", "delete", "eq", "gte", "lt", "in", "order", "range", "limit"]) b[n] = chain(n);
  b.maybeSingle = () => { c.op = c.op === "select" ? "maybeSingle" : c.op; return b; };
  b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => { calls.push(c); return Promise.resolve(responder(c)).then(res, rej); };
  return b;
}
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (t: string) => builder(t), rpc: vi.fn() } }));
const toasts: Array<{ title?: string; variant?: string }> = [];
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: (t: { title?: string; variant?: string }) => toasts.push(t) }) }));

import BankImportPanel from "./BankImportPanel";
import { AllocateShare } from "./TaxCenterPanel";
import type { CashSummary } from "@/lib/cashRecords";

const BIZ = "biz-gcp";
const row = (id: string, extra: Record<string, unknown>) => ({ id, txn_date: "2026-02-02", description: `MOCK ${id}`, amount_cents: -10000, classification: "expense", category: null, matched_type: null, matched_id: null, possible_duplicate_of: null, owner_resolution: null, resolution_note: null, ...extra });
const ROWS = [
  row("m1", { classification: "matched", matched_type: "expense", matched_id: "e1" }),
  row("d1", { possible_duplicate_of: "d0" }),
  row("s1", { owner_resolution: "separate", resolution_note: "two trips" }),
];
const summary = {
  matchables: [{ id: "e1", type: "expense", date: "2026-02-02", amountCents: 10000, direction: "out", label: "Fuel expense" }],
  issues: [
    { kind: "bank_possible_duplicate", id: "d1", date: "2026-02-02", amountCents: -10000, detail: "Looks like another imported row" },
    { kind: "bank_needs_review", id: "m1", date: null, amountCents: 0, detail: "" },
    { kind: "bank_needs_review", id: "s1", date: null, amountCents: 0, detail: "" },
  ],
} as unknown as CashSummary;

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const updates = () => calls.filter((c) => c.table === "finance_bank_transactions" && c.op === "update");
const item = (id: string) => screen.getByText(new RegExp(`MOCK ${id}`)).closest("li") as HTMLElement;

beforeEach(() => {
  calls.length = 0; toasts.length = 0;
  responder = (c) => c.table === "finance_bank_transactions" && c.op === "select" ? { data: ROWS, error: null } : { data: [{ id: "ok" }], error: null };
});

describe("bank review controls (mocked rows, no real writes)", () => {
  it("Undo on a matched row sends it back to review and clears the match", async () => {
    wrap(<BankImportPanel businessId={BIZ} year={2026} summary={summary} onChanged={() => {}} />);
    await screen.findByText(/MOCK m1/);
    expect(within(item("m1")).getByText(/Matched to Fuel expense/)).toBeTruthy();
    fireEvent.click(within(item("m1")).getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(updates()).toHaveLength(1));
    expect(updates()[0].payload).toEqual({ classification: "needs_review", matched_id: null, matched_type: null });
    expect(updates()[0].filters).toEqual(expect.arrayContaining([["eq", "id", "m1"], ["eq", "business_id", BIZ]]));
  });

  it("confirming separate needs a note and saves it", async () => {
    wrap(<BankImportPanel businessId={BIZ} year={2026} summary={summary} onChanged={() => {}} />);
    await screen.findByText(/MOCK d1/);
    fireEvent.click(within(item("d1")).getByRole("button", { name: /separate transaction/i }));
    const confirm = within(item("d1")).getByRole("button", { name: /Confirm/ }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(within(item("d1")).getByLabelText("Why is this separate?"), { target: { value: "  second visit same day " } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(updates()).toHaveLength(1));
    expect(updates()[0].payload).toEqual({ owner_resolution: "separate", resolution_note: "second visit same day" });
  });

  it("Undo separate clears the owner's decision", async () => {
    wrap(<BankImportPanel businessId={BIZ} year={2026} summary={summary} onChanged={() => {}} />);
    await screen.findByText(/MOCK s1/);
    fireEvent.click(within(item("s1")).getByRole("button", { name: /Undo “separate”/ }));
    await waitFor(() => expect(updates()).toHaveLength(1));
    expect(updates()[0].payload).toEqual({ owner_resolution: null, resolution_note: null });
  });

  it("a save that changes no row shows an error instead of pretending", async () => {
    const onChanged = vi.fn();
    responder = (c) => c.op === "update" ? { data: [], error: null } : c.table === "finance_bank_transactions" ? { data: ROWS, error: null } : { data: [], error: null };
    wrap(<BankImportPanel businessId={BIZ} year={2026} summary={summary} onChanged={onChanged} />);
    await screen.findByText(/MOCK m1/);
    fireEvent.click(within(item("m1")).getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(toasts.some((t) => t.title === "Didn't save" && t.variant === "destructive")).toBe(true));
    expect(onChanged).not.toHaveBeenCalled();
  });
});

describe("shared bill share (mocked, no real writes)", () => {
  const open = async (current: number) => {
    const onSaved = vi.fn();
    wrap(<AllocateShare expenseId="exp1" businessId={BIZ} currentCents={current} remainingCents={4000} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: current ? "Change share" : /Assign/ }));
    return onSaved;
  };
  const allocCalls = () => calls.filter((c) => c.table === "finance_expense_allocations" && c.op !== "maybeSingle");

  it("reducing an existing share updates it", async () => {
    responder = (c) => c.op === "maybeSingle" ? { data: { id: "al1" }, error: null } : { data: [{ id: "al1" }], error: null };
    const onSaved = await open(6000);
    const input = await screen.findByPlaceholderText("0.00");
    expect((input as HTMLInputElement).value).toBe("60.00");
    fireEvent.change(input, { target: { value: "25.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Save share" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(allocCalls()[0]).toMatchObject({ op: "update", payload: { amount: 25.5 } });
    expect(allocCalls()[0].filters).toContainEqual(["eq", "id", "al1"]);
  });

  it("entering 0 removes the share", async () => {
    responder = (c) => c.op === "maybeSingle" ? { data: { id: "al1" }, error: null } : { data: [{ id: "al1" }], error: null };
    const onSaved = await open(6000);
    fireEvent.change(await screen.findByPlaceholderText("0.00"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save share" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(allocCalls()[0].op).toBe("delete");
    expect(toasts.at(-1)?.title).toBe("Share removed");
  });

  it("refuses more than the bill allows, without saving", async () => {
    await open(6000);
    fireEvent.change(await screen.findByPlaceholderText("0.00"), { target: { value: "100.01" } });
    fireEvent.click(screen.getByRole("button", { name: "Save share" }));
    await waitFor(() => expect(toasts.at(-1)?.variant).toBe("destructive"));
    expect(calls).toHaveLength(0);
  });

  it("a rejected save shows an error and does not report success", async () => {
    responder = (c) => c.op === "maybeSingle" ? { data: null, error: null } : { data: null, error: { message: "share exceeds bill" } };
    const onSaved = await open(0);
    fireEvent.change(await screen.findByPlaceholderText("0.00"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Save share" }));
    await waitFor(() => expect(toasts.at(-1)?.title).toBe("Couldn't save the share"));
    expect(allocCalls()[0]).toMatchObject({ op: "insert", payload: { expense_id: "exp1", business_id: BIZ, amount: 10 } });
    expect(onSaved).not.toHaveBeenCalled();
  });
});
