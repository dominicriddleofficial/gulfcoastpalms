import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MinusCircle, Loader2, Play, ExternalLink, History } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type StepStatus = "pass" | "fail" | "skip" | "pending";

interface QARun {
  id: string;
  business_id: string | null;
  label: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  summary: { total?: number; pass?: number; fail?: number; skip?: number };
}

interface QAStep {
  id: string;
  run_id: string;
  step_number: number;
  name: string;
  status: StepStatus;
  detail: string | null;
  link_url: string | null;
  finished_at: string | null;
}

const BUSINESSES = [
  { id: "b0000000-0000-0000-0000-000000000001", shortcode: "GCP", name: "Gulf Coast Palms" },
  { id: "b0000000-0000-0000-0000-000000000002", shortcode: "PPS", name: "Prestige Property Services" },
];

function StatusIcon({ status }: { status: StepStatus | string }) {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === "fail") return <XCircle className="w-4 h-4 text-red-400" />;
  if (status === "skip") return <MinusCircle className="w-4 h-4 text-amber-400" />;
  return <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />;
}

function statusBadge(status: string) {
  if (status === "pass") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
  if (status === "fail") return "bg-red-500/15 text-red-300 border-red-500/40";
  if (status === "skip") return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  return "bg-muted text-muted-foreground border-border";
}

export default function PlatformQAChecklist() {
  const qc = useQueryClient();
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  const { data: runs } = useQuery({
    queryKey: ["qa_runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qa_runs")
        .select("id,business_id,label,status,started_at,finished_at,summary")
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as QARun[];
    },
  });

  useEffect(() => {
    if (!activeRunId && runs && runs.length > 0) setActiveRunId(runs[0].id);
  }, [runs, activeRunId]);

  const { data: steps } = useQuery({
    queryKey: ["qa_steps", activeRunId],
    enabled: !!activeRunId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qa_steps")
        .select("*")
        .eq("run_id", activeRunId)
        .order("step_number", { ascending: true });
      if (error) throw error;
      return data as QAStep[];
    },
    refetchInterval: running ? 2000 : false,
  });

  const startRun = useMutation({
    mutationFn: async (business_id: string) => {
      setRunning(business_id);
      const { data, error } = await supabase.functions.invoke("qa-run", {
        body: { business_id },
      });
      if (error) throw error;
      return data as { run_id: string };
    },
    onSuccess: (data) => {
      setActiveRunId(data.run_id);
      qc.invalidateQueries({ queryKey: ["qa_runs"] });
      qc.invalidateQueries({ queryKey: ["qa_steps", data.run_id] });
      toast.success("QA run complete");
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setRunning(null),
  });

  const active = useMemo(() => runs?.find((r) => r.id === activeRunId), [runs, activeRunId]);
  const activeBiz = BUSINESSES.find((b) => b.id === active?.business_id);

  return (
    <PlatformLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold">End-to-End QA Checklist</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Seeded test loop per business. Records are clearly marked TEST and use a synthetic customer (no real customer SMS).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BUSINESSES.map((b) => (
            <Card key={b.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{b.name}</div>
                <div className="text-xs text-muted-foreground">{b.shortcode}</div>
              </div>
              <Button
                onClick={() => startRun.mutate(b.id)}
                disabled={running !== null}
                size="sm"
              >
                {running === b.id ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Running…</>
                ) : (
                  <><Play className="w-4 h-4 mr-1" /> Run {b.shortcode} Loop</>
                )}
              </Button>
            </Card>
          ))}
        </div>

        {runs && runs.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <History className="w-4 h-4" /> Run history
            </div>
            <div className="flex gap-2 flex-wrap">
              {runs.map((r) => {
                const biz = BUSINESSES.find((b) => b.id === r.business_id);
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveRunId(r.id)}
                    className={`text-xs px-3 py-1.5 rounded-md border text-left ${
                      r.id === activeRunId ? "bg-primary/20 border-primary/50" : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{biz?.shortcode ?? "?"}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusBadge(r.status === "completed" ? "pass" : r.status === "failed" ? "fail" : "pending")}`}>
                        {r.status}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(r.started_at).toLocaleString()}
                      {r.summary?.pass !== undefined && (
                        <> · {r.summary.pass}✓ {r.summary.fail ?? 0}✗ {r.summary.skip ?? 0}⊘</>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {active && (
          <Card className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div>
                <div className="text-sm font-medium">{active.label}</div>
                <div className="text-xs text-muted-foreground">
                  {activeBiz?.name} · started {new Date(active.started_at).toLocaleString()}
                  {active.finished_at && <> · finished {new Date(active.finished_at).toLocaleString()}</>}
                </div>
              </div>
              <Badge variant="outline" className={statusBadge(active.status === "completed" ? "pass" : active.status === "failed" ? "fail" : "pending")}>
                {active.status}
              </Badge>
            </div>
            <div className="space-y-2">
              {(steps ?? []).map((s) => (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/20">
                  <StatusIcon status={s.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">#{s.step_number}</span>
                      <span className="text-sm font-medium">{s.name}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusBadge(s.status)}`}>
                        {s.status}
                      </Badge>
                      {s.link_url && (
                        s.link_url.startsWith("/") ? (
                          <Link to={s.link_url} className="text-xs text-primary inline-flex items-center gap-1">
                            open <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <a href={s.link_url} className="text-xs text-primary inline-flex items-center gap-1" target="_blank" rel="noreferrer">
                            open <ExternalLink className="w-3 h-3" />
                          </a>
                        )
                      )}
                    </div>
                    {s.detail && (
                      <div className={`text-xs mt-1 ${s.status === "fail" ? "text-red-300" : "text-muted-foreground"}`}>
                        {s.detail}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!steps || steps.length === 0) && (
                <div className="text-xs text-muted-foreground text-center py-6">No steps yet…</div>
              )}
            </div>
          </Card>
        )}
      </div>
    </PlatformLayout>
  );
}
