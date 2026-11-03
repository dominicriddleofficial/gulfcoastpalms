/**
 * Cash-record bookkeeping view for the Tax Center, Income and P&L tabs.
 * Built only from dated money records: successful app payments (incl. deposits,
 * part payments, tips, refunds), manual income, paid payroll, dated expenses
 * and owner-classified bank rows. Scheduled job value is never used here.
 * This is a record summary for accountant review, not a tax calculation.
 */

export const cents = (n: number | string | null | undefined): number => {
  const v = Number(n ?? 0);
  return Number.isFinite(v) ? Math.round(v * 100) : 0;
};
export const fromCents = (c: number) => c / 100;

export const SUCCESS_PAYMENT_STATUSES = new Set(["completed", "succeeded", "paid"]);

export interface PaymentRow {
  id: string; business_id: string; invoice_id: string | null; amount: number | string; tip_amount: number | string | null;
  method: string | null; reference_number: string | null; status: string; payment_date: string | null;
  is_deposit: boolean | null; is_refund: boolean | null; payment_number: string | null;
}
export interface IncomeRow { id: string; business_id: string; income_date: string; amount: number | string; customer_name: string | null; service_type: string | null; source: string | null }
export interface PayrollRow { id: string; business_id: string; pay_date: string; total_amount: number | string; pay_type: string | null; payment_method: string | null; member_id: string }
export interface ExpenseRow {
  id: string; business_id: string | null; workspace_id: string | null; is_shared: boolean; expense_date: string; amount: number | string;
  category: string; vendor: string | null; payment_method: string | null; receipt_url: string | null; notes: string | null;
}
export interface AllocationRow { id: string; expense_id: string; business_id: string; amount: number | string }
export interface BankRow {
  id: string; business_id: string; txn_date: string; description: string; amount_cents: number;
  classification: string; category: string | null; matched_type: string | null; matched_id: string | null;
  possible_duplicate_of: string | null;
}
export interface PaidInvoiceRow { id: string; business_id: string; invoice_number: string | null; total: number | string; paid_at: string | null; status: string; deleted_at: string | null }

export type EntryKind = "receipt" | "refund" | "expense" | "payroll";
export interface CashEntry {
  kind: EntryKind; id: string; date: string; amountCents: number; label: string;
  category: string; vendor: string; source: "payment" | "manual_income" | "bank" | "expense" | "payroll";
  method: string; reference: string; receiptPath: string | null; tipCents?: number;
}
export type IssueKind =
  | "bank_needs_review" | "bank_possible_duplicate" | "bank_maybe_recorded" | "bank_sign_mismatch"
  | "shared_unallocated" | "paid_invoice_no_payment" | "payment_no_date" | "payment_not_successful";
export interface CashIssue { kind: IssueKind; id: string; date: string | null; amountCents: number; detail: string }

export interface CashInput {
  businessId: string; year: number;
  payments: PaymentRow[]; income: IncomeRow[]; payroll: PayrollRow[]; expenses: ExpenseRow[];
  allocations: AllocationRow[]; bank: BankRow[]; paidInvoices: PaidInvoiceRow[];
}
export interface CashSummary {
  receipts: CashEntry[]; refunds: CashEntry[]; expenses: CashEntry[]; payroll: CashEntry[]; issues: CashIssue[];
  totals: { receipts: number; tips: number; refunds: number; expenses: number; payroll: number; net: number; excludedBank: number };
  monthly: Array<{ month: number; receipts: number; refunds: number; expenses: number; payroll: number }>;
  byCategory: Array<{ key: string; cents: number; count: number }>;
  byVendor: Array<{ key: string; cents: number; count: number }>;
  coverage: { payments: number; manualIncome: number; bankRows: number; expenses: number; payroll: number };
}

const inYear = (d: string | null | undefined, y: number) => !!d && d.slice(0, 4) === String(y);
const dayNum = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000;

export function buildCashSummary(inp: CashInput): CashSummary {
  const { businessId: biz, year } = inp;
  const receipts: CashEntry[] = []; const refunds: CashEntry[] = [];
  const expenses: CashEntry[] = []; const payroll: CashEntry[] = []; const issues: CashIssue[] = [];
  let excludedBank = 0;

  const paidByInvoice = new Map<string, number>();
  for (const p of inp.payments) {
    if (p.business_id !== biz) continue;
    const ok = SUCCESS_PAYMENT_STATUSES.has((p.status ?? "").toLowerCase());
    const amt = Math.abs(cents(p.amount)); const tip = Math.max(0, cents(p.tip_amount));
    if (ok && p.invoice_id && !p.is_refund) paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + amt);
    if (!inYear(p.payment_date, year)) {
      if (ok && !p.payment_date) issues.push({ kind: "payment_no_date", id: p.id, date: null, amountCents: amt, detail: `Payment ${p.payment_number ?? ""} has no payment date` });
      continue;
    }
    if (!ok) { issues.push({ kind: "payment_not_successful", id: p.id, date: p.payment_date, amountCents: amt, detail: `Payment ${p.payment_number ?? ""} is "${p.status}" — not counted` }); continue; }
    const base = { id: p.id, date: p.payment_date as string, category: p.is_deposit ? "Deposit" : "Customer payment", vendor: "", source: "payment" as const, method: p.method ?? "", reference: p.payment_number ?? p.reference_number ?? "", receiptPath: null };
    if (p.is_refund) refunds.push({ ...base, kind: "refund", amountCents: amt + tip, label: `Refund ${p.payment_number ?? ""}`.trim(), category: "Refund" });
    else receipts.push({ ...base, kind: "receipt", amountCents: amt + tip, tipCents: tip, label: `Payment ${p.payment_number ?? ""}`.trim() });
  }

  for (const i of inp.income) {
    if (i.business_id !== biz || !inYear(i.income_date, year)) continue;
    receipts.push({ kind: "receipt", id: i.id, date: i.income_date, amountCents: cents(i.amount), label: i.customer_name || "Manual income", category: i.service_type || "Other income", vendor: "", source: "manual_income", method: i.source ?? "", reference: "", receiptPath: null });
  }

  for (const p of inp.payroll) {
    if (p.business_id !== biz || !inYear(p.pay_date, year)) continue;
    payroll.push({ kind: "payroll", id: p.id, date: p.pay_date, amountCents: cents(p.total_amount), label: "Payroll payment", category: p.pay_type || "Payroll", vendor: p.member_id, source: "payroll", method: p.payment_method ?? "", reference: "", receiptPath: null });
  }

  const allocByExpense = new Map<string, AllocationRow[]>();
  for (const a of inp.allocations) {
    const arr = allocByExpense.get(a.expense_id) ?? []; arr.push(a); allocByExpense.set(a.expense_id, arr);
  }
  for (const e of inp.expenses) {
    if (!inYear(e.expense_date, year)) continue;
    const total = cents(e.amount);
    let mine = 0;
    if (!e.is_shared) { if (e.business_id !== biz) continue; mine = total; }
    else {
      const allocs = allocByExpense.get(e.id) ?? [];
      mine = allocs.filter((a) => a.business_id === biz).reduce((s, a) => s + cents(a.amount), 0);
      const allocated = allocs.reduce((s, a) => s + cents(a.amount), 0);
      if (allocated < total) issues.push({ kind: "shared_unallocated", id: e.id, date: e.expense_date, amountCents: total - allocated, detail: `Shared expense ${e.vendor ?? e.category}: share not assigned` });
      if (mine === 0) continue;
    }
    expenses.push({ kind: "expense", id: e.id, date: e.expense_date, amountCents: mine, label: e.vendor || e.category, category: e.category, vendor: e.vendor ?? "", source: "expense", method: e.payment_method ?? "", reference: e.is_shared ? `shared, total ${fmtCents(total)}` : "", receiptPath: e.receipt_url });
  }

  // Bank rows: only owner-classified income/expense count; matched rows are evidence of existing records.
  const recordedReceipts = receipts.filter((r) => r.source !== "bank");
  for (const b of inp.bank) {
    if (b.business_id !== biz || !inYear(b.txn_date, year)) continue;
    const c = b.classification; const amt = b.amount_cents;
    if (c === "needs_review") { issues.push({ kind: "bank_needs_review", id: b.id, date: b.txn_date, amountCents: amt, detail: b.description }); continue; }
    if (c === "matched") continue;
    if (c === "transfer" || c === "personal" || c === "excluded") { excludedBank += amt; continue; }
    if ((c === "income" && amt < 0) || (c === "expense" && amt > 0)) {
      issues.push({ kind: "bank_sign_mismatch", id: b.id, date: b.txn_date, amountCents: amt, detail: `${b.description} — marked ${c} but amount is ${amt < 0 ? "money out" : "money in"}` });
      continue;
    }
    if (b.possible_duplicate_of) issues.push({ kind: "bank_possible_duplicate", id: b.id, date: b.txn_date, amountCents: amt, detail: `${b.description} — same date, amount and description as an earlier import` });
    if (c === "income") {
      const lookalike = recordedReceipts.find((r) => r.amountCents === amt && Math.abs(dayNum(r.date) - dayNum(b.txn_date)) <= 5);
      if (lookalike) issues.push({ kind: "bank_maybe_recorded", id: b.id, date: b.txn_date, amountCents: amt, detail: `${b.description} — may be ${lookalike.label}; match it instead of counting twice` });
      receipts.push({ kind: "receipt", id: b.id, date: b.txn_date, amountCents: amt, label: b.description, category: b.category || "Bank deposit", vendor: "", source: "bank", method: "bank", reference: "", receiptPath: null });
    } else if (c === "expense") {
      expenses.push({ kind: "expense", id: b.id, date: b.txn_date, amountCents: -amt, label: b.description, category: b.category || "Uncategorized", vendor: b.description, source: "bank", method: "bank", reference: "", receiptPath: null });
    }
  }

  for (const inv of inp.paidInvoices) {
    if (inv.business_id !== biz || inv.deleted_at || inv.status !== "paid") continue;
    if (!inYear(inv.paid_at?.slice(0, 10), year)) continue;
    const got = paidByInvoice.get(inv.id) ?? 0; const total = cents(inv.total);
    if (got < total) issues.push({ kind: "paid_invoice_no_payment", id: inv.id, date: inv.paid_at?.slice(0, 10) ?? null, amountCents: total - got, detail: `Invoice ${inv.invoice_number ?? ""} is marked paid but ${fmtCents(total - got)} has no payment record — not counted` });
  }

  const sum = (a: CashEntry[]) => a.reduce((s, e) => s + e.amountCents, 0);
  const totals = {
    receipts: sum(receipts), tips: receipts.reduce((s, e) => s + (e.tipCents ?? 0), 0), refunds: sum(refunds),
    expenses: sum(expenses), payroll: sum(payroll), net: 0, excludedBank,
  };
  totals.net = totals.receipts - totals.refunds - totals.expenses - totals.payroll;

  const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, receipts: 0, refunds: 0, expenses: 0, payroll: 0 }));
  const add = (arr: CashEntry[], k: "receipts" | "refunds" | "expenses" | "payroll") => {
    for (const e of arr) monthly[Number(e.date.slice(5, 7)) - 1][k] += e.amountCents;
  };
  add(receipts, "receipts"); add(refunds, "refunds"); add(expenses, "expenses"); add(payroll, "payroll");

  const group = (arr: CashEntry[], key: (e: CashEntry) => string) => {
    const m = new Map<string, { key: string; cents: number; count: number }>();
    for (const e of arr) { const k = key(e) || "—"; const g = m.get(k) ?? { key: k, cents: 0, count: 0 }; g.cents += e.amountCents; g.count++; m.set(k, g); }
    return [...m.values()].sort((a, b) => b.cents - a.cents);
  };

  const by = <T,>(rows: T[], f: (r: T) => boolean) => rows.filter(f).length;
  return {
    receipts, refunds, expenses, payroll, issues, totals, monthly,
    byCategory: group(expenses, (e) => e.category), byVendor: group(expenses, (e) => e.vendor),
    coverage: {
      payments: receipts.filter((r) => r.source === "payment").length + refunds.length,
      manualIncome: receipts.filter((r) => r.source === "manual_income").length,
      bankRows: by(inp.bank, (b) => b.business_id === biz && inYear(b.txn_date, year)),
      expenses: expenses.length, payroll: payroll.length,
    },
  };
}

export function fmtCents(c: number): string {
  const sign = c < 0 ? "-" : "";
  return `${sign}$${(Math.abs(c) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Default tax year: in January, last year (year-end prep); otherwise this year. */
export function defaultTaxYear(now = new Date(), tz = "America/Chicago"): number {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric" }).formatToParts(now);
  const y = Number(p.find((x) => x.type === "year")?.value);
  const m = Number(p.find((x) => x.type === "month")?.value);
  return m === 1 ? y - 1 : y;
}

/** One CSV cell. Text that a spreadsheet would run as a formula is prefixed with '. */
export function csvCell(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(rows: Array<Record<string, unknown>>, headers?: string[]): string {
  const h = headers ?? (rows[0] ? Object.keys(rows[0]) : []);
  return [h.map(csvCell).join(","), ...rows.map((r) => h.map((k) => csvCell(r[k])).join(","))].join("\n");
}
