import { todayLocalKey } from "@/lib/localDate";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download } from "lucide-react";
import { downloadCSV } from "@/lib/finance";
import { cashKey, useCashRecords } from "@/hooks/useCashRecords";
import { cents, fmtCents } from "@/lib/cashRecords";

const SOURCE_LABEL = { payment: "App payment", manual_income: "Manual", bank: "Bank import", expense: "Expense", payroll: "Payroll" } as const;

export default function IncomePanel({ businessId }: { businessId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [open, setOpen] = useState(false);
  const cash = useCashRecords(businessId, year);
  const data = cash.data && cash.data.businessId === businessId && cash.data.year === year ? cash.data : null;
  const s = data?.summary;

  const rows = s ? [...s.receipts, ...s.refunds].sort((a, b) => b.date.localeCompare(a.date)) : [];
  const bySource = (src: "payment" | "manual_income" | "bank") => (s?.receipts ?? []).filter((r) => r.source === src).reduce((t, r) => t + r.amountCents, 0);

  const exportCsv = () => downloadCSV(`income-${year}.csv`, rows.map((r) => ({
    date: r.date, type: r.kind, source: SOURCE_LABEL[r.source], description: r.label, method: r.method, reference: r.reference, amount: (r.amountCents / 100).toFixed(2),
  })));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 items-center">
          <Label htmlFor="income-year" className="text-xs text-muted-foreground">Year</Label>
          <Input id="income-year" type="number" value={year} onChange={(e) => { const y = Number(e.target.value); if (y >= 2000 && y <= 2100) setYear(y); }} className="w-24 h-8" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!s}><Download className="w-3.5 h-3.5 mr-1" /> CSV</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Add income</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add income</DialogTitle></DialogHeader>
              <AddIncomeForm businessId={businessId} onSaved={() => { setOpen(false); void qc.invalidateQueries({ queryKey: cashKey(businessId, year) }); toast({ title: "Income added" }); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">Money actually received, by the day it came in. Scheduled job value is in Analytics, not here.</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Stat label="App payments" value={fmtCents(bySource("payment"))} />
        <Stat label="Manual" value={fmtCents(bySource("manual_income"))} />
        <Stat label="Bank (sorted)" value={fmtCents(bySource("bank"))} />
        <Stat label="Refunds" value={fmtCents(s?.totals.refunds ?? 0)} />
        <Stat label={`${year} net received`} value={fmtCents((s?.totals.receipts ?? 0) - (s?.totals.refunds ?? 0))} highlight />
      </div>

      {cash.isError ? <p className="text-xs text-destructive">Couldn't load income.</p> : !s ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <Card className="bg-card/60 border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Source</th><th className="text-left px-3 py-2">Details</th><th className="text-right px-3 py-2">Amount</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">No income recorded for {year}.</td></tr>}
                {rows.map((r) => (
                  <tr key={`${r.kind}-${r.source}-${r.id}`} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2 text-xs">{SOURCE_LABEL[r.source]}{r.kind === "refund" ? " (refund)" : ""}</td>
                    <td className="px-3 py-2 break-words">{r.label}{r.method ? ` · ${r.method}` : ""}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.kind === "refund" ? "−" : ""}{fmtCents(r.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`p-3 border-border ${highlight ? "bg-primary/10 border-primary/30" : "bg-card/60"}`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-display text-base font-bold mt-0.5 tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
    </Card>
  );
}

function AddIncomeForm({ businessId, onSaved }: { businessId: string; onSaved: () => void }) {
  const { toast } = useToast();
  const [income_date, setDate] = useState(todayLocalKey());
  const [customer_name, setCustomer] = useState("");
  const [amountStr, setAmount] = useState("");
  const [service_type, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!/^\d+(\.\d{1,2})?$/.test(amountStr.trim()) || cents(amountStr) <= 0) { toast({ title: "Enter an amount above zero", variant: "destructive" }); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(income_date)) { toast({ title: "Pick a date", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("finance_income").insert({
      business_id: businessId, income_date, customer_name: customer_name || null,
      amount: cents(amountStr) / 100, service_type: service_type || null, source: "manual", notes: notes || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Didn't save", description: error.message, variant: "destructive" }); return; }
    onSaved();
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">Only add money that isn't already recorded as a payment, or it will count twice.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Date received</Label><Input type="date" value={income_date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Amount ($)</Label><Input inputMode="decimal" value={amountStr} onChange={(e) => setAmount(e.target.value)} /></div>
      </div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Customer name</Label><Input value={customer_name} onChange={(e) => setCustomer(e.target.value)} /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Service type</Label><Input value={service_type} onChange={(e) => setService(e.target.value)} placeholder="e.g. Cash trim job" /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <Button onClick={submit} disabled={saving} className="w-full">{saving ? "Saving…" : "Add income"}</Button>
    </div>
  );
}
