import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { SectionCard, MetricTile, fmtMoney } from "./primitives";
import { startOfDay, endOfDay, subHours } from "date-fns";

export default function TodaySection() {
  const { selectedBusinessId } = usePlatformAuth();
  const ready = !!selectedBusinessId;

  const dayStart = startOfDay(new Date()).toISOString();
  const dayEnd = endOfDay(new Date()).toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const since24h = subHours(new Date(), 24).toISOString();

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

  const jobsCompleted = useQuery({
    queryKey: ["dash-today-jobs-completed", selectedBusinessId, today],
    enabled: ready,
    queryFn: async () => {
      const { count } = await supabase
        .from("platform_job_visits")
        .select("id", { count: "exact", head: true })
        .eq("business_id", selectedBusinessId!)
        .eq("scheduled_date", today)
        .eq("status", "completed");
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

  const tasksCompleted = useQuery({
    queryKey: ["dash-today-tasks-completed", selectedBusinessId, today],
    enabled: ready,
    queryFn: async () => {
      const { count } = await supabase
        .from("platform_tasks")
        .select("id", { count: "exact", head: true })
        .eq("business_id", selectedBusinessId!)
        .eq("status", "completed")
        .gte("completed_at", dayStart)
        .lte("completed_at", dayEnd);
      return count ?? 0;
    },
  });

  const openIssues = useQuery({
    queryKey: ["dash-today-issues", selectedBusinessId],
    enabled: ready,
    queryFn: async () => {
      const { count } = await supabase
        .from("platform_tasks")
        .select("id", { count: "exact", head: true })
        .eq("business_id", selectedBusinessId!)
        .neq("status", "completed");
      return count ?? 0;
    },
  });

  const failedAlerts = useQuery({
    queryKey: ["dash-today-failed-alerts", selectedBusinessId, since24h],
    enabled: ready,
    queryFn: async () => {
      const [emailRes, smsRes, whRes] = await Promise.all([
        supabase
          .from("email_send_log")
          .select("id", { count: "exact", head: true })
          .in("status", ["dlq", "failed", "bounced"])
          .gte("created_at", since24h),
        supabase
          .from("sms_messages")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("created_at", since24h),
        supabase
          .from("payment_webhook_events")
          .select("id", { count: "exact", head: true })
          .eq("processed", false)
          .not("error_message", "is", null)
          .gte("created_at", since24h),
      ]);
      return (
        (emailRes.count ?? 0) + (smsRes.count ?? 0) + (whRes.count ?? 0)
      );
    },
  });

  return (
    <SectionCard title="Today" subtitle="What's happening right now">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <MetricTile
          label="Jobs scheduled"
          value={jobsScheduled.data ?? 0}
          loading={jobsScheduled.isPending}
          to="/platform/schedule"
        />
        <MetricTile
          label="Jobs completed"
          value={jobsCompleted.data ?? 0}
          loading={jobsCompleted.isPending}
          to="/platform/jobs?status=completed"
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
        <MetricTile
          label="Tasks completed"
          value={tasksCompleted.data ?? 0}
          loading={tasksCompleted.isPending}
          to="/platform/tasks?status=completed"
          intent={(tasksCompleted.data ?? 0) > 0 ? "good" : "neutral"}
          hint="Office manager"
        />
        <MetricTile
          label="Open issues"
          value={openIssues.data ?? 0}
          loading={openIssues.isPending}
          to="/platform/tasks"
          intent={(openIssues.data ?? 0) > 0 ? "warn" : "neutral"}
        />
        <MetricTile
          label="Failed alerts 24h"
          value={failedAlerts.data ?? 0}
          loading={failedAlerts.isPending}
          to="/platform/backend-health"
          intent={(failedAlerts.data ?? 0) > 0 ? "bad" : "good"}
        />
      </div>
    </SectionCard>
  );
}