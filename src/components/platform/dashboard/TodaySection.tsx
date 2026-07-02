import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { SectionCard, MetricTile, fmtMoney } from "./primitives";

export default function TodaySection() {
  const { selectedBusinessId } = usePlatformAuth();
  const ready = !!selectedBusinessId;

  const today = new Date().toISOString().slice(0, 10);

  const jobsScheduled = useQuery({
    queryKey: ["dash-today-jobs-scheduled", selectedBusinessId, today],
    enabled: ready,
    queryFn: async () => {
      const { count } = await supabase
        .from("platform_job_visits")
        .select("id", { count: "exact", head: true })
        .eq("business_id", selectedBusinessId!)
        .eq("scheduled_date", today);
      return count ?? 0;
    },
  });

  const revenueScheduled = useQuery({
    queryKey: ["dash-today-rev-sched", selectedBusinessId, today],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_job_visits")
        .select("job:platform_jobs!inner(total)")
        .eq("business_id", selectedBusinessId!)
        .eq("scheduled_date", today);
      return (data ?? []).reduce((s, r: { job: { total: number | string | null } | null }) => {
        const t = r.job?.total;
        return s + (Number(t) || 0);
      }, 0);
    },
  });

  const revenueCollected = useQuery({
    queryKey: ["dash-today-rev-col", selectedBusinessId, today],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_payments")
        .select("amount")
        .eq("business_id", selectedBusinessId!)
        .eq("payment_date", today);
      return (data ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    },
  });

  return (
    <SectionCard title="Today" subtitle="What's happening right now">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <MetricTile
          label="Jobs scheduled"
          value={jobsScheduled.data ?? 0}
          loading={jobsScheduled.isPending}
          to="/platform/schedule"
        />
        <MetricTile
          label="Revenue scheduled"
          value={fmtMoney(revenueScheduled.data ?? 0)}
          loading={revenueScheduled.isPending}
          to="/platform/schedule"
        />
        <MetricTile
          label="Revenue collected"
          value={fmtMoney(revenueCollected.data ?? 0)}
          loading={revenueCollected.isPending}
          to="/platform/payments"
          intent="good"
        />
      </div>
    </SectionCard>
  );
}