import { useMemo } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import KpiSnapshotWidget from "@/components/platform/KpiSnapshotWidget";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  Briefcase,
  Calendar,
  Clock,
  MapPin,
  CalendarDays,
} from "lucide-react";
import {
  format,
  isToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
} from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type JobberJob = {
  id: string;
  title: string | null;
  client_name: string | null;
  property_address: string | null;
  status: string;
  visit_status: string | null;
  scheduled_start: string | null;
  total_amount: number | null;
  job_number: string | null;
};

function KPICard({
  label,
  value,
  icon: Icon,
  valueColor,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  valueColor?: string;
}) {
  return (
    <div
      className="rounded-[14px] p-5 space-y-3 transition-all duration-200 cursor-default"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(var(--biz-accent-rgb),0.18)",
        borderRadius: "14px",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          style={{
            fontSize: "10px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "hsl(220 8% 50%)",
          }}
          className="font-body"
        >
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(var(--biz-accent-rgb),0.08)" }}
        >
          <Icon className="w-4 h-4" style={{ color: "rgba(var(--biz-accent-rgb),0.7)" }} />
        </div>
      </div>
      <span
        className="font-display block"
        style={{
          fontSize: "32px",
          fontWeight: 800,
          color: valueColor ?? "#fff",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  late: { bg: "#ef444420", text: "#ef4444", label: "Late" },
  today: { bg: "rgba(var(--biz-accent-rgb),0.13)", text: "var(--accent-color)", label: "Today" },
  scheduled: { bg: "#2563eb20", text: "#2563eb", label: "Scheduled" },
  completed: { bg: "rgba(var(--biz-accent-rgb),0.13)", text: "var(--accent-color)", label: "Completed" },
  upcoming: { bg: "#8b5cf620", text: "#8b5cf6", label: "Upcoming" },
};

function normalizeStatus(status: string | null | undefined, visitStatus: string | null | undefined) {
  const value = (visitStatus || status || "scheduled").toLowerCase();
  return STATUS_STYLES[value] ? value : "scheduled";
}

export default function PlatformDashboard() {
  const { selectedBusinessId, businesses, userId, loading: authLoading } = usePlatformAuth();
  // Gate every dashboard query on the session AND a selected business.
  // Without this, queries fire before the persisted session is restored,
  // RLS returns 0 rows, and the user sees a $0 / "waiting for first sync"
  // flash that disappears on refresh.
  const queriesReady = !authLoading && !!userId && !!selectedBusinessId;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  // Card 1 — Revenue This Week
  const { data: revenueThisWeek, isPending: revWeekPending } = useQuery({
    queryKey: ["dashboard-rev-week", selectedBusinessId],
    enabled: queriesReady,
    queryFn: async () => {
      let q = supabase
        .from("jobber_jobs")
        .select("total_amount")
        .gte("scheduled_start", weekStart)
        .lte("scheduled_start", weekEnd);
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      const { data } = await q;
      return data?.reduce((sum, j) => sum + (Number(j.total_amount) || 0), 0) ?? 0;
    },
  });

  // Card 2 — Revenue This Month
  const { data: revenueThisMonth, isPending: revMonthPending } = useQuery({
    queryKey: ["dashboard-rev-month", selectedBusinessId],
    enabled: queriesReady,
    queryFn: async () => {
      let q = supabase
        .from("jobber_jobs")
        .select("total_amount")
        .gte("scheduled_start", monthStart)
        .lte("scheduled_start", monthEnd);
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      const { data } = await q;
      return data?.reduce((sum, j) => sum + (Number(j.total_amount) || 0), 0) ?? 0;
    },
  });

  // Card 3 — Jobs This Week
  const { data: jobsThisWeek, isPending: jobsWeekPending } = useQuery({
    queryKey: ["dashboard-jobs-week", selectedBusinessId],
    enabled: queriesReady,
    queryFn: async () => {
      let q = supabase
        .from("jobber_jobs")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_start", weekStart)
        .lte("scheduled_start", weekEnd);
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      const { count } = await q;
      return count ?? 0;
    },
  });

  // Card 4 — Jobs This Month
  const { data: jobsThisMonth, isPending: jobsMonthPending } = useQuery({
    queryKey: ["jobs-this-month", selectedBusinessId],
    enabled: queriesReady,
    queryFn: async () => {
      let q = supabase
        .from("jobber_jobs")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_start", monthStart)
        .lte("scheduled_start", monthEnd);
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      const { count } = await q;
      return count ?? 0;
    },
  });

  // Today's jobs for schedule strip
  const { data: jobs = [], isLoading: loading } = useQuery({
    queryKey: ["dashboard-jobs", selectedBusinessId],
    enabled: queriesReady,
    queryFn: async () => {
      let q = supabase
        .from("jobber_jobs")
        .select("id, title, client_name, property_address, status, visit_status, scheduled_start, total_amount, job_number")
        .not("scheduled_start", "is", null)
        .order("scheduled_start", { ascending: true, nullsFirst: false });
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      const { data } = await q;
      return (data as JobberJob[]) ?? [];
    },
  });

  const { data: lastSyncTime } = useQuery({
    queryKey: ["dashboard-last-sync"],
    enabled: queriesReady,
    queryFn: async () => {
      const { data } = await supabase
        .from("sync_logs")
        .select("completed_at")
        .eq("status", "success")
        .in("sync_type", ["full", "jobs", "visits"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.completed_at ?? null;
    },
  });

  const trendData = useMemo(() => {
    return Array.from({ length: 8 }, (_, index) => {
      const date = subDays(new Date(), 7 - index);
      const key = format(date, "yyyy-MM-dd");
      const value = jobs
        .filter((job) => job.scheduled_start && format(new Date(job.scheduled_start), "yyyy-MM-dd") === key)
        .reduce((sum, job) => sum + (Number(job.total_amount) || 0), 0);
      return { day: format(date, "MMM d"), value };
    });
  }, [jobs]);

  const todayJobs = useMemo(() => {
    return jobs
      .filter((job) => job.scheduled_start && isToday(new Date(job.scheduled_start)))
      .sort((a, b) => new Date(a.scheduled_start!).getTime() - new Date(b.scheduled_start!).getTime());
  }, [jobs]);

  const selectedBiz = businesses.find((b) => b.id === selectedBusinessId);
  const hasTrendData = trendData.some((point) => point.value > 0);
  const syncLabel = lastSyncTime
    ? `${Math.max(1, Math.round((Date.now() - new Date(lastSyncTime).getTime()) / 60000))}m ago`
    : "waiting for first sync";

  return (
    <PlatformLayout>
      <div
        className="platform-dashboard-bg -m-4 md:-m-6 p-4 md:p-6"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(var(--biz-accent-rgb), 0.28) 0%, rgba(var(--biz-accent-rgb), 0.08) 45%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 15% 40%, rgba(var(--biz-accent-rgb), 0.12) 0%, transparent 60%),
            radial-gradient(ellipse 35% 25% at 85% 20%, rgba(var(--biz-accent-rgb), 0.10) 0%, transparent 55%),
            var(--biz-background-hex)
          `,
        }}
      >
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: "28px", letterSpacing: "-0.02em", color: "#fff" }}>
                Command Center
              </h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {selectedBiz && <InlineBadge shortcode={selectedBiz.shortcode} color={selectedBiz.default_business_color} />}
                <p className="font-body" style={{ fontSize: "13px", color: "hsl(220 8% 50%)" }}>
                  {selectedBiz?.public_brand_name ?? "All Businesses"} · Live Jobber snapshot · Last synced {syncLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Revenue This Week" value={revWeekPending || revenueThisWeek === undefined ? "—" : `$${Math.round(revenueThisWeek).toLocaleString()}`} icon={TrendingUp} />
            <KPICard label="Revenue This Month" value={revMonthPending || revenueThisMonth === undefined ? "—" : `$${Math.round(revenueThisMonth).toLocaleString()}`} icon={DollarSign} />
            <KPICard label="Jobs This Week" value={jobsWeekPending || jobsThisWeek === undefined ? "—" : jobsThisWeek.toString()} icon={Briefcase} />
            <KPICard label="Jobs This Month" value={jobsMonthPending || jobsThisMonth === undefined ? "—" : jobsThisMonth.toString()} icon={Calendar} />
          </div>

          <OwnerOnlySnapshot />

          {/* Chart */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: "rgba(var(--biz-accent-rgb),0.04)", border: "1px solid rgba(var(--biz-accent-rgb),0.10)", borderRadius: "16px" }}
          >
            <div>
              <h3 className="font-display text-sm font-semibold tracking-tight" style={{ color: "#fff" }}>Scheduled Job Value</h3>
              <p className="font-body" style={{ fontSize: "11px", color: "hsl(220 8% 50%)" }}>Last 8 scheduled days from synced Jobber jobs</p>
            </div>
            <div className="h-[280px] md:h-[320px]">
              {hasTrendData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="jobberTrendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-color)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--accent-color)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="day" tick={{ fill: "hsl(220 8% 50%)", fontSize: 11, fontFamily: "Outfit" }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(220 8% 50%)", fontSize: 11, fontFamily: "Outfit" }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--biz-background-hex)", border: "1px solid rgba(var(--biz-accent-rgb),0.15)", borderRadius: "8px", fontFamily: "Outfit", fontSize: "12px", color: "#fff" }}
                      formatter={(value: number) => [`$${Number(value).toLocaleString()}`, "Scheduled value"]}
                      labelStyle={{ color: "hsl(220 8% 50%)", marginBottom: 4 }}
                    />
                    <Area type="monotone" dataKey="value" stroke="var(--accent-color)" strokeWidth={2} fill="url(#jobberTrendGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <DollarSign className="w-10 h-10 mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
                  <p className="font-body text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Scheduled job value will appear here as synced jobs populate</p>
                </div>
              )}
            </div>
          </div>

          {/* Today's schedule */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(var(--biz-accent-rgb),0.10)", borderRadius: "16px" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold tracking-tight" style={{ color: "#fff" }}>Today's Jobber Schedule</h3>
                <p className="font-body" style={{ fontSize: "11px", color: "hsl(220 8% 50%)" }}>{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
              </div>
              <span className="font-body font-medium" style={{ fontSize: "11px", color: "var(--accent-color)" }}>{todayJobs.length} job{todayJobs.length !== 1 ? "s" : ""}</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-20 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(var(--biz-accent-rgb),0.08)" }} />
                ))}
              </div>
            ) : todayJobs.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.15)" }} />
                  <p className="font-body text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No synced Jobber jobs scheduled today</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {todayJobs.map((job) => {
                  const normalizedStatus = normalizeStatus(job.status, job.visit_status);
                  const statusInfo = STATUS_STYLES[normalizedStatus] ?? STATUS_STYLES.scheduled;
                  return (
                    <div
                      key={job.id}
                      className="flex-shrink-0 w-56 rounded-lg p-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(var(--biz-accent-rgb),0.08)" }}
                    >
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        {job.scheduled_start && (
                          <span className="flex items-center gap-1 font-body" style={{ fontSize: "11px", color: "hsl(220 8% 50%)" }}>
                            <Clock className="w-3 h-3" />
                            {format(new Date(job.scheduled_start), "h:mm a")}
                          </span>
                        )}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full font-body font-medium" style={{ fontSize: "9px", backgroundColor: statusInfo.bg, color: statusInfo.text }}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="font-body text-sm font-medium truncate" style={{ color: "#fff" }}>{job.client_name || job.title || "Jobber Job"}</p>
                      {job.property_address && (
                        <p className="font-body truncate flex items-center gap-1 mt-0.5" style={{ fontSize: "11px", color: "hsl(220 8% 50%)" }}>
                          <MapPin className="w-3 h-3 shrink-0" />
                          {job.property_address}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
}

function OwnerOnlySnapshot() {
  const { isOwner } = useUserRole();
  if (!isOwner) return null;
  return <KpiSnapshotWidget />;
}
