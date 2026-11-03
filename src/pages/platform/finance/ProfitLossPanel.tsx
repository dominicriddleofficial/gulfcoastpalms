import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtPct, DIRECT_COST_CATEGORIES } from "@/lib/finance";
import { useCashRecords } from "@/hooks/useCashRecords";
import { fmtCents, type CashEntry } from "@/lib/cashRecords";

type View = "monthly" | "quarterly" | "ytd";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Month numbers (1-12) included in the selected period. Pure date-key math, no time zones. */
export function periodMonths(view: View, month: number, quarter: number): number[] {
  if (view === "monthly") return [month];
  if (view === "quarterly") return [1, 2, 3].map((i) => (quarter - 1) * 3 + i);
  return Array.from({ length: 12 }, (_, i) => i + 1);
}

export default function ProfitLossPanel({ businessId }: { businessId: string }) {
  const [view, setView] = useState<View>("ytd");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const cash = useCashRecords(businessId, year);
  const data = cash.data && cash.data.businessId === businessId && cash.data.year === year ? cash.data : null;
  const s = data?.summary;

  const p = useMemo(() => {
    if (!s) return null;
    const months = new Set(periodMonths(view, month, quarter));
    const inP = (e: CashEntry) => months.has(Number(e.date.slice(5, 7)));
    const sum = (a: CashEntry[]) => a.filter(inP).reduce((t, e) => t + e.amountCents, 0);
    const expenses = new Map<string, number>();
    for (const e of s.expenses.filter(inP)) expenses.set(e.category, (expenses.get(e.category) ?? 0) + e.amountCents);
    const payments = sum(s.receipts.filter((r) => r.source === "payment"));
    const manual = sum(s.receipts.filter((r) => r.source === "manual_income"));
    const bank = sum(s.receipts.filter((r) => r.source === "bank"));
    const refunds = sum(s.refunds);
    const payroll = sum(s.payroll);
    const unresolved = s.issues.filter((i) => i.date && months.has(Number(i.date.slice(5, 7)))).length;
    return { payments, manual, bank, refunds, payroll, expenses, unresolved };
  }, [s, view, month, quarter]);

  const revenue = p ? p.payments + p.manual + p.bank - p.refunds : 0;
  const direct = p ? [...p.expenses].filter(([c]) => DIRECT_COST_CATEGORIES.has(c)).reduce((t, [, v]) => t + v, 0) : 0;
  const opEx = p ? [...p.expenses].filter(([c]) => !DIRECT_COST_CATEGORIES.has(c)).reduce((t, [, v]) => t + v, 0) : 0;
  const gross = revenue - direct;
  const net = gross - opEx - (p?.payroll ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={view} onValueChange={(v) => setView(v as View)}>
          <SelectTrigger aria-label="Period" className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="ytd">Full year</SelectItem></SelectContent>
        </Select>
        <Input aria-label="Year" type="number" value={year} onChange={(e) => { const y = Number(e.target.value); if (y >= 2000 && y <= 2100) setYear(y); }} className="h-8 w-24" />
        {view === "monthly" && (
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger aria-label="Month" className="h-8 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {view === "quarterly" && (
          <Select value={String(quarter)} onValueChange={(v) => setQuarter(Number(v))}>
            <SelectTrigger aria-label="Quarter" className="h-8 w-20"><SelectValue /></SelectTrigger>
            <SelectContent>{[1, 2, 3, 4].map((q) => <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">Built from recorded money in and out for this business only. Shared expenses count only after you assign this business's share.</p>

      {cash.isError ? <p className="text-xs text-destructive">Couldn't load records.</p> : !p ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <Card className="p-5 bg-card/70 border-border space-y-5">
          {p.unresolved > 0 && <p className="text-xs text-amber-500">{p.unresolved} items in this period still need review in the Tax tab.</p>}
          <Section title="Money in">
            <Line label="App payments" value={p.payments} />
            <Line label="Manual income" value={p.manual} />
            <Line label="Bank deposits (sorted)" value={p.bank} />
            <Line label="Refunds" value={-p.refunds} />
            <Total label="Total money in" value={revenue} />
          </Section>
          <Section title="Direct costs">
            {[...DIRECT_COST_CATEGORIES].map((c) => <Line key={c} label={c} value={-(p.expenses.get(c) ?? 0)} />)}
            <Total label="Total direct costs" value={-direct} />
          </Section>
          <div className="border-t border-border pt-3">
            <div className="flex justify-between items-baseline"><span className="font-display text-sm font-semibold">Gross profit</span><span className={`font-display text-lg font-bold ${gross < 0 ? "text-destructive" : "text-foreground"}`}>{fmtCents(gross)}</span></div>
            <p className="text-[11px] text-muted-foreground text-right">Margin {revenue ? fmtPct(gross / revenue) : "—"}</p>
          </div>
          <Section title="Operating expenses">
            {[...p.expenses].filter(([c]) => !DIRECT_COST_CATEGORIES.has(c)).map(([c, v]) => <Line key={c} label={c} value={-v} />)}
            <Line label="Payroll" value={-p.payroll} />
            <Total label="Total operating expenses" value={-(opEx + p.payroll)} />
          </Section>
          <div className="border-t-2 border-primary/30 pt-3">
            <div className="flex justify-between items-baseline"><span className="font-display text-base font-bold">Net (from records)</span><span className={`font-display text-2xl font-bold ${net < 0 ? "text-destructive" : "text-primary"}`}>{fmtCents(net)}</span></div>
            <p className="text-xs text-muted-foreground text-right">Net margin {revenue ? fmtPct(net / revenue) : "—"}</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">{title}</p><div className="space-y-0.5">{children}</div></div>;
}
function Line({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between text-sm text-foreground/85"><span>{label}</span><span className={`tabular-nums ${value < 0 ? "text-destructive" : ""}`}>{fmtCents(value)}</span></div>;
}
function Total({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between text-sm font-semibold border-t border-border pt-1 mt-1"><span>{label}</span><span className={`tabular-nums ${value < 0 ? "text-destructive" : ""}`}>{fmtCents(value)}</span></div>;
}
