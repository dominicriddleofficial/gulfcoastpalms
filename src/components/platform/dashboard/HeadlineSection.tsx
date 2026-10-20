import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { fmtMoney } from "./primitives";
import { Link } from "react-router-dom";
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, DollarSign, Briefcase, Calendar, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function HeroTile({ label, value, icon: Icon, to, loading, unavailable, hint, featured }: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  to: string;
  loading?: boolean;
  unavailable?: boolean;
  hint: string;
  featured?: boolean;
}) {
  return (
    <Link to={to} className="command-kpi group" data-featured={featured}>
      <div className="flex items-center justify-between gap-2">
        <div className="command-kpi-label">{label}</div>
        <span className="command-kpi-icon"><Icon className="h-3.5 w-3.5" strokeWidth={1.6} /></span>
      </div>
      <div className="command-kpi-value" aria-busy={loading}>
        {loading || unavailable ? "—" : value}
      </div>
      <div className="command-kpi-foot">
        <span>{unavailable ? "Data unavailable" : hint}</span>
        <ArrowUpRight className="h-3 w-3" />
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
    <div className="command-kpis">
      <HeroTile
        label="Revenue this week"
        hint={`${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`}
        featured
        value={fmtMoney(revenueWeek)}
        icon={TrendingUp}
        loading={loading}
        unavailable={kpis.isError}
        to="/platform/payments"
      />
      <HeroTile
        label="Revenue this month"
        hint={format(now, "MMMM yyyy")}
        value={fmtMoney(revenueMonth)}
        icon={DollarSign}
        loading={loading}
        unavailable={kpis.isError}
        to="/platform/payments"
      />
      <HeroTile
        label="Jobs this week"
        hint="View weekly schedule"
        value={jobsWeek}
        icon={Briefcase}
        loading={loading}
        unavailable={kpis.isError}
        to="/platform/schedule"
      />
      <HeroTile
        label="Jobs this month"
        hint="View monthly schedule"
        value={jobsMonth}
        icon={Calendar}
        loading={loading}
        unavailable={kpis.isError}
        to="/platform/schedule"
      />
    </div>
  );
}
