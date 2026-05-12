import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { toast } from "sonner";

type HealthStatus = "ok" | "warn" | "fail" | "unknown";

interface HealthRow {
  check_name: string;
  status: HealthStatus;
  last_ok_at: string | null;
  last_failure_at: string | null;
  message: string | null;
  updated_at: string;
}

const STATUS_COLORS: Record<HealthStatus, string> = {
  ok: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warn: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  fail: "bg-red-500/15 text-red-400 border-red-500/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.round(d)}s ago`;
  if (d < 3600) return `${Math.round(d / 60)}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}

export default function PlatformBackendHealth() {
  const [tab, setTab] = useState("health");
  return (
    <PlatformLayout>
      <div className="px-4 py-4 space-y-4 max-w-5xl mx-auto">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Backend Health</h1>
          <p className="text-sm text-muted-foreground">Read-only owner view of platform subsystems.</p>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-card border border-border w-full grid grid-cols-3 sm:grid-cols-8">
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="sms">SMS Queue</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="ops">Ops</TabsTrigger>
            <TabsTrigger value="automations">Automations</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>
          <TabsContent value="health"><HealthTab /></TabsContent>
          <TabsContent value="sms"><SmsQueueTab /></TabsContent>
          <TabsContent value="email"><EmailTab /></TabsContent>
          <TabsContent value="ops"><OpsTab /></TabsContent>
          <TabsContent value="automations"><AutomationsTab /></TabsContent>
          <TabsContent value="audit"><AuditTab /></TabsContent>
          <TabsContent value="timeline"><TimelineTab /></TabsContent>
          <TabsContent value="errors"><ErrorsTab /></TabsContent>
        </Tabs>
      </div>
    </PlatformLayout>
  );
}

function HealthTab() {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["backend-health"],
    queryFn: async (): Promise<HealthRow[]> => {
      const { data, error } = await supabase
        .from("system_health_checks")
        .select("check_name, status, last_ok_at, last_failure_at, message, updated_at")
        .order("check_name");
      if (error) throw error;
      return (data || []) as HealthRow[];
    },
    refetchInterval: 60_000,
  });

  const runProbe = async () => {
    try {
      const res = await supabase.functions.invoke("system-health-probe", { body: {} });
      if (res.error) throw res.error;
      toast.success("Probe complete");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Probe failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Auto-refreshes every 5 minutes via cron.</p>
        <Button size="sm" variant="outline" onClick={runProbe} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Run probe
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(data || []).map((row) => (
          <Card key={row.check_name} className="p-4 bg-card border-border">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {row.status === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {(row.status === "warn" || row.status === "fail") && (
                    <AlertTriangle className={`h-4 w-4 ${row.status === "fail" ? "text-red-400" : "text-amber-400"}`} />
                  )}
                  {row.status === "unknown" && <Clock className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-medium">{row.check_name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{row.message || "No message"}</p>
              </div>
              <Badge variant="outline" className={STATUS_COLORS[row.status]}>{row.status}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>ok: {timeAgo(row.last_ok_at)}</span>
              <span>fail: {timeAgo(row.last_failure_at)}</span>
            </div>
          </Card>
        ))}
        {(!data || data.length === 0) && (
          <p className="text-sm text-muted-foreground">No health checks yet. Click "Run probe".</p>
        )}
      </div>
    </div>
  );
}

interface SmsQueueRow {
  id: string;
  phone: string;
  reason: string;
  status: string;
  attempts: number;
  last_error: string | null;
  scheduled_for: string;
  sent_at: string | null;
  created_at: string;
  message_body: string;
}

function SmsQueueTab() {
  const { selectedBusinessId } = useBusinessContext();
  const [filter, setFilter] = useState<"all" | "pending" | "failed" | "sent" | "skipped_opt_out">("all");
  const [reason, setReason] = useState<string>("");
  const { data, refetch } = useQuery({
    queryKey: ["sms-queue-tab", selectedBusinessId, filter, reason],
    queryFn: async (): Promise<SmsQueueRow[]> => {
      let q = supabase
        .from("sms_queue")
        .select("id, phone, reason, status, attempts, last_error, scheduled_for, sent_at, created_at, message_body")
        .order("created_at", { ascending: false }).limit(100);
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      if (filter !== "all") q = q.eq("status", filter);
      if (reason) q = q.eq("reason", reason);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SmsQueueRow[];
    },
    refetchInterval: 30_000,
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "pending", "failed", "sent", "skipped_opt_out"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f}</Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => refetch()} className="ml-auto">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">reason:</span>
        {(["", "quote_approval", "on_my_way", "review_request", "lead_notify", "appointment_reminder"] as const).map((r) => (
          <Button key={r || "any"} size="sm" variant={reason === r ? "default" : "outline"} onClick={() => setReason(r)}>{r || "any"}</Button>
        ))}
      </div>
      <div className="space-y-2">
        {(data || []).map((r) => (
          <Card key={r.id} className="p-3 bg-card border-border text-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-xs text-muted-foreground">{r.phone}</div>
              <Badge variant="outline" className={
                r.status === "sent" ? STATUS_COLORS.ok :
                r.status === "failed" ? STATUS_COLORS.fail :
                r.status === "pending" || r.status === "sending" ? STATUS_COLORS.warn :
                STATUS_COLORS.unknown
              }>{r.status}</Badge>
            </div>
            <p className="mt-1 line-clamp-2">{r.message_body}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              <span>{r.reason}</span>
              <span>attempts {r.attempts}</span>
              <span>created {timeAgo(r.created_at)}</span>
              {r.sent_at && <span>sent {timeAgo(r.sent_at)}</span>}
            </div>
            {r.last_error && <p className="mt-1 text-xs text-red-400">{r.last_error}</p>}
          </Card>
        ))}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">No queued SMS in this view.</p>}
      </div>
    </div>
  );
}

interface AutomationRunRow {
  id: string;
  event_name: string;
  status: string;
  error: string | null;
  created_at: string;
}

function AutomationsTab() {
  const { selectedBusinessId } = useBusinessContext();
  const { data: runs } = useQuery({
    queryKey: ["automation-runs", selectedBusinessId],
    queryFn: async (): Promise<AutomationRunRow[]> => {
      let q = supabase.from("automation_runs")
        .select("id, event_name, status, error, created_at")
        .order("created_at", { ascending: false }).limit(100);
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AutomationRunRow[];
    },
    refetchInterval: 60_000,
  });
  const { data: rules } = useQuery({
    queryKey: ["automation-rules", selectedBusinessId],
    queryFn: async () => {
      let q = supabase.from("automation_rules")
        .select("id, name, event_name, action_type, enabled, last_triggered_at, trigger_count")
        .order("event_name");
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-sm font-semibold mb-2">Rules</h3>
        <div className="space-y-2">
          {(rules || []).map((r) => (
            <Card key={r.id} className="p-3 bg-card border-border text-sm flex items-center justify-between">
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.event_name} → {r.action_type}</div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>{r.enabled ? "enabled" : "disabled"}</div>
                <div>fired {r.trigger_count}× · {timeAgo(r.last_triggered_at)}</div>
              </div>
            </Card>
          ))}
          {rules && rules.length === 0 && <p className="text-sm text-muted-foreground">No automation rules configured.</p>}
        </div>
      </section>
      <section>
        <h3 className="text-sm font-semibold mb-2">Recent runs</h3>
        <div className="space-y-2">
          {(runs || []).map((r) => (
            <Card key={r.id} className="p-3 bg-card border-border text-sm flex items-center justify-between">
              <div>
                <div className="font-mono text-xs">{r.event_name}</div>
                {r.error && <div className="text-xs text-red-400 mt-1">{r.error}</div>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={
                  r.status === "success" ? STATUS_COLORS.ok :
                  r.status === "failed" ? STATUS_COLORS.fail :
                  STATUS_COLORS.warn
                }>{r.status}</Badge>
                <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
              </div>
            </Card>
          ))}
          {runs && runs.length === 0 && <p className="text-sm text-muted-foreground">No automation runs yet.</p>}
        </div>
      </section>
    </div>
  );
}

interface AuditRow {
  id: string;
  event_name: string;
  entity_type: string;
  entity_id: string | null;
  action_type: string;
  created_at: string;
}

function AuditTab() {
  const [eventFilter, setEventFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const { selectedBusinessId } = useBusinessContext();
  const { data, refetch } = useQuery({
    queryKey: ["audit-logs", selectedBusinessId, eventFilter, entityFilter],
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase.rpc("get_audit_logs_filtered", {
        _business_id: selectedBusinessId ?? null,
        _user_id: null,
        _event_name: eventFilter || null,
        _entity_type: entityFilter || null,
        _entity_id: null,
        _from: null,
        _to: null,
        _limit: 100,
        _offset: 0,
      });
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input placeholder="event_name (e.g. visit.complete_visit)" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="max-w-xs" />
        <Input placeholder="entity_type (e.g. jobber_job)" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="max-w-xs" />
        <Button size="sm" onClick={() => refetch()}>Apply</Button>
      </div>
      <div className="space-y-1">
        {(data || []).map((r) => (
          <Card key={r.id} className="p-2 bg-card border-border text-xs flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-mono">{r.event_name}</div>
              <div className="text-muted-foreground truncate">{r.entity_type} · {r.entity_id || "—"} · {r.action_type}</div>
            </div>
            <span className="text-muted-foreground whitespace-nowrap">{timeAgo(r.created_at)}</span>
          </Card>
        ))}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">No audit logs match.</p>}
      </div>
    </div>
  );
}

function TimelineTab() {
  const { selectedBusinessId } = useBusinessContext();
  const { data } = useQuery({
    queryKey: ["timeline-events", selectedBusinessId],
    queryFn: async () => {
      let q = supabase.from("timeline_events")
        .select("id, event_type, event_summary, created_at")
        .order("created_at", { ascending: false }).limit(100);
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });
  return (
    <div className="space-y-1">
      {(data || []).map((r) => (
        <Card key={r.id} className="p-2 bg-card border-border text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-muted-foreground">{r.event_type}</span>
            <span className="text-muted-foreground">{timeAgo(r.created_at)}</span>
          </div>
          <div>{r.event_summary}</div>
        </Card>
      ))}
      {data && data.length === 0 && <p className="text-sm text-muted-foreground">No timeline events yet.</p>}
    </div>
  );
}

function ErrorsTab() {
  const { data } = useQuery({
    queryKey: ["error-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("error_logs")
        .select("id, error_message, page_url, created_at")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });
  return (
    <div className="space-y-1">
      {(data || []).map((r) => (
        <Card key={r.id} className="p-2 bg-card border-border text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-muted-foreground truncate">{r.page_url || "—"}</span>
            <span className="text-muted-foreground whitespace-nowrap">{timeAgo(r.created_at)}</span>
          </div>
          <div className="text-red-400 mt-1 line-clamp-3">{r.error_message}</div>
        </Card>
      ))}
      {data && data.length === 0 && <p className="text-sm text-muted-foreground">No errors logged.</p>}
    </div>
  );
}

interface EmailLogRow {
  id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

function EmailTab() {
  const [status, setStatus] = useState<string>("");
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["email-send-log", status],
    queryFn: async (): Promise<EmailLogRow[]> => {
      const { data, error } = await supabase.rpc("get_email_send_log_filtered", {
        _status: status || null,
        _template: null,
        _from: null,
        _to: null,
        _limit: 100,
        _offset: 0,
      });
      if (error) throw error;
      return (data || []) as EmailLogRow[];
    },
    refetchInterval: 60_000,
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["", "sent", "failed", "bounced", "complained", "suppressed", "dlq"] as const).map((s) => (
          <Button key={s || "all"} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s || "all"}</Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => refetch()} className="ml-auto" disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="space-y-2">
        {(data || []).map((r) => (
          <Card key={r.id} className="p-3 bg-card border-border text-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-xs text-muted-foreground truncate">{r.recipient_email}</div>
              <Badge variant="outline" className={
                r.status === "sent" ? STATUS_COLORS.ok :
                r.status === "failed" || r.status === "bounced" || r.status === "dlq" ? STATUS_COLORS.fail :
                STATUS_COLORS.warn
              }>{r.status}</Badge>
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
              <span>{r.template_name}</span>
              <span>{timeAgo(r.created_at)}</span>
            </div>
            {r.error_message && <p className="mt-1 text-xs text-red-400">{r.error_message}</p>}
          </Card>
        ))}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">No email log entries.</p>}
      </div>
    </div>
  );
}

function OpsTab() {
  const { selectedBusinessId } = useBusinessContext();
  const { data: reviews } = useQuery({
    queryKey: ["review-requests", selectedBusinessId],
    queryFn: async () => {
      let q = supabase.from("review_requests")
        .select("id, customer_name, customer_phone, scheduled_for, sent_at, status, created_at")
        .order("scheduled_for", { ascending: false }).limit(50);
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });
  const { data: contracts } = useQuery({
    queryKey: ["recurring-contracts", selectedBusinessId],
    queryFn: async () => {
      let q = supabase.from("recurring_contracts")
        .select("id, service_type, frequency, status, next_scheduled_date, auto_renew, end_date")
        .order("next_scheduled_date", { ascending: true, nullsFirst: false }).limit(50);
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 120_000,
  });
  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-sm font-semibold mb-2">Review request queue</h3>
        <div className="space-y-1">
          {(reviews || []).map((r) => (
            <Card key={r.id} className="p-2 bg-card border-border text-xs flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-mono">{r.customer_name || r.customer_phone}</div>
                <div className="text-muted-foreground truncate">due {timeAgo(r.scheduled_for)} · sent {r.sent_at ? timeAgo(r.sent_at) : "—"}</div>
              </div>
              <Badge variant="outline" className={
                r.status === "sent" ? STATUS_COLORS.ok :
                r.status === "failed" ? STATUS_COLORS.fail :
                STATUS_COLORS.warn
              }>{r.status}</Badge>
            </Card>
          ))}
          {reviews && reviews.length === 0 && <p className="text-sm text-muted-foreground">No review requests.</p>}
        </div>
      </section>
      <section>
        <h3 className="text-sm font-semibold mb-2">Recurring contracts</h3>
        <div className="space-y-1">
          {(contracts || []).map((c) => (
            <Card key={c.id} className="p-2 bg-card border-border text-xs flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-mono">{c.service_type} · {c.frequency}</div>
                <div className="text-muted-foreground">next {c.next_scheduled_date || "—"} · ends {c.end_date || "open"} · auto-renew {c.auto_renew ? "on" : "off"}</div>
              </div>
              <Badge variant="outline" className={
                c.status === "active" ? STATUS_COLORS.ok :
                c.status === "paused" ? STATUS_COLORS.warn :
                STATUS_COLORS.unknown
              }>{c.status}</Badge>
            </Card>
          ))}
          {contracts && contracts.length === 0 && <p className="text-sm text-muted-foreground">No recurring contracts.</p>}
        </div>
      </section>
    </div>
  );
}