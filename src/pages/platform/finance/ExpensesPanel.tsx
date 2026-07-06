import { todayLocalKey } from "@/lib/localDate";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Receipt as ReceiptIcon, Camera } from "lucide-react";
import {
  fmtUSD, downloadCSV, EXPENSE_CATEGORIES, PAYMENT_METHODS,
  compressImage, loadWorkspaceBusinesses,
} from "@/lib/finance";

interface ExpenseRow {
  id: string;
  business_id: string | null;
  workspace_id: string;
  is_shared: boolean;
  expense_date: string;
  amount: number;
  category: string;
  subcategory: string | null;
  vendor: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  notes: string | null;
  recurring: boolean;
  recurring_frequency: string | null;
}

export default function ExpensesPanel({ businessId }: { businessId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10);

  const reload = async () => {
    setLoading(true);
    const { workspaceId: wsId } = await loadWorkspaceBusinesses(businessId);
    setWorkspaceId(wsId);
    if (!wsId) { setRows([]); setLoading(false); return; }
    const { data } = await supabase
      .from("finance_expenses")
      .select("*")
      .eq("workspace_id", wsId)
      .or(`business_id.eq.${businessId},is_shared.eq.true`)
      .gte("expense_date", monthStart)
      .lt("expense_date", nextMonth)
      .order("expense_date", { ascending: false });
    setRows((data as ExpenseRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void reload(); /* eslint-disable-line */ }, [businessId]);

  const filtered = rows.filter((r) => {
    if (catFilter !== "all" && r.category !== catFilter) return false;
    if (search && !`${r.vendor ?? ""} ${r.notes ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered) {
      // Shared rows count as half toward this workspace's view
      const amt = r.is_shared ? Number(r.amount) / 2 : Number(r.amount);
      m.set(r.category, (m.get(r.category) ?? 0) + amt);
    }
    return m;
  }, [filtered]);

  const total = Array.from(byCat.values()).reduce((s, v) => s + v, 0);

  const exportCsv = () => {
    downloadCSV(`expenses-${monthStart}.csv`, filtered.map((r) => ({
      date: r.expense_date, vendor: r.vendor ?? "", category: r.category,
      subcategory: r.subcategory ?? "", amount: r.amount,
      shared: r.is_shared ? "yes" : "no",
      payment_method: r.payment_method ?? "",
      notes: r.notes ?? "",
    })));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 items-center flex-wrap">
          <Input placeholder="Search vendor / notes" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-44" />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-3.5 h-3.5 mr-1" /> CSV</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Add expense</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add expense</DialogTitle></DialogHeader>
              {workspaceId && (
                <AddExpenseForm
                  businessId={businessId}
                  workspaceId={workspaceId}
                  onSaved={() => { setOpen(false); void reload(); toast({ title: "Expense added" }); }}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-3 bg-card/60 border-border">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">This month total</p>
        <p className="font-display text-xl font-bold text-foreground">{fmtUSD(total)}</p>
        <div className="mt-2 flex gap-2 flex-wrap">
          {Array.from(byCat.entries()).map(([c, v]) => (
            <span key={c} className="text-[11px] px-2 py-0.5 rounded bg-secondary/60">
              {c}: <span className="font-semibold text-foreground">{fmtUSD(v)}</span>
            </span>
          ))}
        </div>
      </Card>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <Card className="bg-card/60 border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Vendor</th>
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-center px-3 py-2">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">{r.expense_date}</td>
                    <td className="px-3 py-2">{r.vendor ?? "—"}{r.is_shared && <span className="ml-1 text-[9px] uppercase text-muted-foreground">(shared)</span>}</td>
                    <td className="px-3 py-2 text-xs">{r.category}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmtUSD(r.amount)}</td>
                    <td className="px-3 py-2 text-center">{r.receipt_url ? <ReceiptIcon className="inline w-3.5 h-3.5 text-primary" /> : "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-muted-foreground">No expenses this month.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function AddExpenseForm({
  businessId, workspaceId, onSaved,
}: { businessId: string; workspaceId: string; onSaved: () => void }) {
  const [expense_date, setDate] = useState(todayLocalKey());
  const [amountStr, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Misc");
  const [subcategory, setSub] = useState("");
  const [scope, setScope] = useState<"this" | "shared">("this");
  const [vendor, setVendor] = useState("");
  const [payment_method, setMethod] = useState<string>("cash");
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [recurring_frequency, setFreq] = useState<string>("monthly");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    let receipt_url: string | null = null;
    if (file) {
      const blob = await compressImage(file);
      const path = `${workspaceId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}.jpg`;
      const { error: upErr } = await supabase.storage.from("finance-receipts").upload(path, blob, {
        contentType: "image/jpeg", upsert: false,
      });
      if (!upErr) receipt_url = path;
    }
    const { error } = await supabase.from("finance_expenses").insert({
      business_id: scope === "shared" ? null : businessId,
      workspace_id: workspaceId,
      is_shared: scope === "shared",
      expense_date,
      amount: Number(amountStr) || 0,
      category, subcategory: subcategory || null,
      vendor: vendor || null,
      payment_method,
      receipt_url,
      notes: notes || null,
      recurring,
      recurring_frequency: recurring ? recurring_frequency : null,
    });
    setSaving(false);
    if (!error) onSaved();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><Input type="date" value={expense_date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Amount ($)"><Input type="number" inputMode="decimal" value={amountStr} onChange={(e) => setAmount(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Subcategory"><Input value={subcategory} onChange={(e) => setSub(e.target.value)} /></Field>
      </div>
      <Field label="Workspace">
        <Select value={scope} onValueChange={(v) => setScope(v as "this" | "shared")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this">This workspace only</SelectItem>
            <SelectItem value="shared">Shared (split 50/50)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vendor"><Input value={vendor} onChange={(e) => setVendor(e.target.value)} /></Field>
        <Field label="Payment method">
          <Select value={payment_method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Receipt photo">
        <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background cursor-pointer">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground flex-1 truncate">
            {file ? file.name : "Tap to capture or upload"}
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </Field>
      <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <div className="flex items-center gap-2">
        <input id="rec" type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
        <Label htmlFor="rec" className="text-xs">Recurring</Label>
        {recurring && (
          <Select value={recurring_frequency} onValueChange={setFreq}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Biweekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <Button onClick={submit} disabled={saving} className="w-full">{saving ? "Saving…" : "Add expense"}</Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}