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
  /** Owner decision that a flagged look-alike/duplicate is a separate real transaction. */
  owner_resolution?: string | null; resolution_note?: string | null;
}
export interface PaidInvoiceRow { id: string; business_id: string; invoice_number: string | null; total: number | string; paid_at: string | null; status: string; deleted_at: string | null }

export type EntryKind = "receipt" | "refund" | "expense" | "payroll";
export interface CashEntry {
  kind: EntryKind; id: string; date: string; amountCents: number; label: string;
  category: string; vendor: string; source: "payment" | "manual_income" | "bank" | "expense" | "payroll";
  method: string; reference: string; receiptPath: string | null; tipCents?: number;
  /** Shared expense only: full bill amount, so this business's share can be corrected. */
  sharedTotalCents?: number;
}
export type IssueKind =
  | "bank_needs_review" | "bank_possible_duplicate" | "bank_maybe_recorded" | "bank_sign_mismatch" | "bank_match_broken"
  | "shared_unallocated" | "paid_invoice_no_payment" | "payment_no_date" | "payment_not_successful";
export interface CashIssue { kind: IssueKind; id: string; date: string | null; amountCents: number; detail: string }

export interface CashInput {
  businessId: string; year: number;
  payments: PaymentRow[]; income: IncomeRow[]; payroll: PayrollRow[]; expenses: ExpenseRow[];
  allocations: AllocationRow[]; bank: BankRow[]; paidInvoices: PaidInvoiceRow[];
  /** Payments linked to paid invoices regardless of year — evidence only, never counted as cash here. */
  evidencePayments?: PaymentRow[];
  /** Business time zone for timestamp → calendar-day (paid_at). */
  tz?: string;
}
/** A recorded item a bank row may be matched to (successful, in scope, full amount, with direction). */
export interface Matchable { id: string; type: "payment" | "income" | "payroll" | "expense"; date: string; amountCents: number; direction: "in" | "out"; label: string }
export interface CashSummary {
  matchables: Matchable[];
  receipts: CashEntry[]; refunds: CashEntry[]; expenses: CashEntry[]; payroll: CashEntry[]; issues: CashIssue[];
  totals: { receipts: number; tips: number; refunds: number; expenses: number; payroll: number; net: number; excludedBank: number };
  monthly: Array<{ month: number; receipts: number; refunds: number; expenses: number; payroll: number }>;
  byCategory: Array<{ key: string; cents: number; count: number }>;
  byVendor: Array<{ key: string; cents: number; count: number }>;
  coverage: { payments: number; manualIncome: number; bankRows: number; expenses: number; payroll: number };
}

const inYear = (d: string | null | undefined, y: number) => !!d && d.slice(0, 4) === String(y);
const dateKey = (v: string | null | undefined, tz: string): string | null => {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v); if (Number.isNaN(d.getTime())) return null;
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
};
const isOk = (p: PaymentRow) => SUCCESS_PAYMENT_STATUSES.has((p.status ?? "").toLowerCase());
const payCents = (p: PaymentRow) => Math.abs(cents(p.amount)) + Math.max(0, cents(p.tip_amount));
const dayNum = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000;

export function buildCashSummary(inp: CashInput): CashSummary {
  const { businessId: biz, year } = inp;
  const receipts: CashEntry[] = []; const refunds: CashEntry[] = [];
  const expenses: CashEntry[] = []; const payroll: CashEntry[] = []; const issues: CashIssue[] = [];
  let excludedBank = 0;

  const tz = inp.tz ?? "America/Chicago";
  const paidByInvoice = new Map<string, number>();
  const evidenceSeen = new Set<string>();
  for (const p of [...inp.payments, ...(inp.evidencePayments ?? [])]) {
    if (p.business_id !== biz || evidenceSeen.has(p.id)) continue;
    evidenceSeen.add(p.id);
    if (isOk(p) && p.invoice_id && !p.is_refund) paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + Math.abs(cents(p.amount)));
  }
  for (const p of inp.payments) {
    if (p.business_id !== biz) continue;
    const ok = isOk(p);
    const amt = Math.abs(cents(p.amount)); const tip = Math.max(0, cents(p.tip_amount));
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
    expenses.push({ kind: "expense", id: e.id, date: e.expense_date, amountCents: mine, label: e.vendor || e.category, category: e.category, vendor: e.vendor ?? "", source: "expense", method: e.payment_method ?? "", reference: e.is_shared ? `shared, total ${fmtCents(total)}` : "", receiptPath: e.receipt_url, ...(e.is_shared ? { sharedTotalCents: total } : {}) });
  }

  // Bank rows: only owner-classified income/expense count; matched rows are evidence of existing records.
  const recordedIn = receipts.filter((r) => r.source !== "bank");
  // Money already recorded as going out: own expenses (full amount, incl. whole shared bills), payroll and refunds.
  const recordedOutExpenses = inp.expenses.filter((e) => inYear(e.expense_date, year) && (e.is_shared || e.business_id === biz))
    .map((e) => ({ id: e.id, date: e.expense_date, amountCents: cents(e.amount), label: `${e.vendor || e.category}${e.is_shared ? " (shared bill)" : ""}` }));
  const recordedOut: Array<{ date: string; amountCents: number; label: string }> = [
    ...recordedOutExpenses,
    ...payroll.map((p) => ({ date: p.date, amountCents: p.amountCents, label: p.label })),
    ...refunds.map((r) => ({ date: r.date, amountCents: r.amountCents, label: r.label })),
  ];
  const near = (a: string, b: string) => Math.abs(dayNum(a) - dayNum(b)) <= 5;
  for (const b of inp.bank) {
    if (b.business_id !== biz || !inYear(b.txn_date, year)) continue;
    const c = b.classification; const amt = b.amount_cents;
    if (c === "needs_review") { issues.push({ kind: "bank_needs_review", id: b.id, date: b.txn_date, amountCents: amt, detail: b.description }); continue; }
    if (c === "matched") {
      const why = matchProblem(b, inp);
      if (why) issues.push({ kind: "bank_match_broken", id: b.id, date: b.txn_date, amountCents: amt, detail: `${b.description} — ${why}; not counted until you re-sort it` });
      continue;
    }
    if (c === "transfer" || c === "personal" || c === "excluded") { excludedBank += amt; continue; }
    if ((c === "income" && amt < 0) || (c === "expense" && amt > 0)) {
      issues.push({ kind: "bank_sign_mismatch", id: b.id, date: b.txn_date, amountCents: amt, detail: `${b.description} — marked ${c} but amount is ${amt < 0 ? "money out" : "money in"}` });
      continue;
    }
    // Possible duplicates and look-alikes of recorded money are held out of totals until the owner
    // matches them, leaves them out, or confirms they are a separate real transaction.
    const separate = b.owner_resolution === "separate";
    if (b.possible_duplicate_of && !separate) { issues.push({ kind: "bank_possible_duplicate", id: b.id, date: b.txn_date, amountCents: amt, detail: `${b.description} — same date, amount and description as an earlier import; not counted` }); continue; }
    if (c === "income") {
      const lookalike = separate ? undefined : recordedIn.find((r) => r.amountCents === amt && near(r.date, b.txn_date));
      if (lookalike) { issues.push({ kind: "bank_maybe_recorded", id: b.id, date: b.txn_date, amountCents: amt, detail: `${b.description} — may be ${lookalike.label}; not counted until you match it, leave it out, or confirm it's separate` }); continue; }
      receipts.push({ kind: "receipt", id: b.id, date: b.txn_date, amountCents: amt, label: b.description, category: b.category || "Bank deposit", vendor: "", source: "bank", method: "bank", reference: separate ? "confirmed separate" : "", receiptPath: null });
    } else if (c === "expense") {
      const lookalike = separate ? undefined : recordedOut.find((r) => r.amountCents === -amt && near(r.date, b.txn_date));
      if (lookalike) { issues.push({ kind: "bank_maybe_recorded", id: b.id, date: b.txn_date, amountCents: amt, detail: `${b.description} — may be ${lookalike.label}; not counted until you match it, leave it out, or confirm it's separate` }); continue; }
      expenses.push({ kind: "expense", id: b.id, date: b.txn_date, amountCents: -amt, label: b.description, category: b.category || "Uncategorized", vendor: b.description, source: "bank", method: "bank", reference: separate ? "confirmed separate" : "", receiptPath: null });
    }
  }

  for (const inv of inp.paidInvoices) {
    if (inv.business_id !== biz || inv.deleted_at || inv.status !== "paid") continue;
    const paidDay = dateKey(inv.paid_at, tz);
    if (!inYear(paidDay, year)) continue;
    const got = paidByInvoice.get(inv.id) ?? 0; const total = cents(inv.total);
    if (got < total) issues.push({ kind: "paid_invoice_no_payment", id: inv.id, date: paidDay, amountCents: total - got, detail: `Invoice ${inv.invoice_number ?? ""} is marked paid but ${fmtCents(total - got)} has no payment record — not counted` });
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
  const matchables: Matchable[] = [
    ...receipts.filter((r) => r.source === "payment").map((r) => ({ id: r.id, type: "payment" as const, date: r.date, amountCents: r.amountCents, direction: "in" as const, label: r.label })),
    ...refunds.map((r) => ({ id: r.id, type: "payment" as const, date: r.date, amountCents: r.amountCents, direction: "out" as const, label: r.label })),
    ...receipts.filter((r) => r.source === "manual_income").map((r) => ({ id: r.id, type: "income" as const, date: r.date, amountCents: r.amountCents, direction: "in" as const, label: r.label })),
    ...payroll.map((r) => ({ id: r.id, type: "payroll" as const, date: r.date, amountCents: r.amountCents, direction: "out" as const, label: r.label })),
    ...recordedOutExpenses.map((e) => ({ ...e, type: "expense" as const, direction: "out" as const })),
  ];
  return {
    matchables,
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

/**
 * Why a matched bank row no longer points at a valid record (removed, failed, changed amount,
 * wrong direction or scope). Null when the match is still valid. Mirrors the server guard.
 */
export function matchProblem(b: BankRow, inp: Pick<CashInput, "businessId" | "payments" | "income" | "payroll" | "expenses" | "evidencePayments">): string | null {
  const amt = b.amount_cents; const id = b.matched_id;
  switch (b.matched_type) {
    case "payment": {
      const p = [...inp.payments, ...(inp.evidencePayments ?? [])].find((x) => x.id === id);
      if (!p || p.business_id !== b.business_id) return "matched payment was removed or isn't loaded";
      if (!isOk(p)) return `matched payment is now "${p.status}"`;
      if ((amt > 0) === !!p.is_refund) return "matched payment goes the other direction";
      return payCents(p) === Math.abs(amt) ? null : "matched payment amount changed";
    }
    case "income": {
      const r = inp.income.find((x) => x.id === id);
      if (!r || r.business_id !== b.business_id) return "matched income was removed";
      if (amt <= 0) return "money out can't match income";
      return cents(r.amount) === amt ? null : "matched income amount changed";
    }
    case "payroll": {
      const r = inp.payroll.find((x) => x.id === id);
      if (!r || r.business_id !== b.business_id) return "matched payroll was removed";
      if (amt >= 0) return "money in can't match payroll";
      return cents(r.total_amount) === -amt ? null : "matched payroll amount changed";
    }
    case "expense": {
      const e = inp.expenses.find((x) => x.id === id);
      if (!e || (!e.is_shared && e.business_id !== b.business_id)) return "matched expense was removed or belongs elsewhere";
      if (amt >= 0) return "money in can't match an expense";
      return cents(e.amount) === -amt ? null : "matched expense amount changed";
    }
    default: return "match type is missing";
  }
}

/**
 * Both-businesses view: adds each business's own summary. Shared expenses count once because each
 * business only carries its explicitly allocated share; unassigned shared amounts appear once.
 */
export function combineSummaries(parts: CashSummary[]): CashSummary {
  const cat = <K extends "receipts" | "refunds" | "expenses" | "payroll">(k: K) => parts.flatMap((p) => p[k]);
  const seen = new Set<string>();
  const issues = parts.flatMap((p) => p.issues).filter((i) => { const k = `${i.kind}:${i.id}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const totals = { receipts: 0, tips: 0, refunds: 0, expenses: 0, payroll: 0, net: 0, excludedBank: 0 };
  for (const p of parts) for (const k of Object.keys(totals) as Array<keyof typeof totals>) totals[k] += p.totals[k];
  const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, receipts: 0, refunds: 0, expenses: 0, payroll: 0 }));
  for (const p of parts) p.monthly.forEach((m, i) => { monthly[i].receipts += m.receipts; monthly[i].refunds += m.refunds; monthly[i].expenses += m.expenses; monthly[i].payroll += m.payroll; });
  const merge = (k: "byCategory" | "byVendor") => {
    const m = new Map<string, { key: string; cents: number; count: number }>();
    for (const p of parts) for (const g of p[k]) { const x = m.get(g.key) ?? { key: g.key, cents: 0, count: 0 }; x.cents += g.cents; x.count += g.count; m.set(g.key, x); }
    return [...m.values()].sort((a, b) => b.cents - a.cents);
  };
  const coverage = { payments: 0, manualIncome: 0, bankRows: 0, expenses: 0, payroll: 0 };
  for (const p of parts) for (const k of Object.keys(coverage) as Array<keyof typeof coverage>) coverage[k] += p.coverage[k];
  const ms = new Set<string>();
  const matchables = parts.flatMap((p) => p.matchables).filter((m) => (ms.has(`${m.type}:${m.id}`) ? false : (ms.add(`${m.type}:${m.id}`), true)));
  return { matchables, receipts: cat("receipts"), refunds: cat("refunds"), expenses: cat("expenses"), payroll: cat("payroll"), issues, totals, monthly, byCategory: merge("byCategory"), byVendor: merge("byVendor"), coverage };
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
