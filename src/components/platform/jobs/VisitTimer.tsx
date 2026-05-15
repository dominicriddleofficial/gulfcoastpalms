import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle2 } from "lucide-react";

interface VisitTimerProps {
  jobberJobId: string;
  status: string;
}

function fmtElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function VisitTimer({ jobberJobId, status }: VisitTimerProps) {
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const s = (status || "").toLowerCase();
  const isInProgress = s === "in_progress" || s === "on_site" || s === "on_my_way";
  const isCompleted = s === "completed" || s === "complete";

  // Load timestamps
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("job_visit_events")
        .select("started_at, completed_at")
        .eq("jobber_job_id", jobberJobId)
        .maybeSingle();
      if (cancelled) return;
      setStartedAt(data?.started_at ?? null);
      setCompletedAt(data?.completed_at ?? null);
    })();
    return () => { cancelled = true; };
  }, [jobberJobId, status]);

  // Tick while in-progress
  useEffect(() => {
    if (!isInProgress || !startedAt || completedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isInProgress, startedAt, completedAt]);

  if (isInProgress && startedAt && !completedAt) {
    const elapsed = now - new Date(startedAt).getTime();
    return (
      <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 text-orange-400">
          <Clock className="w-4 h-4 animate-pulse" />
          <span className="font-body text-xs font-semibold">In progress</span>
        </div>
        <span className="font-mono text-base font-bold text-orange-300 tabular-nums">
          {fmtElapsed(elapsed)}
        </span>
      </div>
    );
  }

  if (isCompleted && startedAt && completedAt) {
    const dur = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    return (
      <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle2 className="w-4 h-4" />
          <span className="font-body text-xs font-semibold">Completed</span>
        </div>
        <span className="font-body text-sm font-semibold text-primary tabular-nums">
          {fmtDuration(dur)}
        </span>
      </div>
    );
  }

  return null;
}
