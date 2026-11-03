import { describe, it, expect } from "vitest";
import { buildCashSummary, csvCell, cents, type CashInput } from "./cashRecords";
import { parseMoneyCents, parseBankDate } from "./bankCsv";

const base = (o: Partial<CashInput>): CashInput => ({ businessId: "gcp", year: 2026, payments: [], income: [], payroll: [], expenses: [], allocations: [], bank: [], paidInvoices: [], ...o });
const pay = { id: "p1", business_id: "gcp", invoice_id: "i1", amount: "400.10", tip_amount: "20", method: "check", reference_number: null, status: "completed", payment_date: "2026-03-05", is_deposit: false, is_refund: false, payment_number: "P-1" };
const bankRow = { id: "b1", business_id: "gcp", txn_date: "2026-03-06", description: "DEPOSIT", amount_cents: 42010, classification: "income", category: null, matched_type: null, matched_id: null, possible_duplicate_of: null };

describe("cash records", () => {
  it("money is added in cents without float drift", () => {
    expect(cents("0.1") + cents("0.2")).toBe(30);
    const s = buildCashSummary(base({ payments: [pay] }));
    expect(s.totals.receipts).toBe(42010);
    expect(s.totals.tips).toBe(2000);
  });
  it("a bank deposit that looks like a recorded payment is not counted twice", () => {
    const s = buildCashSummary(base({ payments: [pay], bank: [bankRow] }));
    expect(s.totals.receipts).toBe(42010);
    expect(s.issues.some((i) => i.kind === "bank_maybe_recorded")).toBe(true);
  });
  it("a matched bank row is not counted", () => {
    const s = buildCashSummary(base({ payments: [pay], bank: [{ ...bankRow, classification: "matched", matched_type: "payment", matched_id: "p1" }] }));
    expect(s.totals.receipts).toBe(42010);
  });
  it("unsorted bank rows don't count and show up for review", () => {
    const s = buildCashSummary(base({ bank: [{ ...bankRow, classification: "needs_review" }] }));
    expect(s.totals.receipts).toBe(0);
    expect(s.issues[0].kind).toBe("bank_needs_review");
  });
  it("shared expenses are never split 50/50 automatically", () => {
    const exp = { id: "e1", business_id: null, workspace_id: "w", is_shared: true, expense_date: "2026-02-01", amount: "100", category: "Fuel", vendor: "Shell", payment_method: null, receipt_url: null, notes: null };
    expect(buildCashSummary(base({ expenses: [exp] })).totals.expenses).toBe(0);
    const s = buildCashSummary(base({ expenses: [exp], allocations: [{ id: "a", expense_id: "e1", business_id: "gcp", amount: "70" }] }));
    expect(s.totals.expenses).toBe(7000);
    expect(s.issues.find((i) => i.kind === "shared_unallocated")?.amountCents).toBe(3000);
  });
  it("pending payments and refunds are handled", () => {
    const s = buildCashSummary(base({ payments: [{ ...pay, status: "pending" }, { ...pay, id: "r", is_refund: true, amount: "-50", tip_amount: null }] }));
    expect(s.totals.receipts).toBe(0);
    expect(s.totals.refunds).toBe(5000);
  });
  it("paid invoices without payment records are flagged, not counted", () => {
    const s = buildCashSummary(base({ paidInvoices: [{ id: "i9", business_id: "gcp", invoice_number: "INV-9", total: 300, paid_at: "2026-04-01T12:00:00Z", status: "paid", deleted_at: null }] }));
    expect(s.totals.receipts).toBe(0);
    expect(s.issues[0].kind).toBe("paid_invoice_no_payment");
  });
  it("another business's records are ignored", () => {
    expect(buildCashSummary(base({ payments: [{ ...pay, business_id: "pps" }] })).totals.receipts).toBe(0);
  });
  it("spreadsheet formulas in exports are neutralised", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(-12.5)).toBe("-12.5");
  });
  it("bank amounts and dates parse strictly", () => {
    expect(parseMoneyCents("($1,234.56)")).toBe(-123456);
    expect(parseBankDate("02/30/2026")).toBeNull();
  });
});
