import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle, CheckCircle2, Download, RefreshCw, ShieldAlert, Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/contexts/BusinessContext";

type Severity = "critical" | "high" | "medium" | "low";

interface RepairAction {
  type: string;
  label: string;
  payload: Record<string, unknown>;
}

interface Finding {
  finding_key: string;
  category: string;
  severity: Severity;
  business_id: string | null;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  message: string;
  detected_at: string;
  context: Record<string, unknown>;
  actions: RepairAction[];
}

interface AuditResult {
  generated_at: string;
  total: number;
  dismissed_count: number;
  findings: Finding[];
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_BADGE: Record<Severity, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/40",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  low: "bg-muted text-muted-foreground border-border",
};

const CATEGORY_LABELS: Record<string, string> = {
  quote_approved_no_timestamp: "Quote: missing approved_at",
  quote_approved_no_timeline: "Quote: missing timeline",
  quote_approved_sms_failed: "Quote: approval SMS failed",
  quote_converted_no_job: "Quote: converted, no job",
  job_from_quote_missing_ref: "Job: missing quote ref",
  job_completed_no_timestamp: "Job: missing completed_at",
  job_completed_no_invoice: "Job: completed, no invoice",
  invoice_paid_no_payment: "Invoice: paid, no payment row",
  payment_no_invoice: "Payment: no invoice link",
  stripe_webhook_no_payment: "Stripe webhook: no payment row",
  invoice_overdue_no_reminder: "Invoice: overdue, no reminder",
  duplicate_customer: "Customer: duplicates",
  job_missing_customer: "Job: missing customer",
  job_missing_address: "Job: missing address",
  job_missing_business: "Job: missing business",
  sms_failed: "SMS failure",
  email_failed: "Email failure",
};

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(rows: Finding[]) {
  const header = ["severity", "category", "business_id", "entity_type", "entity_id", "entity_label", "message", "detected_at"];
  const lines = [header.join(",")];
  for (const f of rows) {
    lines.push([f.severity, f.category, f.business_id ?? "", f.entity_type, f.entity_id, f.entity_label, f.message, f.detected_at].map(csvEscape).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PlatformReconciliation() {
  const { selectedBusinessId } = useBusinessContext();
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [category, setCategory] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [includeDismissed, setIncludeDismissed] = useState(false);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["recon-audit", selectedBusinessId, from, to, includeDismissed],
    queryFn: async (): Promise<AuditResult> => {
      const { data, error } = await supabase.functions.invoke("reconciliation-audit", {
        body: {
          business_id: selectedBusinessId,
          from: from ? new Date(from).toISOString() : null,
          to: to ? new Date(to + "T23:59:59").toISOString() : null,
          include_dismissed: includeDismissed,
        },
      });
      if (error) throw error;
      return data as AuditResult;
    },
  });

  const filtered = useMemo(() => {
    const list = data?.findings ?? [];
    return list
      .filter((f) => category === "all" || f.category === category)
      .filter((f) => severity === "all" || f.severity === severity)
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [data, category, severity]);

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of data?.findings ?? []) c[f.severity]++;
    return c;
  }, [data]);

  const runAction = async (f: Finding, action: RepairAction, note?: string) => {
    try {
      const { data: result, error } = await supabase.functions.invoke("reconciliation-repair", {
        body: {
          action: action.type,
          finding_key: f.finding_key,
          category: f.category,
          severity: f.severity,
          business_id: f.business_id,
          entity_type: f.entity_type,
          entity_id: f.entity_id,
          payload: action.payload,
          note: note ?? "",
        },
      });
      if (error) throw error;
      const r = result as Record<string, unknown>;
      if (r?.relinked === false) {
        toast.warning(`Could not auto-link: ${(r.reason as string) || "unknown"}`);
      } else {
        toast.success(`${action.label} done`);
      }
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const f of data?.findings ?? []) set.add(f.category);
    return Array.from(set).sort();
  }, [data]);

  return (
    <PlatformLayout>
      <div className="px-4 py-4 space-y-4 max-w-6xl mx-auto">
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-amber-400" />
              Data Reconciliation
            </h1>
            <p className="text-sm text-muted-foreground">
              Owner-only audit of broken or inconsistent records across quotes, jobs,
              invoices, payments, SMS and email. Repair actions are explicit — nothing is auto-fixed.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              Re-run
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadCsv(filtered)} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
            <Card key={s} className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{s}</div>
              <div className="text-2xl font-bold">{counts[s]}</div>
            </Card>
          ))}
        </div>

        <Card className="p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Switch id="dismissed" checked={includeDismissed} onCheckedChange={setIncludeDismissed} />
              <Label htmlFor="dismissed" className="text-xs cursor-pointer">Show resolved</Label>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Scope: {selectedBusinessId ? "selected business" : "all businesses"} · Total findings: {data?.total ?? 0} · Resolved: {data?.dismissed_count ?? 0}
          </div>
        </Card>

        {isFetching && !data ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Running audit…</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
            <div className="font-medium">No issues found in current scope</div>
            <div className="text-xs text-muted-foreground mt-1">Adjust filters or rerun.</div>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((f) => (
              <Card key={f.finding_key} className="p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={SEVERITY_BADGE[f.severity]}>
                        {f.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[f.category] ?? f.category}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs font-mono text-muted-foreground">{f.entity_type}</span>
                    </div>
                    <div className="font-medium mt-1 break-words">{f.message}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {f.entity_label}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {f.actions.map((a) => (
                      <Button
                        key={a.type}
                        size="sm"
                        variant={a.type === "mark_resolved" ? "outline" : "default"}
                        onClick={() => runAction(f, a)}
                      >
                        {a.type === "mark_resolved" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <Wrench className="h-3.5 w-3.5 mr-1" />
                        )}
                        {a.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className="p-3 text-xs text-muted-foreground flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          Repair actions are logged to <code>audit_logs</code> and <code>timeline_events</code>.
          Auto-link actions only act when exactly one safe candidate is found.
        </Card>
      </div>
    </PlatformLayout>
  );
}