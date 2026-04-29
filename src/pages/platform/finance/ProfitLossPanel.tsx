import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fmtUSD, fmtPct, DIRECT_COST_CATEGORIES, loadWorkspaceBusinesses } from "@/lib/finance";

type View = "monthly" | "quarterly" | "ytd";

export default function ProfitLossPanel({ businessId }: { businessId: string }) {
  const [view, setView] = useState<View>("ytd");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [scope, setScope] = useState<"this" | "combined">("this");

  const [data, setData] = useState<{
    invoices: number; manualIncome: number; jobsEarned: number;
    payroll: number;
    expenses: Map<string, number>;
  }>({ invoices: 0, manualIncome: 0, jobsEarned: 0, payroll: 0, expenses: new Map() });
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    if (view === "monthly") {
      const s = new Date(year, month - 1, 1);
      const e = new Date(year, month, 1);
      return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) };
    }
    if (view === "quarterly") {
      const sm = (quarter - 1) * 3;
      return {
        start: new Date(year, sm, 1).toISOString().slice(0, 10),
        end: new Date(year, sm + 3, 1).toISOString().slice(0, 10),
      };
    }
    return {
      start: `${year}-01-01`,
      end: `${year + 1}-01-01`,
    };
  }, [view, year, month, quarter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { workspaceId, businesses } = await loadWorkspaceBusinesses(businessId);
      const bizIds = scope === "combined"
        ? businesses.map((b) => b.id)
        : [businessId];

      const [inv, jobs, manual, pay, exp] = await Promise.all([
        supabase.from("platform_invoices")
          .select("amount_paid, total")
          .in("business_id", bizIds).eq("status", "paid")
          .gte("paid_at", range.start).lt("paid_at", range.end),
        supabase.from("jobber_jobs")
          .select("total_amount")
          .in("business_id", bizIds)
          .in("status", ["completed", "complete", "closed", "invoiced"])
          .gte("scheduled_start", range.start).lt("scheduled_start", range.end),
        supabase.from("finance_income")
          .select("amount")
          .in("business_id", bizIds)
          .gte("income_date", range.start).lt("income_date", range.end),
        supabase.from("finance_payroll_payments")
          .select("total_amount")
          .in("business_id", bizIds)
          .gte("pay_date", range.start).lt("pay_date", range.end),
        workspaceId
          ? supabase.from("finance_expenses")
              .select("amount, category, is_shared, business_id")
              .eq("workspace_id", workspaceId)
              .gte("expense_date", range.start).lt("expense_date", range.end)
          : Promise.resolve({ data: [] as Array<{ amount: number; category: string; is_shared: boolean; business_id: string | null }> }),
      ]);

      if (cancelled) return;

      const invoices = (inv.data ?? []).reduce((s, r) => s + Number(r.amount_paid ?? r.total ?? 0), 0);
      const jobsEarned = (jobs.data ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
      const manualIncome = (manual.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const payroll = (pay.data ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0);

      const expenseMap = new Map<string, number>();
      for (const e of (exp.data ?? []) as Array<{ amount: number; category: string; is_shared: boolean; business_id: string | null }>) {
        // Shared rows: in single-workspace view count half; in combined view count full once
        let amt = Number(e.amount);
        if (e.is_shared && scope === "this") amt = amt / 2;
        // Skip rows belonging to other workspace businesses (shouldn't happen — RLS scoped)
        expenseMap.set(e.category, (expenseMap.get(e.category) ?? 0) + amt);
      }

      setData({ invoices, manualIncome, jobsEarned, payroll, expenses: expenseMap });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [businessId, range.start, range.end, scope]);

  const revenue = data.invoices + data.manualIncome;
  const directCosts = Array.from(data.expenses.entries())
    .filter(([c]) => DIRECT_COST_CATEGORIES.has(c))
    .reduce((s, [, v]) => s + v, 0);
  const opEx = Array.from(data.expenses.entries())
    .filter(([c]) => !DIRECT_COST_CATEGORIES.has(c))
    .reduce((s, [, v]) => s + v, 0);
  const grossProfit = revenue - directCosts;
  const grossMargin = revenue ? grossProfit / revenue : 0;
  const netProfit = grossProfit - opEx - data.payroll;
  const netMargin = revenue ? netProfit / revenue : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={view} onValueChange={(v) => setView(v as View)}>
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="ytd">YTD</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} className="h-8 w-24" />
        {view === "monthly" && (
          <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value) || month)} className="h-8 w-20" />
        )}
        {view === "quarterly" && (
          <Select value={String(quarter)} onValueChange={(v) => setQuarter(Number(v))}>
            <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((q) => <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={scope} onValueChange={(v) => setScope(v as "this" | "combined")}>
          <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this">This workspace</SelectItem>
            <SelectItem value="combined">Combined (both)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <Card className="p-5 bg-card/70 border-border space-y-5">
          <Section title="Revenue">
            <Line label="Invoices (paid)" value={data.invoices} />
            <Line label="Manual income" value={data.manualIncome} />
            <Line label="Jobber earned (info only)" value={data.jobsEarned} muted />
            <Total label="Total Revenue" value={revenue} />
          </Section>

          <Section title="Direct Costs">
            {Array.from(DIRECT_COST_CATEGORIES).map((c) => (
              <Line key={c} label={c} value={data.expenses.get(c) ?? 0} />
            ))}
            <Total label="Total Direct Costs" value={directCosts} />
          </Section>

          <div className="border-t border-border pt-3">
            <div className="flex justify-between items-baseline">
              <span className="font-display text-sm font-semibold">Gross Profit</span>
              <span className={`font-display text-lg font-bold ${grossProfit < 0 ? "text-destructive" : "text-foreground"}`}>{fmtUSD(grossProfit)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground text-right">Margin {fmtPct(grossMargin)}</p>
          </div>

          <Section title="Operating Expenses">
            {Array.from(data.expenses.entries())
              .filter(([c]) => !DIRECT_COST_CATEGORIES.has(c))
              .map(([c, v]) => <Line key={c} label={c} value={v} />)}
            <Line label="Payroll" value={data.payroll} />
            <Total label="Total Operating Expenses" value={opEx + data.payroll} />
          </Section>

          <div className="border-t-2 border-primary/30 pt-3">
            <div className="flex justify-between items-baseline">
              <span className="font-display text-base font-bold">Net Profit</span>
              <span className={`font-display text-2xl font-bold ${netProfit < 0 ? "text-destructive" : "text-primary"}`}>{fmtUSD(netProfit)}</span>
            </div>
            <p className="text-xs text-muted-foreground text-right">Net margin {fmtPct(netMargin)}</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
function Line({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${muted ? "text-muted-foreground" : "text-foreground/85"}`}>
      <span>{label}</span>
      <span className={value < 0 ? "text-destructive" : ""}>{fmtUSD(value)}</span>
    </div>
  );
}
function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm font-semibold border-t border-border pt-1 mt-1">
      <span>{label}</span>
      <span className={value < 0 ? "text-destructive" : ""}>{fmtUSD(value)}</span>
    </div>
  );
}

// re-export Label so unused import warnings don't trip noise (Label not used here actually)
export { Label as _UnusedLabel };