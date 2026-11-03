import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { loadWorkspaceBusinesses } from "@/lib/finance";
import {
  buildCashSummary, type AllocationRow, type BankRow, type CashSummary, type ExpenseRow,
  type IncomeRow, type PaidInvoiceRow, type PaymentRow, type PayrollRow,
} from "@/lib/cashRecords";

export interface CashData {
  businessId: string; year: number; workspaceId: string | null;
  summary: CashSummary;
  raw: { payments: PaymentRow[]; income: IncomeRow[]; payroll: PayrollRow[]; expenses: ExpenseRow[]; bank: BankRow[] };
  memberNames: Map<string, string>;
}

/** Loads every money record for one business + calendar year (paginated, business-scoped). */
export async function loadCashData(businessId: string, year: number): Promise<CashData> {
  const ys = `${year}-01-01`; const ye = `${year + 1}-01-01`;
  const { workspaceId } = await loadWorkspaceBusinesses(businessId);
  const [payments, income, payroll, expenses, allocations, bank, paidInvoices, members] = await Promise.all([
    // This year's payments (plus undated ones, which are flagged). Older deposits for invoices
    // paid this year are loaded below as evidence only.
    fetchAllPages<PaymentRow>((f, t) => supabase.from("platform_payments")
      .select(PAY_COLS)
      .eq("business_id", businessId)
      .or(`and(payment_date.gte.${ys},payment_date.lt.${ye}),payment_date.is.null`)
      .order("id").range(f, t)),
    fetchAllPages<IncomeRow>((f, t) => supabase.from("finance_income")
      .select("id, business_id, income_date, amount, customer_name, service_type, source")
      .eq("business_id", businessId).gte("income_date", ys).lt("income_date", ye).order("id").range(f, t)),
    fetchAllPages<PayrollRow>((f, t) => supabase.from("finance_payroll_payments")
      .select("id, business_id, pay_date, total_amount, pay_type, payment_method, member_id")
      .eq("business_id", businessId).gte("pay_date", ys).lt("pay_date", ye).order("id").range(f, t)),
    workspaceId
      ? fetchAllPages<ExpenseRow>((f, t) => supabase.from("finance_expenses")
          .select("id, business_id, workspace_id, is_shared, expense_date, amount, category, vendor, payment_method, receipt_url, notes")
          .eq("workspace_id", workspaceId).or(`business_id.eq.${businessId},is_shared.eq.true`)
          .gte("expense_date", ys).lt("expense_date", ye).order("id").range(f, t))
      : Promise.resolve([] as ExpenseRow[]),
    workspaceId
      ? fetchAllPages<AllocationRow & { finance_expenses: unknown }>((f, t) => supabase.from("finance_expense_allocations")
          .select("id, expense_id, business_id, amount, finance_expenses!inner(expense_date, workspace_id)")
          .eq("finance_expenses.workspace_id", workspaceId)
          .gte("finance_expenses.expense_date", ys).lt("finance_expenses.expense_date", ye)
          .order("id").range(f, t))
      : Promise.resolve([]),
    fetchAllPages<BankRow>((f, t) => supabase.from("finance_bank_transactions")
      .select("id, business_id, txn_date, description, amount_cents, classification, category, matched_type, matched_id, possible_duplicate_of, owner_resolution, resolution_note")
      .eq("business_id", businessId).gte("txn_date", ys).lt("txn_date", ye).order("txn_date").order("id").range(f, t)),
    fetchAllPages<PaidInvoiceRow>((f, t) => supabase.from("platform_invoices")
      .select("id, business_id, invoice_number, total, paid_at, status, deleted_at")
      .eq("business_id", businessId).eq("status", "paid").is("deleted_at", null)
      .gte("paid_at", `${year - 1}-12-31`).lt("paid_at", `${year + 1}-01-02`).order("id").range(f, t)),
    fetchAllPages<{ id: string; full_name: string }>((f, t) => supabase.from("finance_payroll_members")
      .select("id, full_name").eq("business_id", businessId).order("id").range(f, t)),
  ]);
  // Evidence: every payment linked to these paid invoices, any year; plus records that bank rows
  // are matched to but fall outside this year's window, so valid matches aren't reported broken.
  const matchedOf = (t: string) => [...new Set(bank.filter((b) => b.matched_type === t && b.matched_id).map((b) => b.matched_id as string))];
  const [evidencePayments, mIncome, mPayroll, mExpenses, tzRow] = await Promise.all([
    byIdsAllRows<PaymentRow>([...new Set(paidInvoices.map((i) => i.id))], (ids, f, t) => supabase.from("platform_payments").select(PAY_COLS).eq("business_id", businessId).in("invoice_id", ids).order("id").range(f, t))
      .then(async (rows) => [...rows, ...await byIds<PaymentRow>(matchedOf("payment"), (ids) => supabase.from("platform_payments").select(PAY_COLS).eq("business_id", businessId).in("id", ids))]),
    byIds<IncomeRow>(matchedOf("income").filter((id) => !income.some((r) => r.id === id)), (ids) => supabase.from("finance_income").select("id, business_id, income_date, amount, customer_name, service_type, source").eq("business_id", businessId).in("id", ids)),
    byIds<PayrollRow>(matchedOf("payroll").filter((id) => !payroll.some((r) => r.id === id)), (ids) => supabase.from("finance_payroll_payments").select("id, business_id, pay_date, total_amount, pay_type, payment_method, member_id").eq("business_id", businessId).in("id", ids)),
    workspaceId ? byIds<ExpenseRow>(matchedOf("expense").filter((id) => !expenses.some((r) => r.id === id)), (ids) => supabase.from("finance_expenses").select("id, business_id, workspace_id, is_shared, expense_date, amount, category, vendor, payment_method, receipt_url, notes").eq("workspace_id", workspaceId).in("id", ids)) : Promise.resolve([] as ExpenseRow[]),
    supabase.from("businesses").select("timezone").eq("id", businessId).maybeSingle(),
  ]);
  const tz = (tzRow.data as { timezone?: string | null } | null)?.timezone || "America/Chicago";
  const summary = buildCashSummary({
    businessId, year, payments, income: [...income, ...mIncome], payroll: [...payroll, ...mPayroll], expenses: [...expenses, ...mExpenses],
    allocations, bank, paidInvoices, evidencePayments, tz,
  });
  return { businessId, year, workspaceId, summary, raw: { payments, income, payroll, expenses, bank }, memberNames: new Map(members.map((m) => [m.id, m.full_name])) };
}

const PAY_COLS = "id, business_id, invoice_id, amount, tip_amount, method, reference_number, status, payment_date, is_deposit, is_refund, payment_number";

/** Fetch rows by id list in chunks (URL-length safe); throws on any error so totals never silently drop rows. */
async function byIds<T>(ids: string[], q: (ids: string[]) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await q(ids.slice(i, i + 150));
    if (error) throw new Error(error.message);
    out.push(...((data as T[] | null) ?? []));
  }
  return out;
}

/** Like byIds, but for one-to-many lookups (e.g. payments per invoice): pages every chunk past the 1000-row cap. */
export async function byIdsAllRows<T>(ids: string[], q: (ids: string[], from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150);
    out.push(...await fetchAllPages<T>((f, t) => q(chunk, f, t) as never));
  }
  return out;
}

export const cashKey = (businessId: string | null, year: number) => ["cash-records", businessId, year] as const;

export function useCashRecords(businessId: string | null, year: number) {
  return useQuery({
    queryKey: cashKey(businessId, year),
    queryFn: () => loadCashData(businessId as string, year),
    enabled: !!businessId,
  });
}
