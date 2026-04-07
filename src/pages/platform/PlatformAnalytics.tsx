import { useState, useMemo } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Briefcase, Trophy, Users, MapPin, BarChart3, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GREEN = "#22c55e";
const GREEN_DIM = "rgba(34,197,94,0.5)";
const GREEN_FAINT = "rgba(34,197,94,0.25)";
const RED = "#f87171";
const CARD_BORDER = "rgba(34,197,94,0.15)";

function extractCity(addr: string | null): string {
  if (!addr) return "Unknown";
  const parts = addr.split(",").map(s => s.trim());
  return parts.length >= 2 ? parts[parts.length - 3] || parts[1] || "Unknown" : "Unknown";
}

async function fetchAnalytics(businessId: string | null, year: number) {
  if (!businessId) return null;

  const yearStart = `${year}-01-01T00:00:00Z`;
  const yearEnd = `${year + 1}-01-01T00:00:00Z`;
  const prevYearStart = `${year - 1}-01-01T00:00:00Z`;
  const prevYearEnd = `${year}-01-01T00:00:00Z`;
  const twoYearsAgoStart = `${year - 2}-01-01T00:00:00Z`;
  const twoYearsAgoEnd = `${year - 1}-01-01T00:00:00Z`;

  const now = new Date();
  const samePeriodEnd = new Date(year - 1, now.getMonth(), now.getDate()).toISOString();

  const [currentYear, prevYear, twoYearsAgo, prevYearSamePeriod] = await Promise.all([
    supabase.from("jobber_jobs").select("id, title, status, scheduled_start, total_amount, client_name, property_address")
      .eq("business_id", businessId).gte("scheduled_start", yearStart).lt("scheduled_start", yearEnd),
    supabase.from("jobber_jobs").select("id, title, status, scheduled_start, total_amount, client_name, property_address")
      .eq("business_id", businessId).gte("scheduled_start", prevYearStart).lt("scheduled_start", prevYearEnd),
    supabase.from("jobber_jobs").select("id, scheduled_start, total_amount")
      .eq("business_id", businessId).gte("scheduled_start", twoYearsAgoStart).lt("scheduled_start", twoYearsAgoEnd),
    supabase.from("jobber_jobs").select("id, total_amount")
      .eq("business_id", businessId).gte("scheduled_start", prevYearStart).lt("scheduled_start", samePeriodEnd),
  ]);

  // Also get unscheduled jobs
  const { data: unscheduled } = await supabase.from("jobber_jobs").select("id, total_amount, client_name")
    .eq("business_id", businessId).is("scheduled_start", null);

  return {
    currentYear: currentYear.data || [],
    prevYear: prevYear.data || [],
    twoYearsAgo: twoYearsAgo.data || [],
    prevYearSamePeriod: prevYearSamePeriod.data || [],
    unscheduled: unscheduled || [],
    year,
  };
}

function groupByMonth(jobs: any[]): number[] {
  const months = Array(12).fill(0);
  jobs.forEach(j => {
    if (j.scheduled_start) {
      const m = new Date(j.scheduled_start).getMonth();
      months[m] += Number(j.total_amount) || 0;
    }
  });
  return months;
}

function countByMonth(jobs: any[]): number[] {
  const months = Array(12).fill(0);
  jobs.forEach(j => {
    if (j.scheduled_start) {
      const m = new Date(j.scheduled_start).getMonth();
      months[m]++;
    }
  });
  return months;
}

function groupByCity(jobs: any[]): Array<{ city: string; count: number; revenue: number }> {
  const map: Record<string, { count: number; revenue: number }> = {};
  jobs.forEach(j => {
    const city = extractCity(j.property_address);
    if (!map[city]) map[city] = { count: 0, revenue: 0 };
    map[city].count++;
    map[city].revenue += Number(j.total_amount) || 0;
  });
  return Object.entries(map)
    .map(([city, v]) => ({ city, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function groupByService(jobs: any[]): Array<{ service: string; count: number; revenue: number }> {
  const map: Record<string, { count: number; revenue: number }> = {};
  jobs.forEach(j => {
    const svc = j.title?.trim() || "Other";
    if (!map[svc]) map[svc] = { count: 0, revenue: 0 };
    map[svc].count++;
    map[svc].revenue += Number(j.total_amount) || 0;
  });
  return Object.entries(map)
    .map(([service, v]) => ({ service, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);
}

function StatCard({ label, value, sub, icon: Icon, highlight }: {
  label: string; value: string; sub?: string; icon: any; highlight?: boolean;
}) {
  return (
    <div className="rounded-xl p-4 space-y-2" style={{
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${CARD_BORDER}`,
    }}>
      <div className="flex items-center justify-between">
        <span className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4" style={{ color: GREEN_DIM }} />
      </div>
      <p className={cn("font-display text-2xl font-bold tracking-tight", highlight ? "text-[#22c55e]" : "text-foreground")}>{value}</p>
      {sub && <p className="font-body text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ChartSection({ title, subtitle, children, empty }: {
  title: string; subtitle: string; children: React.ReactNode; empty?: boolean;
}) {
  return (
    <div className="rounded-xl p-5 space-y-4" style={{
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${CARD_BORDER}`,
    }}>
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4" style={{ color: GREEN }} />
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
          <p className="font-body text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {empty ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Calendar className="w-6 h-6 text-muted-foreground/40" />
          <p className="font-body text-xs text-muted-foreground">No data yet</p>
        </div>
      ) : children}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-xl h-28 bg-white/5" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="rounded-xl h-24 bg-white/5" />)}
      </div>
      <div className="rounded-xl h-72 bg-white/5" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl h-64 bg-white/5" />
        <div className="rounded-xl h-64 bg-white/5" />
      </div>
    </div>
  );
}

const customTooltipStyle = {
  backgroundColor: "rgba(10,15,10,0.95)",
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: "8px",
  fontSize: "12px",
  color: "#fff",
};

export default function PlatformAnalytics() {
  const { selectedBusinessId } = useBusinessContext();
  const currentActualYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentActualYear);
  const years = [2024, 2025, 2026].filter((_, i, arr) => true);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-analytics", selectedBusinessId, selectedYear],
    queryFn: () => fetchAnalytics(selectedBusinessId, selectedYear),
    enabled: !!selectedBusinessId,
  });

  if (!selectedBusinessId) {
    return <PlatformLayout><p className="text-muted-foreground text-center py-20 font-body text-sm">Select a business to view analytics</p></PlatformLayout>;
  }

  if (isLoading || !data) {
    return <PlatformLayout><LoadingSkeleton /></PlatformLayout>;
  }

  const curJobs = data.currentYear;
  const prevJobs = data.prevYear;
  const twoAgoJobs = data.twoYearsAgo;

  // Hero stat
  const curRevenue = curJobs.reduce((s, j) => s + (Number(j.total_amount) || 0), 0);
  const prevSamePeriodRev = data.prevYearSamePeriod.reduce((s: number, j: any) => s + (Number(j.total_amount) || 0), 0);
  const yoyPct = prevSamePeriodRev > 0 ? Math.round(((curRevenue - prevSamePeriodRev) / prevSamePeriodRev) * 100) : 0;
  const yoyPositive = curRevenue >= prevSamePeriodRev;

  // Cards
  const prevFullRev = prevJobs.reduce((s, j) => s + (Number(j.total_amount) || 0), 0);
  const jobsCompleted = curJobs.filter(j => ["completed", "done"].includes(j.status?.toLowerCase() || "")).length;
  const prevJobsCompleted = prevJobs.filter(j => ["completed", "done"].includes(j.status?.toLowerCase() || "")).length;
  const avgJobValue = curJobs.length > 0 ? curRevenue / curJobs.length : 0;
  const prevAvgJobValue = prevJobs.length > 0 ? prevFullRev / prevJobs.length : 0;

  // Best month
  const monthlyRev = groupByMonth(curJobs);
  const bestMonthIdx = monthlyRev.indexOf(Math.max(...monthlyRev));
  const bestMonthRev = monthlyRev[bestMonthIdx];

  // Monthly chart data
  const prevMonthlyRev = groupByMonth(prevJobs);
  const twoAgoMonthlyRev = groupByMonth(twoAgoJobs);
  const monthlyCountCur = countByMonth(curJobs);
  const currentMonth = new Date().getMonth();

  const revenueChartData = MONTHS.map((name, i) => ({
    name,
    [selectedYear]: monthlyRev[i],
    [`${selectedYear - 1}`]: prevMonthlyRev[i],
    isFuture: selectedYear === currentActualYear && i > currentMonth,
  }));

  const jobCountChartData = MONTHS.map((name, i) => ({
    name,
    jobs: monthlyCountCur[i],
    isMax: monthlyCountCur[i] === Math.max(...monthlyCountCur),
  }));

  // Geographic
  const geoData = groupByCity(curJobs);
  const maxGeoCount = geoData.length > 0 ? geoData[0].count : 1;

  // Service type
  const serviceData = groupByService(curJobs);
  const maxServiceRev = serviceData.length > 0 ? serviceData[0].revenue : 1;

  // YoY chart
  const yoyChartData = MONTHS.map((name, i) => ({
    name,
    [selectedYear]: monthlyRev[i],
    [selectedYear - 1]: prevMonthlyRev[i],
    [selectedYear - 2]: twoAgoMonthlyRev[i],
  }));

  // Quick stats
  const uniqueClients = new Set(curJobs.map(j => j.client_name).filter(Boolean)).size;
  const prevClients = new Set(prevJobs.map(j => j.client_name).filter(Boolean));
  const repeatClients = curJobs.filter(j => j.client_name && prevClients.has(j.client_name));
  const repeatCount = new Set(repeatClients.map(j => j.client_name)).size;
  const biggestJob = curJobs.reduce((max, j) => (Number(j.total_amount) || 0) > max.amount ? { amount: Number(j.total_amount) || 0, name: j.client_name || "—" } : max, { amount: 0, name: "—" });
  const thisMonthJobs = curJobs.filter(j => j.scheduled_start && new Date(j.scheduled_start).getMonth() === currentMonth).length;

  return (
    <PlatformLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight">Analytics</h1>
            <p className="font-body text-xs text-muted-foreground">Business performance overview</p>
          </div>
          <div className="flex items-center gap-1.5">
            {years.map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-body text-xs font-medium transition-all",
                  y === selectedYear
                    ? "text-[#22c55e] border border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.1)]"
                    : "text-muted-foreground border border-transparent hover:text-foreground"
                )}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 1 — Hero Revenue */}
        <div className="rounded-xl p-6 text-center" style={{
          background: "rgba(34,197,94,0.05)",
          border: `1px solid ${CARD_BORDER}`,
        }}>
          <p className="font-body text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{selectedYear} Revenue to Date</p>
          <p className="font-display text-4xl md:text-5xl font-bold text-[#22c55e] tracking-tight">
            ${curRevenue.toLocaleString()}
          </p>
          {prevSamePeriodRev > 0 && (
            <p className="font-body text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              vs {selectedYear - 1} same period: ${prevSamePeriodRev.toLocaleString()}
              {yoyPositive
                ? <span className="text-[#22c55e] flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> {yoyPct}%</span>
                : <span className="text-[#f87171] flex items-center gap-0.5"><TrendingDown className="w-3 h-3" /> {Math.abs(yoyPct)}%</span>
              }
            </p>
          )}
        </div>

        {/* SECTION 2 — Four Key Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label={`${selectedYear - 1} Total Revenue`}
            value={`$${prevFullRev.toLocaleString()}`}
            sub={`Full year ${selectedYear - 1}`}
            icon={DollarSign}
          />
          <StatCard
            label={`Jobs Completed ${selectedYear}`}
            value={jobsCompleted.toString()}
            sub={prevJobsCompleted > 0 ? `vs ${prevJobsCompleted} same period last year` : undefined}
            icon={Briefcase}
          />
          <StatCard
            label="Avg Job Value"
            value={`$${Math.round(avgJobValue).toLocaleString()}`}
            sub={prevAvgJobValue > 0 ? `vs $${Math.round(prevAvgJobValue).toLocaleString()} last year` : undefined}
            icon={TrendingUp}
          />
          <StatCard
            label={`Best Month ${selectedYear}`}
            value={bestMonthRev > 0 ? MONTHS[bestMonthIdx] : "—"}
            sub={bestMonthRev > 0 ? `$${bestMonthRev.toLocaleString()}` : "No data yet"}
            icon={Trophy}
            highlight={bestMonthRev > 0}
          />
        </div>

        {/* SECTION 3 — Monthly Revenue */}
        <ChartSection title={`Monthly Revenue — ${selectedYear}`} subtitle="Total job value by month" empty={curJobs.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GREEN} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip contentStyle={customTooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
              <Area type="monotone" dataKey={`${selectedYear - 1}`} stroke={GREEN_DIM} strokeWidth={1.5} strokeDasharray="4 4" fill="none" name={`${selectedYear - 1}`} />
              <Area type="monotone" dataKey={selectedYear.toString()} stroke={GREEN} strokeWidth={2.5} fill="url(#greenGrad)" name={`${selectedYear}`} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartSection>

        {/* SECTION 4 & 5 — Geographic + Jobs by month */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartSection title="Jobs by Service Area" subtitle="Where are we doing the most work?" empty={geoData.length === 0}>
            <div className="space-y-3">
              {geoData.map(g => (
                <div key={g.city} className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-body text-xs text-foreground">{g.city}</span>
                    <span className="font-body text-[10px] text-muted-foreground">
                      {g.count} jobs · ${g.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(g.count / maxGeoCount) * 100}%`, background: GREEN }} />
                  </div>
                </div>
              ))}
            </div>
          </ChartSection>

          <ChartSection title={`Jobs Completed Per Month — ${selectedYear}`} subtitle="Volume of work each month" empty={curJobs.length === 0}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={jobCountChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="jobs" fill={GREEN} radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </ChartSection>
        </div>

        {/* SECTION 6 — Year Over Year */}
        <ChartSection title="Year Over Year Revenue" subtitle="Monthly comparison across years" empty={curJobs.length === 0 && prevJobs.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={yoyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip contentStyle={customTooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#888" }} />
              <Line type="monotone" dataKey={selectedYear.toString()} stroke={GREEN} strokeWidth={2.5} dot={false} name={`${selectedYear}`} />
              <Line type="monotone" dataKey={`${selectedYear - 1}`} stroke={GREEN_DIM} strokeWidth={2} dot={false} name={`${selectedYear - 1}`} />
              <Line type="monotone" dataKey={`${selectedYear - 2}`} stroke={GREEN_FAINT} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name={`${selectedYear - 2}`} />
            </LineChart>
          </ResponsiveContainer>
        </ChartSection>

        {/* SECTION 7 — Revenue by Service Type */}
        {serviceData.length > 1 && (
          <ChartSection title="Revenue by Service Type" subtitle="Which services make the most money?">
            <div className="space-y-3">
              {serviceData.map(s => (
                <div key={s.service} className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-body text-xs text-foreground truncate max-w-[60%]">{s.service}</span>
                    <span className="font-body text-[10px] text-muted-foreground">
                      {s.count} jobs · ${s.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(s.revenue / maxServiceRev) * 100}%`, background: GREEN_DIM }} />
                  </div>
                </div>
              ))}
            </div>
          </ChartSection>
        )}

        {/* SECTION 8 — Quick Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${CARD_BORDER}` }}>
            <p className="font-body text-[9px] uppercase tracking-wider text-muted-foreground">Customers Served</p>
            <p className="font-display text-lg font-bold text-foreground">{uniqueClients}</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${CARD_BORDER}` }}>
            <p className="font-body text-[9px] uppercase tracking-wider text-muted-foreground">Repeat Customers</p>
            <p className="font-display text-lg font-bold text-foreground">{repeatCount}</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${CARD_BORDER}` }}>
            <p className="font-body text-[9px] uppercase tracking-wider text-muted-foreground">Biggest Job</p>
            <p className="font-display text-lg font-bold text-foreground">${biggestJob.amount.toLocaleString()}</p>
            <p className="font-body text-[9px] text-muted-foreground truncate">{biggestJob.name}</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${CARD_BORDER}` }}>
            <p className="font-body text-[9px] uppercase tracking-wider text-muted-foreground">Jobs This Month</p>
            <p className="font-display text-lg font-bold text-foreground">{thisMonthJobs}</p>
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
}
