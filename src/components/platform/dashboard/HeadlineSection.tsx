import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { fmtMoney } from "./primitives";
import { Link } from "react-router-dom";
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth } from "date-fns";
import { TrendingUp, DollarSign, Briefcase, Calendar } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

  const wsDate = weekStart.toISOString().slice(0, 10);
  const msDate = monthStart.toISOString().slice(0, 10);

  const revenueWeek = useQuery({
    queryKey: ["dash-rev-week", selectedBusinessId, wsDate],
    enabled: ready,
    queryFn: async () => {
      // Prefer recorded payments; fall back to completed Jobber jobs so the
      // dashboard stays accurate even when payments haven't been ingested yet.
      const { data: pays } = await supabase
        .from("platform_payments")
        .select("amount")
        .eq("business_id", selectedBusinessId!)
        .gte("payment_date", wsDate);
      const paySum = (pays ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
      if (paySum > 0) return paySum;
      const { data: jobs } = await supabase
        .from("jobber_jobs")
        .select("total_amount")
        .eq("business_id", selectedBusinessId!)
        .gte("scheduled_start", weekStart.toISOString())
        .lte("scheduled_start", weekEnd.toISOString());
      return (jobs ?? []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
    },
  });

  const revenueMonth = useQuery({
    queryKey: ["dash-rev-month", selectedBusinessId, msDate],
    enabled: ready,
    queryFn: async () => {
      const { data: pays } = await supabase
        .from("platform_payments")
        .select("amount")
        .eq("business_id", selectedBusinessId!)
        .gte("payment_date", msDate);
      const paySum = (pays ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
      if (paySum > 0) return paySum;
      const { data: jobs } = await supabase
        .from("jobber_jobs")
        .select("total_amount")
        .eq("business_id", selectedBusinessId!)
        .gte("scheduled_start", monthStart.toISOString())
        .lte("scheduled_start", monthEnd.toISOString());
      return (jobs ?? []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
    },
  });

  const jobsWeek = useQuery({
    queryKey: ["dash-jobs-week", selectedBusinessId, wsDate],
    enabled: ready,
    queryFn: async () => {
      const { count } = await supabase
        .from("jobber_jobs")
        .select("id", { count: "exact", head: true })
        .eq("business_id", selectedBusinessId!)
        .gte("scheduled_start", weekStart.toISOString())
        .lte("scheduled_start", weekEnd.toISOString());
      return count ?? 0;
    },
  });

  const jobsMonth = useQuery({
    queryKey: ["dash-jobs-month", selectedBusinessId, msDate],
    enabled: ready,
    queryFn: async () => {
      const { count } = await supabase
        .from("jobber_jobs")
        .select("id", { count: "exact", head: true })
        .eq("business_id", selectedBusinessId!)
        .gte("scheduled_start", monthStart.toISOString())
        .lte("scheduled_start", monthEnd.toISOString());
      return count ?? 0;
    },
  });

  return (
    <div className="grid grid-cols-2 gap-3">
      <HeroTile
        label="Revenue This Week"
        value={fmtMoney(revenueWeek.data ?? 0)}
        icon={TrendingUp}
        loading={revenueWeek.isPending}
        to="/platform/payments"
      />
      <HeroTile
        label="Revenue This Month"
        value={fmtMoney(revenueMonth.data ?? 0)}
        icon={DollarSign}
        loading={revenueMonth.isPending}
        to="/platform/payments"
      />
      <HeroTile
        label="Jobs This Week"
        value={jobsWeek.data ?? 0}
        icon={Briefcase}
        loading={jobsWeek.isPending}
        to="/platform/schedule"
      />
      <HeroTile
        label="Jobs This Month"
        value={jobsMonth.data ?? 0}
        icon={Calendar}
        loading={jobsMonth.isPending}
        to="/platform/schedule"
      />
    </div>
  );
}
