import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { SectionCard, MetricTile } from "./primitives";
import { addLocalDays, toLocalDateKey, todayLocalKey } from "@/lib/localDate";

export default function OperationsSection() {
  const { selectedBusinessId, userId, loading } = usePlatformAuth();
  const ready = !loading && !!userId && !!selectedBusinessId;

  const today = todayLocalKey();
  const next7 = toLocalDateKey(addLocalDays(new Date(), 7));

  const crewWorkload = useQuery({
    queryKey: ["dash-ops-workload", selectedBusinessId, today, next7],
    enabled: ready,
    queryFn: async () => {
      const { data: assignments } = await supabase
        .from("platform_visit_assignments")
        .select("crew_member_id, visit_id")
        .eq("business_id", selectedBusinessId!);
      const ids = (assignments ?? []).map((a) => a.visit_id).filter(Boolean);
      if (ids.length === 0) return 0;
      const { data: visits } = await supabase
        .from("platform_job_visits")
        .select("id")
        .in("id", ids)
        .gte("scheduled_date", today)
        .lte("scheduled_date", next7)
        .neq("status", "completed")
        .neq("status", "cancelled");
      return visits?.length ?? 0;
    },
  });

  const jobsByStatus = useQuery({
    queryKey: ["dash-ops-jobs-status", selectedBusinessId],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_jobs")
        .select("status")
        .eq("business_id", selectedBusinessId!);
      const counts: Record<string, number> = {};
      for (const r of data ?? []) {
        const s = String(r.status || "unknown");
        counts[s] = (counts[s] ?? 0) + 1;
      }
      return counts;
    },
  });

  const overdue = useQuery({
    queryKey: ["dash-ops-overdue", selectedBusinessId, today],
    enabled: ready,
    queryFn: async () => {
      const { count } = await supabase
        .from("platform_job_visits")
        .select("id", { count: "exact", head: true })
        .eq("business_id", selectedBusinessId!)
        .lt("scheduled_date", today)
        .in("status", ["scheduled", "in_progress", "on_my_way"]);
      return count ?? 0;
    },
  });

  const recurringDue = useQuery({
    queryKey: ["dash-ops-recurring", selectedBusinessId, today, next7],
    enabled: ready,
    queryFn: async () => {
      const { count } = await supabase
        .from("platform_jobs")
        .select("id", { count: "exact", head: true })
        .eq("business_id", selectedBusinessId!)
        .eq("job_type", "recurring")
        .gte("scheduled_start", today)
        .lte("scheduled_start", next7);
      return count ?? 0;
    },
  });

  const scheduleGaps = useQuery({
    queryKey: ["dash-ops-gaps", selectedBusinessId, today, next7],
    enabled: ready,
    queryFn: async () => {
      // Days in next 7 with zero scheduled visits
      const { data } = await supabase
        .from("platform_job_visits")
        .select("scheduled_date")
        .eq("business_id", selectedBusinessId!)
        .gte("scheduled_date", today)
        .lte("scheduled_date", next7);
      const filled = new Set((data ?? []).map((r) => r.scheduled_date));
      let gaps = 0;
      for (let i = 0; i <= 7; i++) {
        const d = toLocalDateKey(addLocalDays(new Date(), i));
        if (!filled.has(d)) gaps++;
      }
      return gaps;
    },
  });

  const jobsHint = jobsByStatus.data
    ? Object.entries(jobsByStatus.data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${k}:${v}`)
        .join("  ")
    : "";

  return (
    <SectionCard title="Operations" subtitle="Crew, jobs, and schedule">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <MetricTile
          label="Crew workload 7d"
          value={crewWorkload.data ?? 0}
          loading={crewWorkload.isPending}
          to="/platform/crew"
          hint="open assignments"
        />
        <MetricTile
          label="Total active jobs"
          value={Object.values(jobsByStatus.data ?? {}).reduce(
            (s, n) => s + n,
            0,
          )}
          loading={jobsByStatus.isPending}
          to="/platform/jobs"
          hint={jobsHint}
        />
        <MetricTile
          label="Overdue visits"
          value={overdue.data ?? 0}
          loading={overdue.isPending}
          to="/platform/jobs?filter=overdue"
          intent={(overdue.data ?? 0) > 0 ? "bad" : "good"}
        />
        <MetricTile
          label="Recurring due 7d"
          value={recurringDue.data ?? 0}
          loading={recurringDue.isPending}
          to="/platform/jobs?type=recurring"
        />
        <MetricTile
          label="Schedule gaps 7d"
          value={scheduleGaps.data ?? 0}
          loading={scheduleGaps.isPending}
          to="/platform/schedule"
          intent={(scheduleGaps.data ?? 0) > 2 ? "warn" : "neutral"}
          hint="days with 0 visits"
        />
      </div>
    </SectionCard>
  );
}