import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, FileText, Upload, ExternalLink } from "lucide-react";
import {
  fmtUSD, downloadCSV, TAX_DOC_TYPES, loadWorkspaceBusinesses,
} from "@/lib/finance";

interface TaxDoc {
  id: string;
  business_id: string;
  tax_year: number;
  document_type: string;
  person_name: string | null;
  file_url: string;
  file_name: string | null;
  notes: string | null;
  created_at: string;
}

interface QuarterlyTax {
  id: string;
  business_id: string;
  tax_year: number;
  quarter: number;
  amount_paid: number;
  paid_on: string | null;
  notes: string | null;
}

const QUARTERS = [
  { q: 1, label: "Q1 (Jan–Mar)", due: "Apr 15" },
  { q: 2, label: "Q2 (Apr–May)", due: "Jun 15" },
  { q: 3, label: "Q3 (Jun–Aug)", due: "Sep 15" },
  { q: 4, label: "Q4 (Sep–Dec)", due: "Jan 15" },
];

export default function TaxCenterPanel({ businessId }: { businessId: string }) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [docs, setDocs] = useState<TaxDoc[]>([]);
  const [quarterly, setQuarterly] = useState<QuarterlyTax[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [ytdRevenue, setYtdRevenue] = useState(0);
  const [ytdDeductible, setYtdDeductible] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const reload = async () => {
    setLoading(true);
    const { workspaceId: wsId } = await loadWorkspaceBusinesses(businessId);
    setWorkspaceId(wsId);

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year + 1}-01-01`;

    const [docsRes, qRes, invRes, expRes] = await Promise.all([
      supabase.from("finance_tax_documents").select("*").eq("business_id", businessId).eq("tax_year", year).order("created_at", { ascending: false }),
      supabase.from("finance_quarterly_taxes").select("*").eq("business_id", businessId).eq("tax_year", year),
      supabase.from("platform_invoices").select("total, paid_at").eq("business_id", businessId).eq("status", "paid").gte("paid_at", yearStart).lt("paid_at", yearEnd),
      wsId
        ? supabase.from("finance_expenses").select("amount, category, is_shared").eq("workspace_id", wsId).or(`business_id.eq.${businessId},is_shared.eq.true`).gte("expense_date", yearStart).lt("expense_date", yearEnd)
        : Promise.resolve({ data: [] as Array<{ amount: number; category: string; is_shared: boolean }> }),
    ]);

    setDocs((docsRes.data as TaxDoc[]) ?? []);
    setQuarterly((qRes.data as QuarterlyTax[]) ?? []);

    const rev = (invRes.data ?? []).reduce((s, r: { total: number | null }) => s + Number(r.total ?? 0), 0);
    setYtdRevenue(rev);

    const exp = ((expRes.data as Array<{ amount: number; category: string; is_shared: boolean }>) ?? []).reduce((s, r) => {
      const amt = r.is_shared ? Number(r.amount) / 2 : Number(r.amount);
      return s + amt;
    }, 0);
    setYtdDeductible(exp);

    setLoading(false);
  };

  useEffect(() => { void reload(); /* eslint-disable-line */ }, [businessId, year]);

  const estimatedTax = useMemo(() => {
    const taxable = Math.max(0, ytdRevenue - ytdDeductible);
    // Rough self-employment + federal estimate (~25%). Educational only.
    return taxable * 0.25;
  }, [ytdRevenue, ytdDeductible]);

  const totalQuarterlyPaid = useMemo(
    () => quarterly.reduce((s, q) => s + Number(q.amount_paid), 0),
    [quarterly],
  );

  const exportYearCsv = () => {
    downloadCSV(`tax-summary-${year}.csv`, [
      { metric: "Revenue (paid invoices)", value: ytdRevenue },
      { metric: "Deductible expenses", value: ytdDeductible },
      { metric: "Taxable estimate", value: Math.max(0, ytdRevenue - ytdDeductible) },
      { metric: "Estimated tax (25%)", value: estimatedTax },
      { metric: "Quarterly paid", value: totalQuarterlyPaid },
      { metric: "Estimated remaining", value: Math.max(0, estimatedTax - totalQuarterlyPaid) },
    ]);
  };

  const getQuarter = (q: number) => quarterly.find((x) => x.quarter === q);

  const saveQuarter = async (q: number, amount: number, paid_on: string) => {
    const existing = getQuarter(q);
    if (existing) {
      await supabase.from("finance_quarterly_taxes")
        .update({ amount_paid: amount, paid_on: paid_on || null })
        .eq("id", existing.id);
    } else {
      await supabase.from("finance_quarterly_taxes").insert({
        business_id: businessId, tax_year: year, quarter: q,
        amount_paid: amount, paid_on: paid_on || null,
      });
    }
    void reload();
    toast({ title: `Q${q} saved` });
  };

  const downloadDoc = async (doc: TaxDoc) => {
    const { data, error } = await supabase.storage
      .from("finance-tax-docs")
      .createSignedUrl(doc.file_url, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Could not open document", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Tax year</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportYearCsv}>
            <Download className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Upload doc</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload tax document</DialogTitle></DialogHeader>
              {workspaceId && (
                <UploadDocForm
                  businessId={businessId}
                  workspaceId={workspaceId}
                  defaultYear={year}
                  onSaved={() => { setUploadOpen(false); void reload(); toast({ title: "Document uploaded" }); }}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="YTD revenue" value={fmtUSD(ytdRevenue)} />
        <Tile label="Deductible expenses" value={fmtUSD(ytdDeductible)} />
        <Tile label="Estimated tax (25%)" value={fmtUSD(estimatedTax)} accent />
        <Tile label="Quarterly paid" value={fmtUSD(totalQuarterlyPaid)} />
      </div>

      <p className="text-[11px] text-muted-foreground italic">
        Estimate only — combines federal + self-employment at ~25% of (revenue − deductible expenses).
        Confirm with your accountant before filing.
      </p>

      {/* Quarterly */}
      <Card className="p-3 bg-card/60 border-border">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
          Quarterly estimated payments — {year}
        </p>
        <div className="space-y-2">
          {QUARTERS.map((q) => {
            const existing = getQuarter(q.q);
            return (
              <QuarterRow
                key={q.q}
                label={q.label}
                due={q.due}
                amount={existing?.amount_paid ?? 0}
                paid_on={existing?.paid_on ?? ""}
                onSave={(amt, date) => saveQuarter(q.q, amt, date)}
              />
            );
          })}
        </div>
      </Card>

      {/* Documents */}
      <Card className="p-3 bg-card/60 border-border">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
          Tax documents — {year}
        </p>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">No documents uploaded.</p>
        ) : (
          <div className="space-y-1.5">
            {docs.map((d) => (
              <button
                key={d.id}
                onClick={() => downloadDoc(d)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary/40 text-left"
              >
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {d.document_type}{d.person_name ? ` — ${d.person_name}` : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {d.file_name ?? d.file_url}
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`p-3 bg-card/60 border-border ${accent ? "ring-1 ring-primary/30" : ""}`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold text-foreground mt-0.5">{value}</p>
    </Card>
  );
}

function QuarterRow({
  label, due, amount, paid_on, onSave,
}: {
  label: string;
  due: string;
  amount: number;
  paid_on: string;
  onSave: (amount: number, date: string) => void;
}) {
  const [amt, setAmt] = useState(amount.toString());
  const [date, setDate] = useState(paid_on);
  useEffect(() => { setAmt(amount.toString()); setDate(paid_on); }, [amount, paid_on]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex-1 min-w-[140px]">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">Due {due}</p>
      </div>
      <Input
        type="number" inputMode="decimal" placeholder="$0.00"
        value={amt} onChange={(e) => setAmt(e.target.value)}
        className="h-8 w-28"
      />
      <Input
        type="date" value={date} onChange={(e) => setDate(e.target.value)}
        className="h-8 w-36"
      />
      <Button size="sm" variant="outline" onClick={() => onSave(Number(amt) || 0, date)}>
        Save
      </Button>
    </div>
  );
}

function UploadDocForm({
  businessId, workspaceId, defaultYear, onSaved,
}: {
  businessId: string;
  workspaceId: string;
  defaultYear: number;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [tax_year, setTaxYear] = useState<number>(defaultYear);
  const [document_type, setDocType] = useState<string>("W-9");
  const [person_name, setPerson] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!file) { toast({ title: "Choose a file first", variant: "destructive" }); return; }
    setSaving(true);
    const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${workspaceId}/${tax_year}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from("finance-tax-docs")
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upErr) {
      setSaving(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("finance_tax_documents").insert({
      business_id: businessId,
      tax_year, document_type,
      person_name: person_name || null,
      file_url: path, file_name: file.name,
      notes: notes || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    onSaved();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tax year">
          <Input type="number" value={tax_year} onChange={(e) => setTaxYear(Number(e.target.value) || defaultYear)} />
        </Field>
        <Field label="Document type">
          <Select value={document_type} onValueChange={setDocType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TAX_DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Person / vendor name (optional)">
        <Input value={person_name} onChange={(e) => setPerson(e.target.value)} />
      </Field>
      <Field label="File">
        <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background cursor-pointer">
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground flex-1 truncate">
            {file ? file.name : "Choose PDF or image"}
          </span>
          <input
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </Field>
      <Field label="Notes (optional)">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button onClick={submit} disabled={saving} className="w-full">
        {saving ? "Uploading…" : "Upload document"}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}