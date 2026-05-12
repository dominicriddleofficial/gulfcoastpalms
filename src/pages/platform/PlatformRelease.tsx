import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Circle, AlertTriangle, RefreshCw, Rocket, ExternalLink, History } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type ItemStatus = "pending" | "pass" | "fail" | "warn" | "skip";

interface Item {
  id: string;
  checklist_id: string;
  section: string;
  item_key: string;
  label: string;
  status: ItemStatus;
  is_critical: boolean;
  auto_check_result: { detail?: string } | null;
  link_url: string | null;
  notes: string | null;
  checked_at: string | null;
}

interface Checklist {
  id: string;
  label: string;
  status: string;
  released_at: string | null;
  created_at: string;
  notes: string | null;
}

const TEMPLATE: Array<{ section: string; key: string; label: string; critical: boolean; link?: string }> = [
  // Backend
  { section: "Backend", key: "migrations_applied", label: "Migrations applied", critical: true },
  { section: "Backend", key: "rls_policies_verified", label: "RLS policies verified", critical: true },
  { section: "Backend", key: "edge_functions_deployed", label: "Edge Functions deployed", critical: true },
  { section: "Backend", key: "secrets_present", label: "Secrets present", critical: true },
  { section: "Backend", key: "stripe_webhook_verified", label: "Stripe webhook verified", critical: true, link: "/platform/backend-health" },
  { section: "Backend", key: "simpletexting_verified", label: "SimpleTexting verified", critical: true, link: "/platform/backend-health" },
  { section: "Backend", key: "jobber_sync_verified", label: "Jobber sync verified", critical: false, link: "/platform/backend-health" },
  { section: "Backend", key: "resend_verified", label: "Resend verified", critical: true, link: "/platform/backend-health" },
  { section: "Backend", key: "cron_jobs_verified", label: "Cron jobs verified", critical: true, link: "/platform/backend-health" },
  { section: "Backend", key: "backup_verification_passed", label: "Backup verification passed", critical: true },
  // Frontend
  { section: "Frontend", key: "mobile_homepage", label: "Mobile homepage checked", critical: true, link: "/" },
  { section: "Frontend", key: "mobile_quote_flow", label: "Mobile quote flow checked", critical: true, link: "/quote" },
  { section: "Frontend", key: "mobile_schedule", label: "Mobile schedule checked", critical: true, link: "/platform/schedule" },
  { section: "Frontend", key: "public_quote_page", label: "Public quote page checked", critical: true },
  { section: "Frontend", key: "public_invoice_page", label: "Public invoice page checked", critical: true },
  { section: "Frontend", key: "platform_dashboard", label: "Platform dashboard checked", critical: true, link: "/platform" },
  { section: "Frontend", key: "no_console_errors", label: "No console errors", critical: true },
  { section: "Frontend", key: "no_duplicate_routes", label: "No duplicate routes", critical: false },
  { section: "Frontend", key: "bundle_size_checked", label: "Bundle size checked", critical: false },
  { section: "Frontend", key: "lighthouse_checked", label: "Lighthouse checked", critical: false },
  // Business flows
  { section: "Business flows", key: "test_lead_created", label: "Test lead created", critical: true, link: "/platform/leads" },
  { section: "Business flows", key: "test_quote_sent", label: "Test quote sent", critical: true, link: "/platform/quotes" },
  { section: "Business flows", key: "test_quote_approved", label: "Test quote approved", critical: true },
  { section: "Business flows", key: "approval_sms_received", label: "Approval SMS received", critical: true },
  { section: "Business flows", key: "quote_converted_to_job", label: "Quote converted to job", critical: true },
  { section: "Business flows", key: "job_started_completed", label: "Job started/completed", critical: true },
  { section: "Business flows", key: "invoice_created", label: "Invoice created", critical: true },
  { section: "Business flows", key: "test_payment_completed", label: "Test payment completed", critical: true },
  { section: "Business flows", key: "review_request_queued", label: "Review request queued", critical: false },
  { section: "Business flows", key: "audit_timeline_events_created", label: "Audit/timeline events created", critical: true },
  // Security
  { section: "Security", key: "owner_role_checked", label: "Owner role checked", critical: true },
  { section: "Security", key: "manager_role_checked", label: "Manager role checked", critical: true },
  { section: "Security", key: "crew_role_checked", label: "Crew role checked", critical: true },
  { section: "Security", key: "public_token_checked", label: "Public token checked", critical: true },
  { section: "Security", key: "cross_business_blocked", label: "Cross-business access blocked", critical: true },
  { section: "Security", key: "rate_limits_checked", label: "Rate limits checked", critical: false },
];

const STATUS_BADGE: Record<ItemStatus, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  pass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  fail: "bg-red-500/15 text-red-300 border-red-500/40",
  warn: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  skip: "bg-muted text-muted-foreground border-border",
};

export default function PlatformRelease() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");

  const { data: checklists } = useQuery({
    queryKey: ["release_checklists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("release_checklists")
        .select("id,label,status,released_at,created_at,notes")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Checklist[];
    },
  });

  useEffect(() => {
    if (!activeId && checklists && checklists.length > 0) {
      const open = checklists.find((c) => c.status === "in_progress") ?? checklists[0];
      setActiveId(open.id);
    }
  }, [checklists, activeId]);

  const { data: items } = useQuery({
    queryKey: ["release_checklist_items", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("release_checklist_items")
        .select("*")
        .eq("checklist_id", activeId!);
      if (error) throw error;
      return data as Item[];
    },
  });

  const createChecklist = useMutation({
    mutationFn: async (label: string) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { data: cl, error } = await supabase
        .from("release_checklists")
        .insert({ label, status: "in_progress", created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      const rows = TEMPLATE.map((t) => ({
        checklist_id: cl.id,
        section: t.section,
        item_key: t.key,
        label: t.label,
        is_critical: t.critical,
        link_url: t.link ?? null,
        status: "pending" as ItemStatus,
      }));
      const { error: ie } = await supabase.from("release_checklist_items").insert(rows);
      if (ie) throw ie;
      return cl as Checklist;
    },
    onSuccess: (cl) => {
      qc.invalidateQueries({ queryKey: ["release_checklists"] });
      setActiveId(cl.id);
      setNewLabel("");
      toast.success("Checklist created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Item> }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase
        .from("release_checklist_items")
        .update({ ...patch, checked_by: user?.id, checked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["release_checklist_items", activeId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const runProbes = useMutation({
    mutationFn: async () => {
      if (!activeId || !items) return;
      const { data, error } = await supabase.functions.invoke("release-readiness-check");
      if (error) throw error;
      const probes: Array<{ item_key: string; status: ItemStatus | "unknown"; detail: string; link_url?: string }> =
        data.probes ?? [];
      const byKey = new Map(items.map((i) => [i.item_key, i]));
      for (const p of probes) {
        const it = byKey.get(p.item_key);
        if (!it) continue;
        await supabase
          .from("release_checklist_items")
          .update({
            status: p.status === "unknown" ? "pending" : p.status,
            auto_check_result: { detail: p.detail },
            link_url: p.link_url ?? it.link_url,
            checked_at: new Date().toISOString(),
          })
          .eq("id", it.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["release_checklist_items", activeId] });
      toast.success("Automated checks complete");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markReleased = useMutation({
    mutationFn: async () => {
      if (!activeId) return;
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase
        .from("release_checklists")
        .update({
          status: "released",
          released_at: new Date().toISOString(),
          released_by: user?.id,
          summary: summary,
        })
        .eq("id", activeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["release_checklists"] });
      toast.success("Release marked ready");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = useMemo(() => {
    const total = items?.length ?? 0;
    const pass = items?.filter((i) => i.status === "pass").length ?? 0;
    const fail = items?.filter((i) => i.status === "fail").length ?? 0;
    const warn = items?.filter((i) => i.status === "warn").length ?? 0;
    const pending = items?.filter((i) => i.status === "pending").length ?? 0;
    const criticalBlocking =
      items?.filter((i) => i.is_critical && i.status !== "pass" && i.status !== "skip").length ?? 0;
    return { total, pass, fail, warn, pending, criticalBlocking };
  }, [items]);

  const sections = useMemo(() => {
    const groups: Record<string, Item[]> = {};
    (items ?? []).forEach((i) => {
      if (!groups[i.section]) groups[i.section] = [];
      groups[i.section].push(i);
    });
    Object.values(groups).forEach((list) =>
      list.sort((a, b) => TEMPLATE.findIndex((t) => t.key === a.item_key) - TEMPLATE.findIndex((t) => t.key === b.item_key)),
    );
    return groups;
  }, [items]);

  const active = checklists?.find((c) => c.id === activeId);
  const canRelease = summary.criticalBlocking === 0 && summary.total > 0 && active?.status === "in_progress";

  return (
    <PlatformLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Rocket className="w-6 h-6" /> Release Readiness
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pre-flight checklist. Critical items must pass before marking the release ready.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Release label e.g. v1.4.0"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-56"
            />
            <Button
              onClick={() => newLabel.trim() && createChecklist.mutate(newLabel.trim())}
              disabled={createChecklist.isPending}
            >
              New Checklist
            </Button>
          </div>
        </div>

        {checklists && checklists.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <History className="w-4 h-4" /> Recent releases
            </div>
            <div className="flex gap-2 flex-wrap">
              {checklists.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-md border ${
                    c.id === activeId ? "bg-primary/20 border-primary/50" : "bg-muted/30 border-border"
                  }`}
                >
                  {c.label}
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {c.status}
                  </Badge>
                </button>
              ))}
            </div>
          </Card>
        )}

        {active && (
          <>
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-4 justify-between">
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-300">{summary.pass} pass</span>
                  <span className="text-amber-300">{summary.warn} warn</span>
                  <span className="text-red-300">{summary.fail} fail</span>
                  <span className="text-muted-foreground">{summary.pending} pending</span>
                  <span className="text-muted-foreground">/ {summary.total} total</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runProbes.mutate()}
                    disabled={runProbes.isPending}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${runProbes.isPending ? "animate-spin" : ""}`} />
                    Run Auto Checks
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => markReleased.mutate()}
                    disabled={!canRelease || markReleased.isPending}
                  >
                    <Rocket className="w-4 h-4 mr-1" />
                    Mark Release Ready
                  </Button>
                </div>
              </div>
              {summary.criticalBlocking > 0 && (
                <div className="mt-3 text-sm flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  {summary.criticalBlocking} critical {summary.criticalBlocking === 1 ? "item" : "items"} blocking release
                </div>
              )}
              {active.status === "released" && (
                <div className="mt-3 text-sm flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" /> Released {active.released_at ? new Date(active.released_at).toLocaleString() : ""}
                </div>
              )}
            </Card>

            {Object.entries(sections).map(([section, list]) => (
              <Card key={section} className="p-4">
                <h2 className="text-lg font-semibold mb-3">{section}</h2>
                <div className="space-y-2">
                  {list.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/20"
                    >
                      <Checkbox
                        checked={it.status === "pass"}
                        onCheckedChange={(v) =>
                          updateItem.mutate({ id: it.id, patch: { status: v ? "pass" : "pending" } })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{it.label}</span>
                          {it.is_critical && (
                            <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-300">
                              critical
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[it.status]}`}>
                            {it.status}
                          </Badge>
                          {it.link_url && (
                            <Link
                              to={it.link_url}
                              className="text-xs text-primary inline-flex items-center gap-1"
                            >
                              open <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                        {it.auto_check_result?.detail && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {it.auto_check_result.detail}
                          </div>
                        )}
                        <Textarea
                          placeholder="Notes…"
                          defaultValue={it.notes ?? ""}
                          onBlur={(e) => {
                            if (e.target.value !== (it.notes ?? "")) {
                              updateItem.mutate({ id: it.id, patch: { notes: e.target.value } });
                            }
                          }}
                          className="mt-2 min-h-[40px] text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => updateItem.mutate({ id: it.id, patch: { status: "fail" } })}
                        >
                          Fail
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => updateItem.mutate({ id: it.id, patch: { status: "skip" } })}
                        >
                          Skip
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </>
        )}

        {!checklists?.length && (
          <Card className="p-8 text-center text-muted-foreground">
            <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No release checklists yet. Create your first one above.
          </Card>
        )}
      </div>
    </PlatformLayout>
  );
}