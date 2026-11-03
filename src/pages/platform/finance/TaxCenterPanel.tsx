import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Download, ExternalLink, FileText, Plus, Upload, Info } from "lucide-react";
import { TAX_DOC_TYPES } from "@/lib/finance";
import { cashKey, useCashRecords } from "@/hooks/useCashRecords";
import { defaultTaxYear, fmtCents, toCsv, cents, type CashEntry, type CashIssue, type IssueKind } from "@/lib/cashRecords";
import { fetchAllPages } from "@/lib/fetchAllPages";
import BankImportPanel from "@/pages/platform/finance/BankImportPanel";

interface TaxDoc { id: string; business_id: string; tax_year: number; document_type: string; person_name: string | null; file_url: string; file_name: string | null; notes: string | null; created_at: string }
interface QuarterlyTax { id: string; business_id: string; tax_year: number; quarter: number; amount_paid: number; paid_on: string | null; notes: string | null }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ISSUE_LABEL: Record<IssueKind, string> = {
  bank_needs_review: "Bank rows not yet sorted",
  bank_possible_duplicate: "Bank rows that may be imported twice",
  bank_maybe_recorded: "Bank deposits that may already be recorded",
  bank_sign_mismatch: "Bank rows sorted the wrong way",
  shared_unallocated: "Shared expenses without an assigned share",
  paid_invoice_no_payment: "Paid invoices missing a payment record",
  payment_no_date: "Payments with no date",
  payment_not_successful: "Pending or failed payments (not counted)",
};

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const usd = (c: number) => (c / 100).toFixed(2);

export default function TaxCenterPanel({ businessId }: { businessId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(() => defaultTaxYear());
  const years = useMemo(() => Array.from({ length: thisYear - 2022 + 1 }, (_, i) => thisYear - i), [thisYear]);
  const cash = useCashRecords(businessId, year);
  const [drill, setDrill] = useState<"receipts" | "refunds" | "expenses" | "payroll" | null>(null);
  const [drillMonth, setDrillMonth] = useState<number | null>(null);

  const extras = useQuery({
    queryKey: ["tax-extras", businessId, year],
    queryFn: async () => {
      const [docs, q] = await Promise.all([
        fetchAllPages<TaxDoc>((f, t) => supabase.from("finance_tax_documents").select("*").eq("business_id", businessId).eq("tax_year", year).order("created_at", { ascending: false }).range(f, t)),
        supabase.from("finance_quarterly_taxes").select("*").eq("business_id", businessId).eq("tax_year", year),
      ]);
      if (q.error) throw new Error(q.error.message);
      return { businessId, year, docs, quarterly: (q.data ?? []) as QuarterlyTax[] };
    },
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: cashKey(businessId, year) });
    void qc.invalidateQueries({ queryKey: ["tax-extras", businessId, year] });
  };

  // Ignore data that belongs to a previous business/year selection.
  const data = cash.data && cash.data.businessId === businessId && cash.data.year === year ? cash.data : null;
  const ex = extras.data && extras.data.businessId === businessId && extras.data.year === year ? extras.data : null;
  const s = data?.summary;

  const issuesByKind = useMemo(() => {
    const m = new Map<IssueKind, CashIssue[]>();
    for (const i of s?.issues ?? []) { const a = m.get(i.kind) ?? []; a.push(i); m.set(i.kind, a); }
    return m;
  }, [s]);

  const noRecords = s ? s.receipts.length + s.refunds.length + s.expenses.length + s.payroll.length === 0 : false;
  const quarterlyPaid = (ex?.quarterly ?? []).reduce((t, q) => t + cents(q.amount_paid), 0);

  const openReceipt = async (e: CashEntry) => {
    if (!e.receiptPath) return;
    const { data: u, error } = await supabase.storage.from("finance-receipts").createSignedUrl(e.receiptPath, 60);
    if (error || !u?.signedUrl) { toast({ title: "Could not open receipt", variant: "destructive" }); return; }
    window.open(u.signedUrl, "_blank", "noopener");
  };
  const openDoc = async (d: TaxDoc) => {
    const { data: u, error } = await supabase.storage.from("finance-tax-docs").createSignedUrl(d.file_url, 60);
    if (error || !u?.signedUrl) { toast({ title: "Could not open document", variant: "destructive" }); return; }
    window.open(u.signedUrl, "_blank", "noopener");
  };

  const entryRow = (e: CashEntry) => ({
    date: e.date, type: e.kind, source: e.source, description: e.label, category: e.category,
    vendor_or_person: e.kind === "payroll" ? data?.memberNames.get(e.vendor) ?? "" : e.vendor,
    method: e.method, reference: e.reference, amount: Number(usd(e.amountCents)),
    tip_included: e.tipCents ? Number(usd(e.tipCents)) : "", receipt_on_file: e.receiptPath ? "yes" : "",
  });
  const exp = {
    summary: () => s && download(`records-summary-${year}.csv`, toCsv([
      { line: "Money received (recorded)", amount: Number(usd(s.totals.receipts)) },
      { line: "  of which tips", amount: Number(usd(s.totals.tips)) },
      { line: "Refunds paid out", amount: Number(usd(s.totals.refunds)) },
      { line: "Business spending (recorded)", amount: Number(usd(s.totals.expenses)) },
      { line: "Payroll paid", amount: Number(usd(s.totals.payroll)) },
      { line: "Book net from records", amount: Number(usd(s.totals.net)) },
      { line: "Quarterly tax payments recorded", amount: Number(usd(quarterlyPaid)) },
      { line: "Open review items", amount: s.issues.length },
      { line: "Note", amount: "Cash records for accountant review. Not a tax calculation or filing figure." },
      ...MONTHS.map((m, i) => ({ line: `${m} received / refunds / spending / payroll`, amount: [s.monthly[i].receipts, s.monthly[i].refunds, s.monthly[i].expenses, s.monthly[i].payroll].map(usd).join(" / ") })),
    ])),
    income: () => s && download(`income-and-refunds-${year}.csv`, toCsv([...s.receipts, ...s.refunds].sort((a, b) => a.date.localeCompare(b.date)).map(entryRow))),
    expenses: () => s && download(`expenses-${year}.csv`, toCsv(s.expenses.map(entryRow))),
    payroll: () => s && download(`payroll-${year}.csv`, toCsv(s.payroll.map(entryRow))),
    quarterly: () => ex && download(`quarterly-tax-payments-${year}.csv`, toCsv(ex.quarterly.map((q) => ({ quarter: q.quarter, amount_paid: Number(q.amount_paid), paid_on: q.paid_on ?? "", notes: q.notes ?? "" })), ["quarter", "amount_paid", "paid_on", "notes"])),
    documents: () => ex && download(`document-index-${year}.csv`, toCsv(ex.docs.map((d) => ({ type: d.document_type, person_or_vendor: d.person_name ?? "", file: d.file_name ?? "", uploaded: d.created_at.slice(0, 10), notes: d.notes ?? "" })), ["type", "person_or_vendor", "file", "uploaded", "notes"])),
    issues: () => s && download(`open-review-items-${year}.csv`, toCsv(s.issues.map((i) => ({ issue: ISSUE_LABEL[i.kind], date: i.date ?? "", amount: Number(usd(i.amountCents)), detail: i.detail })), ["issue", "date", "amount", "detail"])),
  };

  const drillRows = s && drill ? s[drill].filter((e) => drillMonth === null || Number(e.date.slice(5, 7)) === drillMonth).sort((a, b) => a.date.localeCompare(b.date)) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="tax-year" className="text-xs text-muted-foreground">Tax year</Label>
          <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setDrill(null); setDrillMonth(null); }}>
            <SelectTrigger id="tax-year" className="h-9 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm" variant="outline" disabled={!s}><Download className="w-4 h-4 mr-1" />Accountant files</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exp.summary}>Summary</DropdownMenuItem>
              <DropdownMenuItem onClick={exp.income}>Income and refunds</DropdownMenuItem>
              <DropdownMenuItem onClick={exp.expenses}>Expenses</DropdownMenuItem>
              <DropdownMenuItem onClick={exp.payroll}>Payroll</DropdownMenuItem>
              <DropdownMenuItem onClick={exp.quarterly}>Quarterly tax payments</DropdownMenuItem>
              <DropdownMenuItem onClick={exp.documents}>Document list</DropdownMenuItem>
              <DropdownMenuItem onClick={exp.issues}>Open review items</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="p-3 bg-card/60 border-border flex gap-2 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 text-primary mt-0.5" />
        <p>These are your <b className="text-foreground">recorded</b> money in and out for {year}, by the day money moved. Use them with your accountant. They aren't a tax bill or a filing-ready number, and they only include what's been entered or imported here. Scheduled job value isn't counted.</p>
      </Card>

      {cash.isError && <Card className="p-3 border-destructive/50 text-sm text-destructive">Couldn't load records: {(cash.error as Error).message}. <button className="underline" onClick={refresh}>Try again</button></Card>}
      {!s && !cash.isError && <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 rounded-lg bg-muted/30 animate-pulse" />)}</div>}

      {s && (
        <>
          <Card className={`p-3 border ${noRecords || s.issues.length ? "border-amber-500/40" : "border-border"} bg-card/60`}>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">What's included</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span>App payments: <b>{s.coverage.payments}</b></span>
              <span>Manual income: <b>{s.coverage.manualIncome}</b></span>
              <span>Bank rows: <b>{s.coverage.bankRows}</b></span>
              <span>Expenses: <b>{s.coverage.expenses}</b></span>
              <span>Payroll: <b>{s.coverage.payroll}</b></span>
              <span>Documents: <b>{ex?.docs.length ?? "…"}</b></span>
            </div>
            {(noRecords || s.coverage.expenses === 0 || s.coverage.bankRows === 0) && (
              <p className="mt-2 text-xs text-amber-500 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {noRecords ? `No money records for ${year} yet. ` : ""}
                {s.coverage.expenses === 0 ? "No expenses are entered. " : ""}
                {s.coverage.bankRows === 0 ? "No bank statements imported. " : ""}
                These numbers are incomplete until that history is added.
              </p>
            )}
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Tile label="Money received" value={fmtCents(s.totals.receipts)} sub={s.totals.tips ? `incl. ${fmtCents(s.totals.tips)} tips` : undefined} onClick={() => { setDrill("receipts"); setDrillMonth(null); }} />
            <Tile label="Refunds paid out" value={fmtCents(s.totals.refunds)} onClick={() => { setDrill("refunds"); setDrillMonth(null); }} />
            <Tile label="Business spending" value={fmtCents(s.totals.expenses)} onClick={() => { setDrill("expenses"); setDrillMonth(null); }} />
            <Tile label="Payroll paid" value={fmtCents(s.totals.payroll)} onClick={() => { setDrill("payroll"); setDrillMonth(null); }} />
            <Tile label="Book net (records)" value={fmtCents(s.totals.net)} accent />
          </div>

          {s.issues.length > 0 && (
            <Card className="p-3 bg-card/60 border-amber-500/40">
              <p className="text-[10px] uppercase tracking-wide text-amber-500 mb-2">Needs review ({s.issues.length})</p>
              <div className="space-y-2">
                {[...issuesByKind.entries()].map(([kind, list]) => (
                  <details key={kind} className="rounded-md bg-secondary/20 px-3 py-2">
                    <summary className="text-sm cursor-pointer flex justify-between gap-2"><span>{ISSUE_LABEL[kind]}</span><span className="text-muted-foreground">{list.length} · {fmtCents(list.reduce((t, i) => t + Math.abs(i.amountCents), 0))}</span></summary>
                    <ul className="mt-2 space-y-1.5">
                      {list.slice(0, 200).map((i) => (
                        <li key={`${i.kind}-${i.id}`} className="text-xs flex flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0 break-words">{i.date ?? "No date"} · {i.detail}</span>
                          {kind === "shared_unallocated" && data?.workspaceId && (
                            <AllocateShare expenseId={i.id} businessId={businessId} remainingCents={i.amountCents} onSaved={refresh} />
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-3 bg-card/60 border-border overflow-x-auto">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">By month — tap a number to see the records</p>
            <table className="w-full text-xs min-w-[460px]">
              <thead><tr className="text-muted-foreground text-left"><th className="py-1">Month</th><th className="text-right">Received</th><th className="text-right">Refunds</th><th className="text-right">Spending</th><th className="text-right">Payroll</th><th className="text-right">Net</th></tr></thead>
              <tbody>
                {s.monthly.map((m, i) => (
                  <tr key={m.month} className="border-t border-border/50">
                    <td className="py-1.5">{MONTHS[i]}</td>
                    {(["receipts", "refunds", "expenses", "payroll"] as const).map((k) => (
                      <td key={k} className="text-right"><button className="hover:text-primary tabular-nums" onClick={() => { setDrill(k); setDrillMonth(m.month); }}>{fmtCents(m[k])}</button></td>
                    ))}
                    <td className="text-right tabular-nums">{fmtCents(m.receipts - m.refunds - m.expenses - m.payroll)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {drill && (
            <Card className="p-3 bg-card/60 border-primary/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">{({ receipts: "Money received", refunds: "Refunds", expenses: "Spending", payroll: "Payroll" })[drill]}{drillMonth ? ` — ${MONTHS[drillMonth - 1]}` : ""} ({drillRows.length})</p>
                <Button size="sm" variant="ghost" onClick={() => setDrill(null)}>Close</Button>
              </div>
              {drillRows.length === 0 ? <p className="text-xs text-muted-foreground py-3 text-center">No records.</p> : (
                <ul className="divide-y divide-border/50 max-h-[420px] overflow-y-auto">
                  {drillRows.map((e) => (
                    <li key={`${e.source}-${e.id}`} className="py-2 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground break-words">{e.kind === "payroll" ? data?.memberNames.get(e.vendor) ?? "Team member" : e.label}</p>
                        <p className="text-muted-foreground">{e.date} · {e.category}{e.method ? ` · ${e.method}` : ""} · {({ payment: "app payment", manual_income: "manual entry", bank: "bank import", expense: "expense entry", payroll: "payroll record" })[e.source]}{e.reference ? ` · ${e.reference}` : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="tabular-nums text-sm">{fmtCents(e.amountCents)}</p>
                        {e.receiptPath && <button className="text-primary underline" onClick={() => void openReceipt(e)}>Receipt</button>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            <RankList title="Spending by category" rows={s.byCategory} />
            <RankList title="Spending by vendor" rows={s.byVendor} />
          </div>
        </>
      )}

      <BankImportPanel businessId={businessId} year={year} summary={s ?? null} onChanged={refresh} />

      <Card className="p-3 bg-card/60 border-border">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Estimated tax payments you've made — {year}</p>
        <p className="text-[11px] text-muted-foreground mb-2">Record what you actually paid. Due dates depend on your business type, so check them with your accountant.</p>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((q) => {
            const row = ex?.quarterly.find((x) => x.quarter === q);
            return <QuarterRow key={`${businessId}-${year}-${q}`} quarter={q} year={year} row={row ?? null} businessId={businessId} onSaved={refresh} />;
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Total recorded: <b className="text-foreground">{fmtCents(quarterlyPaid)}</b></p>
      </Card>

      <DocsCard docs={ex?.docs ?? null} businessId={businessId} workspaceId={data?.workspaceId ?? null} year={year} onOpen={openDoc} onSaved={refresh} />
    </div>
  );
}

function Tile({ label, value, sub, accent, onClick }: { label: string; value: string; sub?: string; accent?: boolean; onClick?: () => void }) {
  const C = onClick ? "button" : "div";
  return (
    <C onClick={onClick} className={`text-left rounded-lg border p-3 bg-card/60 ${accent ? "border-primary/40" : "border-border"} ${onClick ? "hover:border-primary/50" : ""}`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold text-foreground mt-0.5 tabular-nums break-all">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </C>
  );
}

function RankList({ title, rows }: { title: string; rows: Array<{ key: string; cents: number; count: number }> }) {
  const max = rows[0]?.cents || 1;
  return (
    <Card className="p-3 bg-card/60 border-border">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      {rows.length === 0 ? <p className="text-xs text-muted-foreground py-2">No spending recorded.</p> : (
        <ul className="space-y-1.5">
          {rows.slice(0, 10).map((r) => (
            <li key={r.key} className="text-xs">
              <div className="flex justify-between gap-2"><span className="truncate">{r.key} <span className="text-muted-foreground">({r.count})</span></span><span className="tabular-nums">{fmtCents(r.cents)}</span></div>
              <div className="h-1 mt-1 rounded bg-secondary/40"><div className="h-1 rounded bg-primary/70" style={{ width: `${Math.max(2, (r.cents / max) * 100)}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AllocateShare({ expenseId, businessId, remainingCents, onSaved }: { expenseId: string; businessId: string; remainingCents: number; onSaved: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const c = cents(amt);
    if (!/^\d+(\.\d{1,2})?$/.test(amt.trim()) || c <= 0) { toast({ title: "Enter a dollar amount above zero", variant: "destructive" }); return; }
    if (c > remainingCents) { toast({ title: `Can't be more than ${fmtCents(remainingCents)}`, variant: "destructive" }); return; }
    setSaving(true);
    const { data: existing } = await supabase.from("finance_expense_allocations").select("id, amount").eq("expense_id", expenseId).eq("business_id", businessId).maybeSingle();
    const res = existing
      ? await supabase.from("finance_expense_allocations").update({ amount: (cents(existing.amount) + c) / 100 }).eq("id", existing.id).select("id")
      : await supabase.from("finance_expense_allocations").insert({ expense_id: expenseId, business_id: businessId, amount: c / 100 }).select("id");
    setSaving(false);
    if (res.error || !res.data?.length) { toast({ title: "Couldn't save the share", description: res.error?.message, variant: "destructive" }); return; }
    toast({ title: "Share saved" }); setOpen(false); setAmt(""); onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7 text-xs">Assign this business's share</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>This business's share</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Up to {fmtCents(remainingCents)} isn't assigned yet. Enter the part that belongs to this business. Any amount you leave unassigned stays in review.</p>
        <Input inputMode="decimal" placeholder="0.00" value={amt} onChange={(e) => setAmt(e.target.value)} />
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save share"}</Button>
      </DialogContent>
    </Dialog>
  );
}

function QuarterRow({ quarter, year, row, businessId, onSaved }: { quarter: number; year: number; row: QuarterlyTax | null; businessId: string; onSaved: () => void }) {
  const { toast } = useToast();
  const [amt, setAmt] = useState(row ? String(row.amount_paid) : "");
  const [date, setDate] = useState(row?.paid_on ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setAmt(row ? String(row.amount_paid) : ""); setDate(row?.paid_on ?? ""); }, [row]);
  const save = async () => {
    const a = amt.trim() === "" ? "0" : amt.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(a)) { toast({ title: "Enter a valid dollar amount", variant: "destructive" }); return; }
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number(date.slice(0, 4)) < year || Number(date.slice(0, 4)) > year + 1)) {
      toast({ title: `Paid date should be in ${year} or ${year + 1}`, variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = { amount_paid: cents(a) / 100, paid_on: date || null };
    const res = row
      ? await supabase.from("finance_quarterly_taxes").update(payload).eq("id", row.id).eq("business_id", businessId).select("id")
      : await supabase.from("finance_quarterly_taxes").insert({ ...payload, business_id: businessId, tax_year: year, quarter }).select("id");
    setSaving(false);
    if (res.error || !res.data?.length) { toast({ title: "Didn't save", description: res.error?.message ?? "No change was saved.", variant: "destructive" }); return; }
    toast({ title: `Q${quarter} payment saved` }); onSaved();
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <p className="text-sm font-medium w-24">Payment {quarter}</p>
      <Input aria-label={`Payment ${quarter} amount`} inputMode="decimal" placeholder="$0.00" value={amt} onChange={(e) => setAmt(e.target.value)} className="h-9 w-28" />
      <Input aria-label={`Payment ${quarter} date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-40" />
      <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
    </div>
  );
}

function DocsCard({ docs, businessId, workspaceId, year, onOpen, onSaved }: { docs: TaxDoc[] | null; businessId: string; workspaceId: string | null; year: number; onOpen: (d: TaxDoc) => void; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-3 bg-card/60 border-border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tax documents — {year}</p>
        {workspaceId && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Upload</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload tax document</DialogTitle></DialogHeader>
              <UploadDocForm businessId={businessId} workspaceId={workspaceId} defaultYear={year} onSaved={() => { setOpen(false); onSaved(); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>
      {docs === null ? <p className="text-xs text-muted-foreground">Loading…</p> : docs.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">No documents uploaded.</p>
      ) : (
        <div className="space-y-1.5">
          {docs.map((d) => (
            <button key={d.id} onClick={() => onOpen(d)} className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary/40 text-left">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{d.document_type}{d.person_name ? ` — ${d.person_name}` : ""}</p>
                <p className="text-[11px] text-muted-foreground truncate">{d.file_name ?? d.file_url}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function UploadDocForm({ businessId, workspaceId, defaultYear, onSaved }: { businessId: string; workspaceId: string; defaultYear: number; onSaved: () => void }) {
  const { toast } = useToast();
  const [tax_year, setTaxYear] = useState<number>(defaultYear);
  const [document_type, setDocType] = useState<string>("Other");
  const [person_name, setPerson] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!file) { toast({ title: "Choose a file first", variant: "destructive" }); return; }
    if (!Number.isInteger(tax_year) || tax_year < 2000 || tax_year > 2100) { toast({ title: "Enter a valid tax year", variant: "destructive" }); return; }
    setSaving(true);
    const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${workspaceId}/${tax_year}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("finance-tax-docs").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upErr) { setSaving(false); toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return; }
    const { error } = await supabase.from("finance_tax_documents").insert({ business_id: businessId, tax_year, document_type, person_name: person_name || null, file_url: path, file_name: file.name, notes: notes || null });
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    onSaved();
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tax year"><Input type="number" value={tax_year} onChange={(e) => setTaxYear(Number(e.target.value) || defaultYear)} /></Field>
        <Field label="Document type">
          <Select value={document_type} onValueChange={setDocType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TAX_DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Person / vendor name (optional)"><Input value={person_name} onChange={(e) => setPerson(e.target.value)} /></Field>
      <Field label="File">
        <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background cursor-pointer">
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground flex-1 truncate">{file ? file.name : "Choose PDF or image"}</span>
          <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </Field>
      <Field label="Notes (optional)"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Button onClick={submit} disabled={saving} className="w-full">{saving ? "Uploading…" : "Upload document"}</Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

