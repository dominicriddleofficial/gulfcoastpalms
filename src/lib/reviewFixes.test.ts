/**
 * Regressions for the Analytics/Tax review findings (bank double counts, separate-transaction
 * resolution, CSV validation, combined P&L, future work, payment evidence, custom date ranges).
 */
import { describe, it, expect } from "vitest";
import { buildCashSummary, combineSummaries, matchProblem, type BankRow, type CashInput, type ExpenseRow, type PaymentRow } from "./cashRecords";
import { CsvFormatError, mapBankRows, parseCsv, suggestMatches, validateColumnMap } from "./bankCsv";
import { workState, type ServiceJob } from "./analytics/serviceWork";
import { rangeFor } from "./websiteAnalytics";
import { fetchAllPages } from "./fetchAllPages";

const base = (o: Partial<CashInput>): CashInput => ({ businessId: "gcp", year: 2026, payments: [], income: [], payroll: [], expenses: [], allocations: [], bank: [], paidInvoices: [], ...o });
const exp = (o: Partial<ExpenseRow> = {}): ExpenseRow => ({ id: "e1", business_id: "gcp", workspace_id: "w", is_shared: false, expense_date: "2026-02-02", amount: "100", category: "Fuel", vendor: "Shell", payment_method: null, receipt_url: null, notes: null, ...o });
const bank = (o: Partial<BankRow> = {}): BankRow => ({ id: "b1", business_id: "gcp", txn_date: "2026-02-02", description: "SHELL", amount_cents: -10000, classification: "expense", category: null, matched_type: null, matched_id: null, possible_duplicate_of: null, ...o });
const pay = (o: Partial<PaymentRow> = {}): PaymentRow => ({ id: "p1", business_id: "gcp", invoice_id: "i1", amount: "100", tip_amount: null, method: "card", reference_number: null, status: "completed", payment_date: "2026-02-02", is_deposit: false, is_refund: false, payment_number: "P-1", ...o });

describe("bank money out vs recorded spending", () => {
  it("$100 expense + same-day $100 bank charge marked expense counts $100, not $200, and asks for review", () => {
    const s = buildCashSummary(base({ expenses: [exp()], bank: [bank()] }));
    expect(s.totals.expenses).toBe(10000);
    expect(s.issues.map((i) => i.kind)).toContain("bank_maybe_recorded");
  });
  it("a bank charge that looks like recorded payroll is held out too", () => {
    const s = buildCashSummary(base({ payroll: [{ id: "r1", business_id: "gcp", pay_date: "2026-02-01", total_amount: "100", pay_type: null, payment_method: null, member_id: "m" }], bank: [bank()] }));
    expect(s.totals.expenses).toBe(0);
    expect(s.totals.payroll).toBe(10000);
  });
  it("match suggestions respect money direction: a deposit never suggests an expense", () => {
    const recs = [{ id: "e1", date: "2026-02-02", amountCents: 10000, direction: "out" as const }, { id: "p1", date: "2026-02-02", amountCents: 10000, direction: "in" as const }];
    expect(suggestMatches({ txnDate: "2026-02-02", amountCents: 10000 }, recs).map((r) => r.id)).toEqual(["p1"]);
    expect(suggestMatches({ txnDate: "2026-02-02", amountCents: -10000 }, recs).map((r) => r.id)).toEqual(["e1"]);
  });
  it("matchables only include successful payments, with refunds as money out", () => {
    const s = buildCashSummary(base({ payments: [pay(), pay({ id: "p2", status: "failed" }), pay({ id: "p3", is_refund: true })] }));
    expect(s.matchables.map((m) => [m.id, m.direction])).toEqual([["p1", "in"], ["p3", "out"]]);
  });
});

describe("separate-transaction resolution", () => {
  it("owner-confirmed separate look-alike counts exactly once more", () => {
    const s = buildCashSummary(base({ expenses: [exp()], bank: [bank({ owner_resolution: "separate", resolution_note: "second fill-up" })] }));
    expect(s.totals.expenses).toBe(20000);
    expect(s.issues).toHaveLength(0);
  });
  it("possible duplicate import stays held out until confirmed separate", () => {
    const held = buildCashSummary(base({ bank: [bank({ classification: "income", amount_cents: 5000, possible_duplicate_of: "b0" })] }));
    expect(held.totals.receipts).toBe(0);
    expect(held.issues[0].kind).toBe("bank_possible_duplicate");
    const ok = buildCashSummary(base({ bank: [bank({ classification: "income", amount_cents: 5000, possible_duplicate_of: "b0", owner_resolution: "separate", resolution_note: "two checks" })] }));
    expect(ok.totals.receipts).toBe(5000);
  });
});

describe("matched rows stay valid", () => {
  const matched = bank({ classification: "matched", matched_type: "payment", matched_id: "p1", amount_cents: 10000 });
  it("valid match: not counted again, no issue", () => {
    const s = buildCashSummary(base({ payments: [pay()], bank: [matched] }));
    expect(s.totals.receipts).toBe(10000);
    expect(s.issues).toHaveLength(0);
  });
  it("removed, failed, changed or wrong-direction targets are surfaced", () => {
    expect(buildCashSummary(base({ bank: [matched] })).issues[0].kind).toBe("bank_match_broken");
    expect(matchProblem(matched, base({ payments: [pay({ status: "failed" })] }))).toMatch(/failed/);
    expect(matchProblem(matched, base({ payments: [pay({ amount: "90" })] }))).toMatch(/amount/);
    expect(matchProblem(matched, base({ payments: [pay({ is_refund: true })] }))).toMatch(/direction/);
    expect(matchProblem(bank({ classification: "matched", matched_type: "expense", matched_id: "e1", amount_cents: 10000 }), base({ expenses: [exp()] }))).toMatch(/money in/);
  });
});

describe("bank CSV validation", () => {
  const map = { date: 0, description: 1, debit: 2, credit: 3 };
  it("debit 100 with credit 0.00 is money out, not 'both filled'", () => {
    const r = mapBankRows([["Date", "Desc", "Debit", "Credit"], ["2026-02-02", "Shell", "100.00", "0.00"], ["2026-02-03", "Dep", "0", "50"]], map);
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => x.amountCents)).toEqual([-10000, 5000]);
  });
  it("both columns with real amounts is still rejected", () => {
    expect(mapBankRows([["D", "X", "Dr", "Cr"], ["2026-02-02", "x", "5", "6"]], map).errors).toHaveLength(1);
  });
  it("unclosed quotes, stray quotes and empty files are rejected", () => {
    expect(() => parseCsv('Date,Desc\n2026-01-01,"open')).toThrow(CsvFormatError);
    expect(() => parseCsv('Date,Desc\n2026-01-01,ab"c')).toThrow(CsvFormatError);
    expect(() => parseCsv('a,"b"x')).toThrow(CsvFormatError);
    expect(() => parseCsv("  \n ")).toThrow(CsvFormatError);
  });
  it("quoted commas and line breaks still work", () => {
    expect(parseCsv('a,b\n"x, y","line1\nline2"')).toEqual([["a", "b"], ["x, y", "line1\nline2"]]);
  });
  it("short/long rows are reported, not silently mis-read", () => {
    const r = mapBankRows([["Date", "Desc", "Amount"], ["2026-02-02", "x"], ["2026-02-03", "y", "5", "extra"], ["2026-02-04", "z", "5"]], { date: 0, description: 1, amount: 2 });
    expect(r.errors.map((e) => e.rowIndex)).toEqual([1, 2]);
    expect(r.rows).toHaveLength(1);
  });
  it("column map out of range or reused is rejected", () => {
    expect(validateColumnMap({ date: 0, description: 0, amount: 1 }, 3).length).toBeGreaterThan(0);
    expect(validateColumnMap({ date: 0, description: 1, amount: 9 }, 3).length).toBeGreaterThan(0);
    expect(validateColumnMap({ date: 0, description: 1, amount: 2 }, 3)).toEqual([]);
  });
  it("impossible dates and bad money are row errors", () => {
    const r = mapBankRows([["D", "X", "A"], ["2026-02-30", "x", "5"], ["2026-02-02", "y", "5.123"]], { date: 0, description: 1, amount: 2 });
    expect(r.errors).toHaveLength(2);
  });
});

describe("combined P&L", () => {
  it("a shared bill counts once as the sum of assigned shares; unassigned part shows once", () => {
    const shared = exp({ id: "s1", business_id: null, is_shared: true, amount: "300" });
    const allocations = [{ id: "a1", expense_id: "s1", business_id: "gcp", amount: "100" }, { id: "a2", expense_id: "s1", business_id: "pps", amount: "150" }];
    const gcp = buildCashSummary(base({ expenses: [shared], allocations }));
    const pps = buildCashSummary(base({ businessId: "pps", expenses: [shared], allocations }));
    const both = combineSummaries([gcp, pps]);
    expect(both.totals.expenses).toBe(25000);
    expect(both.issues.filter((i) => i.kind === "shared_unallocated")).toHaveLength(1);
    expect(both.issues[0].amountCents).toBe(5000);
  });
});

describe("schedule-based work state", () => {
  const job = (o: Partial<ServiceJob>): ServiceJob => ({ id: "j", source: "platform", dateKey: "2026-12-01", amount: 1, clientName: null, address: null, status: "scheduled", title: null, ...o });
  it("future-dated paid/completed/invoiced work stays booked", () => {
    for (const status of ["completed", "paid", "invoiced"]) expect(workState(job({ status }), "2026-11-03")).toBe("booked");
  });
  it("past work counts without a completion click", () => {
    expect(workState(job({ dateKey: "2026-11-01" }), "2026-11-03")).toBe("done_by_schedule");
  });
});

describe("paid invoice evidence", () => {
  it("a deposit from last year proves this year's paid invoice but isn't this year's cash", () => {
    const s = buildCashSummary(base({
      payments: [pay({ id: "p2", amount: "60", payment_date: "2026-03-01" })],
      evidencePayments: [pay({ id: "p1", amount: "40", payment_date: "2025-11-10", is_deposit: true })],
      paidInvoices: [{ id: "i1", business_id: "gcp", invoice_number: "1", total: "100", paid_at: "2026-03-01T12:00:00Z", status: "paid", deleted_at: null }],
    }));
    expect(s.totals.receipts).toBe(6000);
    expect(s.issues.filter((i) => i.kind === "paid_invoice_no_payment")).toHaveLength(0);
  });
  it("paid_at year uses the business time zone", () => {
    const inv = { id: "i9", business_id: "gcp", invoice_number: "9", total: "100", paid_at: "2027-01-01T03:00:00Z", status: "paid", deleted_at: null };
    // 03:00Z Jan 1 is still Dec 31 in Chicago → belongs to 2026.
    expect(buildCashSummary(base({ paidInvoices: [inv] })).issues.some((i) => i.id === "i9")).toBe(true);
    expect(buildCashSummary(base({ year: 2027, paidInvoices: [inv] })).issues.some((i) => i.id === "i9")).toBe(false);
  });
});

describe("custom website date range", () => {
  it("uses business-zone midnight across the DST change", () => {
    const r = rangeFor("custom", new Date(), { from: "2026-11-01", to: "2026-11-01" }, "America/Chicago");
    expect(r?.from).toBe("2026-11-01T05:00:00.000Z");
    expect(r?.to).toBe("2026-11-02T06:00:00.000Z"); // a 25-hour day
    expect(r?.days).toBe(1);
    expect(r?.label).toContain("America/Chicago");
  });
  it("rejects impossible dates", () => {
    expect(rangeFor("custom", new Date(), { from: "2026-02-30", to: "2026-03-01" })).toBeNull();
  });
});

describe("pagination past 1000 rows", () => {
  it("fetchAllPages keeps reading until a short page", async () => {
    const all = Array.from({ length: 2345 }, (_, i) => ({ i }));
    const rows = await fetchAllPages<{ i: number }>(async (f, t) => ({ data: all.slice(f, t + 1), error: null }));
    expect(rows).toHaveLength(2345);
  });
});

describe("old unfiltered call-tap totals are gone", () => {
  it("Analytics page no longer reads raw website events directly", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/pages/platform/PlatformAnalytics.tsx", "utf8");
    expect(src).not.toMatch(/from\("analytics_events"\)/);
    expect(src).not.toContain("Website Call Taps");
  });
});
