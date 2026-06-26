import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useDashboardScheduledJobs } from "@/hooks/useDashboardScheduledJobs";
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
  const { selectedBusinessId } = usePlatformAuth();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const weekJobs = useDashboardScheduledJobs({
    businessId: selectedBusinessId,
    startDate: weekStart,
    endDate: weekEnd,
    enabled: !!selectedBusinessId,
  });

  const monthJobs = useDashboardScheduledJobs({
    businessId: selectedBusinessId,
    startDate: monthStart,
    endDate: monthEnd,
    enabled: !!selectedBusinessId,
  });

  const revenueWeek = weekJobs.summary.revenueTotal;
  const revenueMonth = monthJobs.summary.revenueTotal;
  const jobsWeek = weekJobs.summary.jobCount;
  const jobsMonth = monthJobs.summary.jobCount;

  const weekLoading = weekJobs.isPending;
  const monthLoading = monthJobs.isPending;

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
