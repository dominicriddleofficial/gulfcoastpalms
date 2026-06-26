import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useDashboardScheduledJobs } from "@/hooks/useDashboardScheduledJobs";
import { fmtMoney } from "./primitives";
import { Link } from "react-router-dom";
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth } from "date-fns";
import { TrendingUp, DollarSign, Briefcase, Calendar } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function HeroTile({
  label,
  value,
  icon: Icon,
  to,
  loading,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  to: string;
  loading?: boolean;
}) {
  return (
    <Link
      to={to}
      className="block rounded-2xl p-4 md:p-5 transition-colors hover:bg-white/[0.06]"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(var(--biz-accent-rgb),0.18)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px -16px rgba(var(--biz-accent-rgb),0.4)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="font-body uppercase"
          style={{
            fontSize: "10px",
            letterSpacing: "0.16em",
            color: "hsl(220 8% 60%)",
          }}
        >
          {label}
        </div>
        <div
          className="rounded-lg p-1.5"
          style={{
            background: "rgba(var(--biz-accent-rgb),0.12)",
            border: "1px solid rgba(var(--biz-accent-rgb),0.22)",
          }}
        >
          <Icon
            className="w-3.5 h-3.5"
            style={{ color: "rgba(var(--biz-accent-rgb),0.95)" }}
          />
        </div>
      </div>
      <div
        className="font-display font-bold mt-3"
        style={{
          fontSize: "30px",
          color: "#fff",
          letterSpacing: "-0.025em",
          lineHeight: 1.05,
        }}
      >
        {loading ? "—" : value}
      </div>
    </Link>
  );
}

export default function HeadlineSection() {
  const { selectedBusinessId, userId, loading } = usePlatformAuth();
  const ready = !loading && !!userId && !!selectedBusinessId;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Primary, fast path: pre-aggregated snapshot row (one tiny query).
  // Resolves in ~150ms vs. ~1.5s for the raw-row hooks below.
  const snapshot = useQuery({
    queryKey: ["kpi-snapshot", selectedBusinessId],
    enabled: ready,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_kpi_snapshots")
        .select(
          "snapshot_date,revenue_today,revenue_week,revenue_month,jobs_today,jobs_week,jobs_month",
        )
        .eq("business_id", selectedBusinessId as string)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const snapshotResolved = snapshot.isSuccess;
  const hasSnapshot = snapshotResolved && !!snapshot.data;

  // Fallback path: kicks in only if the snapshot query resolved with no row
  // (brand-new business or snapshots never refreshed). Keeps the existing
  // computed value so tiles are never blank/wrong.
  const fallbackEnabled = ready && snapshotResolved && !hasSnapshot;

  const weekJobs = useDashboardScheduledJobs({
    businessId: selectedBusinessId,
    startDate: weekStart,
    endDate: weekEnd,
    enabled: fallbackEnabled,
  });

  const monthJobs = useDashboardScheduledJobs({
    businessId: selectedBusinessId,
    startDate: monthStart,
    endDate: monthEnd,
    enabled: fallbackEnabled,
  });

  const snap = snapshot.data;
  const revenueWeek = hasSnapshot
    ? Number(snap?.revenue_week ?? 0)
    : weekJobs.summary.revenueTotal;
  const revenueMonth = hasSnapshot
    ? Number(snap?.revenue_month ?? 0)
    : monthJobs.summary.revenueTotal;
  const jobsWeek = hasSnapshot
    ? Number(snap?.jobs_week ?? 0)
    : weekJobs.summary.jobCount;
  const jobsMonth = hasSnapshot
    ? Number(snap?.jobs_month ?? 0)
    : monthJobs.summary.jobCount;

  const weekLoading = hasSnapshot
    ? false
    : snapshot.isPending || weekJobs.isPending;
  const monthLoading = hasSnapshot
    ? false
    : snapshot.isPending || monthJobs.isPending;

  return (
    <div className="grid grid-cols-2 gap-3">
      <HeroTile
        label="Revenue This Week"
        value={fmtMoney(revenueWeek)}
        icon={TrendingUp}
        loading={weekLoading}
        to="/platform/payments"
      />
      <HeroTile
        label="Revenue This Month"
        value={fmtMoney(revenueMonth)}
        icon={DollarSign}
        loading={monthLoading}
        to="/platform/payments"
      />
      <HeroTile
        label="Jobs This Week"
        value={jobsWeek}
        icon={Briefcase}
        loading={weekLoading}
        to="/platform/schedule"
      />
      <HeroTile
        label="Jobs This Month"
        value={jobsMonth}
        icon={Calendar}
        loading={monthLoading}
        to="/platform/schedule"
      />
    </div>
  );
}
