import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { fmtMoney } from "./primitives";
import { Link } from "react-router-dom";
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const { selectedBusinessId } = usePlatformAuth();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const weekKey = format(weekStart, "yyyy-MM-dd") + "_" + format(weekEnd, "yyyy-MM-dd");
  const monthKey = format(monthStart, "yyyy-MM-dd") + "_" + format(monthEnd, "yyyy-MM-dd");

  const kpis = useQuery({
    queryKey: ["dashboard-kpis", selectedBusinessId, weekKey, monthKey],
    enabled: !!selectedBusinessId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_kpis", {
        p_business_id: selectedBusinessId as string,
        p_week_start: format(weekStart, "yyyy-MM-dd"),
        p_week_end: format(weekEnd, "yyyy-MM-dd"),
        p_month_start: format(monthStart, "yyyy-MM-dd"),
        p_month_end: format(monthEnd, "yyyy-MM-dd"),
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        revenueWeek: Number(row?.revenue_week ?? 0),
        jobsWeek: Number(row?.jobs_week ?? 0),
        revenueMonth: Number(row?.revenue_month ?? 0),
        jobsMonth: Number(row?.jobs_month ?? 0),
      };
    },
  });

  const revenueWeek = kpis.data?.revenueWeek ?? 0;
  const revenueMonth = kpis.data?.revenueMonth ?? 0;
  const jobsWeek = kpis.data?.jobsWeek ?? 0;
  const jobsMonth = kpis.data?.jobsMonth ?? 0;
  const loading = kpis.isPending;

  return (
    <div className="grid grid-cols-2 gap-3">
      <HeroTile
        label="Revenue This Week"
        value={fmtMoney(revenueWeek)}
        icon={TrendingUp}
        loading={loading}
        to="/platform/payments"
      />
      <HeroTile
        label="Revenue This Month"
        value={fmtMoney(revenueMonth)}
        icon={DollarSign}
        loading={loading}
        to="/platform/payments"
      />
      <HeroTile
        label="Jobs This Week"
        value={jobsWeek}
        icon={Briefcase}
        loading={loading}
        to="/platform/schedule"
      />
      <HeroTile
        label="Jobs This Month"
        value={jobsMonth}
        icon={Calendar}
        loading={loading}
        to="/platform/schedule"
      />
    </div>
  );
}
