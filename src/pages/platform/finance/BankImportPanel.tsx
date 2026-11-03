import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { CsvFormatError, guessColumns, mapBankRows, parseCsv, sha256Hex, suggestMatches, type ColumnMap, type ParsedBankRow, type RowError } from "@/lib/bankCsv";
import { fmtCents, type CashSummary, type Matchable } from "@/lib/cashRecords";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { EXPENSE_CATEGORIES } from "@/lib/finance";

const CLASSES = [
  { v: "needs_review", label: "Needs review" },
  { v: "income", label: "Business income" },
  { v: "expense", label: "Business expense" },
  { v: "transfer", label: "Transfer (not income)" },
  { v: "personal", label: "Personal" },
  { v: "excluded", label: "Leave out" },
] as const;

interface TxnRow { id: string; txn_date: string; description: string; amount_cents: number; classification: string; category: string | null; matched_type: string | null; matched_id: string | null; possible_duplicate_of: string | null; owner_resolution: string | null; resolution_note: string | null }

const NONE = "__none__";

const PAGE = 300;

export default function BankImportPanel({ businessId, year, summary, onChanged }: { businessId: string; year: number; summary: CashSummary | null; onChanged: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [grid, setGrid] = useState<string[][] | null>(null);
  const [map, setMap] = useState<Partial<ColumnMap>>({});
  const [mode, setMode] = useState<"amount" | "split">("amount");
  const [importing, setImporting] = useState(false);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const txns = useQuery({
    queryKey: ["bank-txns", businessId, year],
    queryFn: async () => ({
      businessId, year,
      rows: await fetchAllPages<TxnRow>((f, t) => supabase.from("finance_bank_transactions")
        .select("id, txn_date, description, amount_cents, classification, category, matched_type, matched_id, possible_duplicate_of, owner_resolution, resolution_note")
        .eq("business_id", businessId).gte("txn_date", `${year}-01-01`).lt("txn_date", `${year + 1}-01-01`)
        .order("txn_date").order("id").range(f, t)),
    }),
  });
  const rows = txns.data && txns.data.businessId === businessId && txns.data.year === year ? txns.data.rows : null;

  const header = grid?.[0] ?? [];
  const parsed = useMemo<{ rows: ParsedBankRow[]; errors: RowError[] } | null>(() => {
    if (!grid || map.date === undefined || map.description === undefined) return null;
    if (mode === "amount" && map.amount === undefined) return null;
    if (mode === "split" && (map.debit === undefined || map.credit === undefined)) return null;
    const m: ColumnMap = mode === "amount"
      ? { date: map.date, description: map.description, amount: map.amount }
      : { date: map.date, description: map.description, debit: map.debit, credit: map.credit };
    return mapBankRows(grid, m);
  }, [grid, map, mode]);

  const existingFp = useQuery({
    queryKey: ["bank-fps", businessId, parsed?.rows.length ?? 0, file?.name],
    enabled: !!parsed && parsed.rows.length > 0,
    queryFn: async () => {
      const dates = parsed ? [...new Set(parsed.rows.map((r) => r.txnDate))].sort() : [];
      if (!dates.length) return new Set<string>();
      const all = await fetchAllPages<{ row_fingerprint: string }>((f, t) => supabase.from("finance_bank_transactions")
        .select("row_fingerprint").eq("business_id", businessId).gte("txn_date", dates[0]).lte("txn_date", dates[dates.length - 1]).order("id").range(f, t));
      return new Set(all.map((r) => r.row_fingerprint));
    },
  });

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 5_000_000) { toast({ title: "File is too big (5 MB max)", variant: "destructive" }); return; }
    const text = await f.text();
    let g: string[][];
    try { g = parseCsv(text); } catch (e) {
      toast({ title: "This file can't be read", description: e instanceof CsvFormatError ? e.message : "The file isn't a valid CSV.", variant: "destructive" }); return;
    }
    if (g.length < 2) { toast({ title: "No rows found in that file", variant: "destructive" }); return; }
    const guess = guessColumns(g[0]);
    setFile({ name: f.name, text }); setGrid(g); setMap(guess);
    setMode(guess.amount !== undefined ? "amount" : "split");
  };

  const doImport = async () => {
    if (!file || !parsed || parsed.rows.length === 0) return;
    if (parsed.errors.length) { toast({ title: "Fix or remove the rows with problems first", variant: "destructive" }); return; }
    setImporting(true);
    try {
      const sha = await sha256Hex(file.text);
      const { data, error } = await supabase.rpc("finance_import_bank_csv", {
        _business_id: businessId, _file_name: file.name, _file_sha256: sha,
        _rows: parsed.rows.map((r) => ({ row_index: r.rowIndex, row_fingerprint: r.fingerprint, txn_date: r.txnDate, description: r.description, amount_cents: String(r.amountCents), raw: r.raw })),
      });
      if (error) throw new Error(error.message);
      const res = data as { already_imported?: boolean; rows?: number } | null;
      toast({ title: res?.already_imported ? "This exact file was already imported — nothing added" : `Imported ${res?.rows ?? 0} rows to review` });
      setFile(null); setGrid(null); setMap({});
      void txns.refetch(); onChanged();
    } catch (e) {
      toast({ title: "Import failed", description: (e as Error).message, variant: "destructive" });
    } finally { setImporting(false); }
  };

  const update = async (id: string, patch: Partial<Pick<TxnRow, "classification" | "category" | "matched_type" | "matched_id" | "owner_resolution" | "resolution_note">>) => {
    const { data, error } = await supabase.from("finance_bank_transactions").update(patch).eq("id", id).eq("business_id", businessId).select("id");
    if (error || !data?.length) { toast({ title: "Didn't save", description: error?.message ?? "No change was saved.", variant: "destructive" }); return; }
    void txns.refetch(); onChanged();
  };

  const candidates: Matchable[] = summary?.matchables ?? [];
  // Rows the summary is holding out (look-alikes, duplicates, broken matches, wrong sign) also need review.
  const issueById = useMemo(() => new Map((summary?.issues ?? []).filter((i) => i.kind.startsWith("bank_")).map((i) => [i.id, i])), [summary]);
  const [separateFor, setSeparateFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const matchedIds = useMemo(() => new Set((rows ?? []).filter((r) => r.matched_id).map((r) => r.matched_id as string)), [rows]);

  const [limit, setLimit] = useState(PAGE);
  const shown = (rows ?? []).filter((r) => filter === "all" || r.classification === "needs_review" || issueById.has(r.id));
  const dupInFile = parsed ? parsed.rows.filter((r) => existingFp.data?.has(r.fingerprint)).length : 0;

  return (
    <Card className="p-3 bg-card/60 border-border space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Bank statements</p>
        <p className="text-[11px] text-muted-foreground">Bring in a CSV from your bank. Nothing counts until you sort each row. Match deposits to payments already recorded here so they aren't counted twice.</p>
      </div>

      {!grid ? (
        <label className="flex items-center gap-2 px-3 py-3 rounded-md border border-dashed border-input cursor-pointer hover:border-primary/50">
          <Upload className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Choose a bank CSV file</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
      ) : (
        <div className="space-y-3 rounded-md border border-border p-3">
          <p className="text-xs">File: <b>{file?.name}</b> · {grid.length - 1} rows</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <ColPick label="Date column" header={header} value={map.date} onChange={(v) => setMap({ ...map, date: v })} />
            <ColPick label="Description column" header={header} value={map.description} onChange={(v) => setMap({ ...map, description: v })} />
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Amounts are</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "amount" | "split")}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="amount">One column (+/−)</SelectItem><SelectItem value="split">Money out / money in</SelectItem></SelectContent></Select></div>
            {mode === "amount"
              ? <ColPick label="Amount column" header={header} value={map.amount} onChange={(v) => setMap({ ...map, amount: v })} />
              : <><ColPick label="Money out column" header={header} value={map.debit} onChange={(v) => setMap({ ...map, debit: v })} /><ColPick label="Money in column" header={header} value={map.credit} onChange={(v) => setMap({ ...map, credit: v })} /></>}
          </div>
          {parsed && (
            <>
              <p className="text-xs">{parsed.rows.length} rows OK · <span className={parsed.errors.length ? "text-destructive" : ""}>{parsed.errors.length} with problems</span>{dupInFile ? <span className="text-amber-500"> · {dupInFile} look already imported (will be flagged, not skipped)</span> : null}</p>
              {parsed.errors.length > 0 && <ul className="text-xs text-destructive max-h-24 overflow-y-auto">{parsed.errors.slice(0, 20).map((e) => <li key={e.rowIndex}>Row {e.rowIndex}: {e.message}</li>)}</ul>}
              <div className="max-h-56 overflow-auto"><table className="w-full text-xs min-w-[420px]"><thead><tr className="text-muted-foreground text-left"><th>Date</th><th>Description</th><th className="text-right">Amount</th></tr></thead>
                <tbody>{parsed.rows.slice(0, 50).map((r) => <tr key={r.rowIndex} className={`border-t border-border/40 ${existingFp.data?.has(r.fingerprint) ? "text-amber-500" : ""}`}><td className="py-1">{r.txnDate}</td><td className="break-words">{r.description}</td><td className="text-right tabular-nums">{fmtCents(r.amountCents)}</td></tr>)}</tbody></table></div>
            </>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={doImport} disabled={!parsed || !parsed.rows.length || parsed.errors.length > 0 || importing}>{importing ? "Importing…" : "Import for review"}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setFile(null); setGrid(null); setMap({}); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs">{rows ? `${rows.length} bank rows in ${year}` : "Loading bank rows…"}</p>
        <Select value={filter} onValueChange={(v) => setFilter(v as "open" | "all")}><SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="open">Needs review</SelectItem><SelectItem value="all">All rows</SelectItem></SelectContent></Select>
      </div>
      {txns.isError && <p className="text-xs text-destructive">Couldn't load bank rows.</p>}
      {rows && shown.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">{rows.length ? "Everything is sorted." : "No bank rows imported for this year."}</p>}
      <ul className="divide-y divide-border/50 max-h-[520px] overflow-y-auto">
        {shown.slice(0, limit).map((r) => {
          const sugg = suggestMatches({ txnDate: r.txn_date, amountCents: r.amount_cents }, candidates).filter((c) => !matchedIds.has(c.id) || c.id === r.matched_id);
          const matchedTo = r.matched_id ? candidates.find((c) => c.id === r.matched_id) : null;
          return (
            <li key={r.id} className="py-2 space-y-1.5">
              <div className="flex justify-between gap-2 text-xs">
                <span className="min-w-0 break-words">{r.txn_date} · {r.description}{r.possible_duplicate_of && !r.owner_resolution ? <span className="text-amber-500"> · possible duplicate</span> : null}{r.owner_resolution === "separate" ? <span className="text-primary"> · confirmed separate{r.resolution_note ? ` (“${r.resolution_note}”)` : ""}</span> : null}</span>
                <span className={`tabular-nums shrink-0 ${r.amount_cents > 0 ? "text-primary" : ""}`}>{fmtCents(r.amount_cents)}</span>
              </div>
              {issueById.get(r.id) && issueById.get(r.id)?.kind !== "bank_needs_review" && <p className="text-xs text-amber-500">{issueById.get(r.id)?.detail}</p>}
              {r.classification === "matched" ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  Matched to {matchedTo ? `${matchedTo.label} (${matchedTo.date})` : "a recorded item"} — not counted again.
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => void update(r.id, { classification: "needs_review", matched_id: null, matched_type: null })}>Undo</Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Select value={r.classification} onValueChange={(v) => void update(r.id, v === "income" || v === "expense" ? { classification: v } : { classification: v, owner_resolution: null, resolution_note: null })}>
                    <SelectTrigger aria-label="Sort this row" className="h-8 w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>{CLASSES.map((c) => <SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {r.classification === "expense" && (
                    <Select value={r.category ?? NONE} onValueChange={(v) => void update(r.id, { category: v === NONE ? null : v })}>
                      <SelectTrigger aria-label="Category" className="h-8 w-44"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent><SelectItem value={NONE}>No category</SelectItem>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {sugg.length > 0 && (
                    <Select value={NONE} onValueChange={(v) => { const c = sugg.find((x) => x.id === v); if (c) void update(r.id, { classification: "matched", matched_type: c.type, matched_id: c.id, owner_resolution: null, resolution_note: null }); }}>
                      <SelectTrigger aria-label="Match to a recorded item" className="h-8 w-56"><SelectValue placeholder="Match to recorded item" /></SelectTrigger>
                      <SelectContent><SelectItem value={NONE} disabled>Match to recorded item…</SelectItem>{sugg.map((c) => <SelectItem key={c.id} value={c.id}>{c.date} · {c.label} · {fmtCents(c.amountCents)}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {(r.classification === "income" || r.classification === "expense") && (r.owner_resolution === "separate"
                    ? <Button size="sm" variant="ghost" className="h-8" onClick={() => void update(r.id, { owner_resolution: null, resolution_note: null })}>Undo “separate”</Button>
                    : issueById.get(r.id)?.kind === "bank_maybe_recorded" || issueById.get(r.id)?.kind === "bank_possible_duplicate"
                      ? <Button size="sm" variant="outline" className="h-8" onClick={() => { setSeparateFor(r.id); setNote(""); }}>It's a separate transaction</Button>
                      : null)}
                  {separateFor === r.id && (
                    <div className="flex w-full flex-wrap items-center gap-2">
                      <Input aria-label="Why is this separate?" placeholder="Why is this separate? (e.g. second visit same day)" value={note} onChange={(e) => setNote(e.target.value)} className="h-8 flex-1 min-w-[200px] text-xs" maxLength={300} />
                      <Button size="sm" className="h-8" disabled={note.trim().length < 3} onClick={() => { void update(r.id, { owner_resolution: "separate", resolution_note: note.trim() }); setSeparateFor(null); }}>Confirm — count it once</Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => setSeparateFor(null)}>Cancel</Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ColPick({ label, header, value, onChange }: { label: string; header: string[]; value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value === undefined ? undefined : String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="h-9"><SelectValue placeholder="Choose…" /></SelectTrigger>
        <SelectContent>{header.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Column ${i + 1}`}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

