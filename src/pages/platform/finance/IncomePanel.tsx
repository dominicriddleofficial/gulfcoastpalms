import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download } from "lucide-react";
import { fmtUSD, downloadCSV } from "@/lib/finance";

interface ManualIncome {
  id: string;
  income_date: string;
  customer_name: string | null;
  amount: number;
  service_type: string | null;
  notes: string | null;
}
interface JobberJob {
  id: string;
  scheduled_start: string | null;
  client_name: string | null;
  total_amount: number;
  status: string;
}
interface InvoiceRow {
  id: string;
  paid_at: string | null;
  total: number;
  amount_paid: number;
  status: string;
}

export default function IncomePanel({ businessId }: { businessId: string }) {
  const { toast } = useToast();
  const [manual, setManual] = useState<ManualIncome[]>([]);
  const [jobs, setJobs] = useState<JobberJob[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  const reload = async () => {
    setLoading(true);
    const yStart = `${year}-01-01`;
    const yEnd = `${year + 1}-01-01`;
    const [m, j, inv] = await Promise.all([
      supabase.from("finance_income").select("*")
        .eq("business_id", businessId)
        .gte("income_date", yStart).lt("income_date", yEnd)
        .order("income_date", { ascending: false }),
      supabase.from("jobber_jobs")
        .select("id, scheduled_start, client_name, total_amount, status")
        .eq("business_id", businessId)
        .gte("scheduled_start", yStart).lt("scheduled_start", yEnd)
        .in("status", ["completed", "complete", "closed", "invoiced"]),
      supabase.from("platform_invoices")
        .select("id, paid_at, total, amount_paid, status")
        .eq("business_id", businessId)
        .eq("status", "paid")
        .gte("paid_at", yStart).lt("paid_at", yEnd),
    ]);
    setManual((m.data as ManualIncome[]) ?? []);
    setJobs((j.data as JobberJob[]) ?? []);
    setInvoices((inv.data as InvoiceRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void reload(); /* eslint-disable-line */ }, [businessId, year]);

  const totals = useMemo(() => {
    const collected = invoices.reduce((s, i) => s + Number(i.amount_paid ?? i.total ?? 0), 0);
    const earned = jobs.reduce((s, j) => s + Number(j.total_amount ?? 0), 0);
    const manualTot = manual.reduce((s, m) => s + Number(m.amount ?? 0), 0);
    return { collected, earned, manualTot, grand: collected + manualTot };
  }, [invoices, jobs, manual]);

  const exportCsv = () => {
    const rows = [
      ...invoices.map((i) => ({
        date: i.paid_at?.slice(0, 10) ?? "",
        source: "Invoice (Collected)",
        customer: "",
        amount: i.amount_paid ?? i.total,
      })),
      ...jobs.map((j) => ({
        date: j.scheduled_start?.slice(0, 10) ?? "",
        source: "Jobber Job (Earned)",
        customer: j.client_name ?? "",
        amount: j.total_amount,
      })),
      ...manual.map((m) => ({
        date: m.income_date,
        source: "Manual",
        customer: m.customer_name ?? "",
        amount: m.amount,
      })),
    ];
    downloadCSV(`income-${year}.csv`, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 items-center">
          <Label className="text-xs text-muted-foreground">Year</Label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
            className="w-24 h-8"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Add income</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add income</DialogTitle></DialogHeader>
              <AddIncomeForm
                businessId={businessId}
                onSaved={() => { setOpen(false); void reload(); toast({ title: "Income added" }); }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Collected (paid invoices)" value={fmtUSD(totals.collected)} />
        <Stat label="Earned (Jobber jobs)" value={fmtUSD(totals.earned)} muted />
        <Stat label="Manual" value={fmtUSD(totals.manualTot)} />
        <Stat label={`${year} Total`} value={fmtUSD(totals.grand)} highlight />
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <Card className="bg-card/60 border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Source</th>
                  <th className="text-left px-3 py-2">Customer / Service</th>
                  <th className="text-right px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...invoices.map((i) => ({
                    key: `inv-${i.id}`, date: i.paid_at?.slice(0, 10) ?? "",
                    source: "Invoice (Collected)", label: "—",
                    amount: Number(i.amount_paid ?? i.total ?? 0),
                  })),
                  ...jobs.map((j) => ({
                    key: `job-${j.id}`, date: j.scheduled_start?.slice(0, 10) ?? "",
                    source: "Jobber (Earned)", label: j.client_name ?? "—",
                    amount: Number(j.total_amount ?? 0),
                  })),
                  ...manual.map((m) => ({
                    key: `man-${m.id}`, date: m.income_date,
                    source: "Manual",
                    label: `${m.customer_name ?? "—"}${m.service_type ? " · " + m.service_type : ""}`,
                    amount: Number(m.amount ?? 0),
                  })),
                ]
                  .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                  .map((r) => (
                    <tr key={r.key} className="border-t border-border">
                      <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                      <td className="px-3 py-2 text-xs">{r.source}</td>
                      <td className="px-3 py-2 truncate">{r.label}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmtUSD(r.amount)}</td>
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

function Stat({ label, value, highlight, muted }: { label: string; value: string; highlight?: boolean; muted?: boolean }) {
  return (
    <Card className={`p-3 border-border ${highlight ? "bg-primary/10 border-primary/30" : "bg-card/60"}`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-display text-base font-bold mt-0.5 ${highlight ? "text-primary" : muted ? "text-muted-foreground" : "text-foreground"}`}>
        {value}
      </p>
    </Card>
  );
}

function AddIncomeForm({ businessId, onSaved }: { businessId: string; onSaved: () => void }) {
  const [income_date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customer_name, setCustomer] = useState("");
  const [amountStr, setAmount] = useState("");
  const [service_type, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const { error } = await supabase.from("finance_income").insert({
      business_id: businessId,
      income_date,
      customer_name: customer_name || null,
      amount: Number(amountStr) || 0,
      service_type: service_type || null,
      source: "manual",
      notes: notes || null,
    });
    setSaving(false);
    if (!error) onSaved();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input type="date" value={income_date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Amount ($)</Label>
          <Input type="number" inputMode="decimal" value={amountStr} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Customer name</Label>
        <Input value={customer_name} onChange={(e) => setCustomer(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Service type</Label>
        <Input value={service_type} onChange={(e) => setService(e.target.value)} placeholder="e.g. Cash trim job" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button onClick={submit} disabled={saving} className="w-full">
        {saving ? "Saving…" : "Add income"}
      </Button>
    </div>
  );
}