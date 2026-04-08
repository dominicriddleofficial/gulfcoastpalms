import { useState, useMemo } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { useBusinessContext } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Briefcase, Trophy, Users, MapPin, BarChart3, Calendar, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

type UnifiedJob = {
  id: string;
  scheduled_start: string | null;
  total_amount: number;
  client_name: string | null;
  property_address: string | null;
  status: string | null;
  title: string | null;
};

async function fetchLegacyJobs(yearStart: string, yearEnd: string): Promise<UnifiedJob[]> {
  const { data } = await supabase
    .from("jobs")
    .select("id, job_date, revenue, customer_name, city, service_type, status")
    .gte("job_date", yearStart.slice(0, 10))
    .lt("job_date", yearEnd.slice(0, 10));

  return (data || []).map(j => ({
    id: j.id,
    scheduled_start: j.job_date ? `${j.job_date}T00:00:00Z` : null,
    total_amount: Number(j.revenue) || 0,
    client_name: j.customer_name || null,
    property_address: j.city ? `${j.city}` : null,
    status: j.status || null,
    title: j.service_type || null,
  }));
}

async function fetchLegacyInvoices(yearStart: string, yearEnd: string): Promise<UnifiedJob[]> {
  const { data } = await supabase
    .from("invoices")
    .select("id, amount, created_at, customer_name, status")
    .gte("created_at", yearStart)
    .lt("created_at", yearEnd);

  return (data || []).map(i => ({
    id: `inv-${i.id}`,
    scheduled_start: i.created_at || null,
    total_amount: Number(i.amount) || 0,
    client_name: i.customer_name || null,
    property_address: null,
    status: i.status || null,
    title: null,
  }));
}

function deduplicateByRevenue(jobberJobs: UnifiedJob[], legacyJobs: UnifiedJob[], legacyInvoices: UnifiedJob[]): UnifiedJob[] {
  // If jobber has data for a period, prefer it. Otherwise use legacy.
  // Simple approach: use all jobber jobs, then add legacy jobs that don't overlap by client+date
  const jobberKeys = new Set(
    jobberJobs.map(j => `${j.client_name?.toLowerCase()}-${j.scheduled_start?.slice(0, 10)}`)
  );

  const uniqueLegacyJobs = legacyJobs.filter(j => {
    const key = `${j.client_name?.toLowerCase()}-${j.scheduled_start?.slice(0, 10)}`;
    return !jobberKeys.has(key);
  });

  // For invoices, only include if we don't already have revenue from jobs
  // Skip invoices entirely if we have job data to avoid double-counting
  const hasJobData = jobberJobs.length > 0 || legacyJobs.length > 0;

  return [...jobberJobs, ...uniqueLegacyJobs, ...(hasJobData ? [] : legacyInvoices)];
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

  // Fetch Jobber data
  const [currentYear, prevYear, twoYearsAgo, prevYearSamePeriod] = await Promise.all([
    supabase.from("jobber_jobs").select("id, title, status, scheduled_start, total_amount, client_name, property_address")
      .eq("business_id", businessId).gte("scheduled_start", yearStart).lt("scheduled_start", yearEnd),
    supabase.from("jobber_jobs").select("id, title, status, scheduled_start, total_amount, client_name, property_address")
      .eq("business_id", businessId).gte("scheduled_start", prevYearStart).lt("scheduled_start", prevYearEnd),
    supabase.from("jobber_jobs").select("id, scheduled_start, total_amount, client_name, property_address, title, status")
      .eq("business_id", businessId).gte("scheduled_start", twoYearsAgoStart).lt("scheduled_start", twoYearsAgoEnd),
    supabase.from("jobber_jobs").select("id, total_amount, scheduled_start, client_name, property_address, title, status")
      .eq("business_id", businessId).gte("scheduled_start", prevYearStart).lt("scheduled_start", samePeriodEnd),
  ]);

  // Fetch legacy data for all three year ranges
  const [legacyCur, legacyPrev, legacyTwoAgo, legacyInvCur, legacyInvPrev, legacyInvTwoAgo,
    legacySamePeriod, legacyInvSamePeriod] = await Promise.all([
    fetchLegacyJobs(yearStart, yearEnd),
    fetchLegacyJobs(prevYearStart, prevYearEnd),
    fetchLegacyJobs(twoYearsAgoStart, twoYearsAgoEnd),
    fetchLegacyInvoices(yearStart, yearEnd),
    fetchLegacyInvoices(prevYearStart, prevYearEnd),
    fetchLegacyInvoices(twoYearsAgoStart, twoYearsAgoEnd),
    fetchLegacyJobs(prevYearStart, samePeriodEnd),
    fetchLegacyInvoices(prevYearStart, samePeriodEnd),
  ]);

  const toUnified = (data: any[]): UnifiedJob[] =>
    (data || []).map(j => ({
      id: j.id,
      scheduled_start: j.scheduled_start || null,
      total_amount: Number(j.total_amount) || 0,
      client_name: j.client_name || null,
      property_address: j.property_address || null,
      status: j.status || null,
      title: j.title || null,
    }));

  return {
    currentYear: deduplicateByRevenue(toUnified(currentYear.data || []), legacyCur, legacyInvCur),
    prevYear: deduplicateByRevenue(toUnified(prevYear.data || []), legacyPrev, legacyInvPrev),
    twoYearsAgo: deduplicateByRevenue(toUnified(twoYearsAgo.data || []), legacyTwoAgo, legacyInvTwoAgo),
    prevYearSamePeriod: deduplicateByRevenue(toUnified(prevYearSamePeriod.data || []), legacySamePeriod, legacyInvSamePeriod),
    unscheduled: [] as UnifiedJob[],
    year,
  };
}

function groupByMonth(jobs: UnifiedJob[]): number[] {
  const months = Array(12).fill(0);
  jobs.forEach(j => {
    if (j.scheduled_start) {
      const m = new Date(j.scheduled_start).getMonth();
      months[m] += j.total_amount;
    }
  });
  return months;
}

function countByMonth(jobs: UnifiedJob[]): number[] {
  const months = Array(12).fill(0);
  jobs.forEach(j => {
    if (j.scheduled_start) {
      const m = new Date(j.scheduled_start).getMonth();
      months[m]++;
    }
  });
  return months;
}

function groupByCity(jobs: UnifiedJob[]): Array<{ city: string; count: number; revenue: number }> {
  const map: Record<string, { count: number; revenue: number }> = {};
  jobs.forEach(j => {
    const city = extractCity(j.property_address);
    if (!map[city]) map[city] = { count: 0, revenue: 0 };
    map[city].count++;
    map[city].revenue += j.total_amount;
  });
  return Object.entries(map)
    .map(([city, v]) => ({ city, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function groupByService(jobs: UnifiedJob[]): Array<{ service: string; count: number; revenue: number }> {
  const map: Record<string, { count: number; revenue: number }> = {};
  jobs.forEach(j => {
    const svc = j.title?.trim() || "Other";
    if (!map[svc]) map[svc] = { count: 0, revenue: 0 };
    map[svc].count++;
    map[svc].revenue += j.total_amount;
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
  const queryClient = useQueryClient();
  const currentActualYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentActualYear);
  const [syncing, setSyncing] = useState(false);
  const years = [2024, 2025, 2026];

  const { data, isLoading } = useQuery({
    queryKey: ["platform-analytics", selectedBusinessId, selectedYear],
    queryFn: () => fetchAnalytics(selectedBusinessId, selectedYear),
    enabled: !!selectedBusinessId,
  });

  const handleSyncHistorical = async () => {
    setSyncing(true);
    try {
      const { data: fnData, error } = await supabase.functions.invoke("jobber-sync", {
        body: { action: "full", historical: true },
      });
      if (error) throw error;
      toast.success(`Historical sync complete — ${fnData?.records_synced || 0} records synced`);
      queryClient.invalidateQueries({ queryKey: ["platform-analytics"] });
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message || "Unknown error"}`);
    } finally {
      setSyncing(false);
    }
  };

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
  const curRevenue = curJobs.reduce((s, j) => s + j.total_amount, 0);
  const prevSamePeriodRev = data.prevYearSamePeriod.reduce((s: number, j: UnifiedJob) => s + j.total_amount, 0);
  const yoyPct = prevSamePeriodRev > 0 ? Math.round(((curRevenue - prevSamePeriodRev) / prevSamePeriodRev) * 100) : 0;
  const yoyPositive = curRevenue >= prevSamePeriodRev;

  // Cards
  const prevFullRev = prevJobs.reduce((s, j) => s + j.total_amount, 0);
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
  const biggestJob = curJobs.reduce((max, j) => j.total_amount > max.amount ? { amount: j.total_amount, name: j.client_name || "—" } : max, { amount: 0, name: "—" });
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncHistorical}
              disabled={syncing}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-[11px] font-medium transition-all border",
                "text-muted-foreground border-[rgba(34,197,94,0.2)] hover:text-foreground hover:border-[rgba(34,197,94,0.4)] hover:bg-[rgba(34,197,94,0.05)]",
                syncing && "opacity-60 pointer-events-none"
              )}
            >
              <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync Historical Data"}
            </button>
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
