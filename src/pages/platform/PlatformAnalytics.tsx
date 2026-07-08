import { useState, useMemo } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import ConversionFunnelWidget from "@/components/platform/ConversionFunnelWidget";
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
import { useUserRole } from "@/hooks/useUserRole";
import { Phone } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GREEN = "var(--accent-color)";
const GREEN_DIM = "rgba(var(--biz-accent-rgb),0.5)";
const GREEN_FAINT = "rgba(var(--biz-accent-rgb),0.25)";
const RED = "#f87171";
const CARD_BORDER = "rgba(var(--biz-accent-rgb),0.15)";

// A job counts as "completed" if it's not cancelled/deleted AND either has an
// explicit completion status OR is scheduled in the past. Jobber imports rarely
// carry a "completed" status, so the past-dated fallback is what catches them.
function isJobCompleted(j: UnifiedJob, now: Date = new Date()): boolean {
  const s = (j.status || "").toLowerCase().trim();
  if (["deleted", "archived", "canceled", "cancelled", "void", "draft"].includes(s)) return false;
  if (["completed", "complete", "done", "paid", "invoiced", "requires_invoicing"].includes(s)) return true;
  if (!j.scheduled_start) return false;
  return new Date(j.scheduled_start) < now;
}

// USPS state name → 2-letter abbreviation. Used to merge "Florida" (manual
// entry) with "FL" (Jobber sync) into one service-area bucket.
const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "puerto rico": "PR",
};

function titleCaseCity(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
}

function normalizeCityName(raw: string): string {
  let c = raw.trim().replace(/\s+/g, " ");
  if (!c) return "";
  c = titleCaseCity(c);
  // Standardize common abbreviations at the start of a city name so e.g.
  // "Ft Walton Beach" merges with "Fort Walton Beach".
  c = c.replace(/^Ft\.?\s+/i, "Fort ")
       .replace(/^St\.?\s+/i, "Saint ")
       .replace(/^Mt\.?\s+/i, "Mount ");
  return c;
}

// Parse a free-form address string into { city, state, zip }. Pops trailing
// zip + state segments off the comma-separated parts, then takes whatever
// remains in the last part as the city. Works for both the platform format
// ("street, City STATE 12345") and the Jobber format ("street, City, State, 12345").
function parseServiceArea(addr: string | null): { city: string; state: string; zip: string } {
  if (!addr) return { city: "", state: "", zip: "" };
  const parts = addr.split(",").map(s => s.trim()).filter(Boolean);
  let zip = "";
  let state = "";

  while (parts.length > 0) {
    const last = parts[parts.length - 1];
    // Pure zip segment, e.g. "32563" or "32563-1234"
    const pureZip = last.match(/^(\d{5})(?:-\d{4})?$/);
    if (pureZip && !zip) {
      zip = pureZip[1];
      parts.pop();
      continue;
    }
    // Pure state segment, e.g. "FL" or "Florida"
    const lk = last.toLowerCase().replace(/\./g, "");
    if (!state && (/^[a-z]{2}$/.test(lk) || STATE_NAME_TO_CODE[lk])) {
      state = lk.length === 2 ? lk.toUpperCase() : STATE_NAME_TO_CODE[lk];
      parts.pop();
      continue;
    }
    // Mixed segment: "City FL 32563" or "City Florida 32563" or "FL 32563"
    let str = last;
    if (!zip) {
      const m = str.match(/\b(\d{5})(?:-\d{4})?\b/);
      if (m && m.index !== undefined) {
        zip = m[1];
        str = (str.slice(0, m.index) + str.slice(m.index + m[0].length)).trim();
      }
    } else {
      str = str.replace(/\b\d{5}(?:-\d{4})?\b/, "").trim();
    }
    if (!state) {
      const tokens = str.split(/\s+/).filter(Boolean);
      for (let take = Math.min(2, tokens.length); take >= 1; take--) {
        const cand = tokens.slice(-take).join(" ").toLowerCase().replace(/\./g, "");
        if (/^[a-z]{2}$/.test(cand) || STATE_NAME_TO_CODE[cand]) {
          state = cand.length === 2 ? cand.toUpperCase() : STATE_NAME_TO_CODE[cand];
          tokens.splice(tokens.length - take, take);
          str = tokens.join(" ");
          break;
        }
      }
    }
    if (str.trim()) {
      parts[parts.length - 1] = str.trim();
    } else {
      parts.pop();
    }
    break;
  }

  const cityRaw = parts.length > 0 ? parts[parts.length - 1] : "";
  return { city: normalizeCityName(cityRaw), state, zip };
}

function serviceAreaLabel(p: { city: string; state: string; zip: string }): { key: string; label: string } {
  if (!p.city && !p.state && !p.zip) return { key: "__unknown__", label: "Unknown" };
  const key = `${p.city.toLowerCase()}|${p.state}|${p.zip}`;
  const tail = [p.state, p.zip].filter(Boolean).join(" ");
  const label = [p.city || "Unknown", tail].filter(Boolean).join(", ");
  return { key, label };
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

const EXCLUDED_JOB_STATUSES = new Set([
  "archived", "canceled", "cancelled", "deleted", "draft", "void",
]);

type PlatformJobRow = {
  id: string;
  status: string | null;
  scheduled_start: string | null;
  total: number | string | null;
  title: string | null;
  source_record_id: string | null;
  source_system: string | null;
  deleted_at: string | null;
  customer: { display_name: string | null } | null;
  property: { address_1: string | null; city: string | null; state: string | null; zip: string | null } | null;
};

function platformAddressString(p: PlatformJobRow["property"]): string | null {
  if (!p) return null;
  const cityStateZip = [p.city, p.state, p.zip].filter(Boolean).join(" ");
  return [p.address_1, cityStateZip].filter(Boolean).join(", ") || null;
}

async function fetchPlatformJobsUnified(
  businessId: string,
  startIso: string,
  endIso: string,
): Promise<{ jobs: UnifiedJob[]; importedJobberIds: Set<string> }> {
  const { data } = await supabase
    .from("platform_jobs")
    .select(
      `id, status, scheduled_start, total, title, source_record_id, source_system, deleted_at,
       customer:platform_customers(display_name),
       property:platform_properties(address_1, city, state, zip)`,
    )
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .gte("scheduled_start", startIso.slice(0, 10))
    .lt("scheduled_start", endIso.slice(0, 10));

  const importedJobberIds = new Set<string>();
  const rows = (data || []) as unknown as PlatformJobRow[];

  // Fallback: when a platform_jobs row has no linked property but was synced
  // from Jobber, recover the address string from the source jobber_jobs row.
  const missingJobberIds: string[] = [];
  for (const r of rows) {
    if (!r.property && r.source_system === "jobber" && r.source_record_id) {
      missingJobberIds.push(r.source_record_id);
    }
  }
  const jobberAddrMap = new Map<string, string | null>();
  if (missingJobberIds.length > 0) {
    const { data: jobberRows } = await supabase
      .from("jobber_jobs")
      .select("id, property_address")
      .in("id", missingJobberIds);
    for (const jr of (jobberRows || []) as Array<{ id: string; property_address: string | null }>) {
      jobberAddrMap.set(jr.id, jr.property_address);
    }
  }

  const jobs: UnifiedJob[] = [];
  for (const r of rows) {
    const s = (r.status || "").toLowerCase();
    if (EXCLUDED_JOB_STATUSES.has(s)) continue;
    if (r.source_record_id) importedJobberIds.add(r.source_record_id);
    const fallbackAddr =
      r.source_record_id ? jobberAddrMap.get(r.source_record_id) ?? null : null;
    jobs.push({
      id: r.id,
      scheduled_start: r.scheduled_start,
      total_amount: Number(r.total) || 0,
      client_name: r.customer?.display_name ?? null,
      property_address: platformAddressString(r.property) ?? fallbackAddr,
      status: r.status,
      title: r.title,
    });
  }
  return { jobs, importedJobberIds };
}

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

  // Fetch Jobber + Platform data in parallel for all four ranges
  const [
    jobberCurrent, jobberPrev, jobberTwoAgo, jobberPrevSamePeriod,
    platformCurrent, platformPrev, platformTwoAgo, platformPrevSamePeriod,
  ] = await Promise.all([
    supabase.from("jobber_jobs").select("id, title, status, scheduled_start, total_amount, client_name, property_address")
      .eq("business_id", businessId).gte("scheduled_start", yearStart).lt("scheduled_start", yearEnd),
    supabase.from("jobber_jobs").select("id, title, status, scheduled_start, total_amount, client_name, property_address")
      .eq("business_id", businessId).gte("scheduled_start", prevYearStart).lt("scheduled_start", prevYearEnd),
    supabase.from("jobber_jobs").select("id, scheduled_start, total_amount, client_name, property_address, title, status")
      .eq("business_id", businessId).gte("scheduled_start", twoYearsAgoStart).lt("scheduled_start", twoYearsAgoEnd),
    supabase.from("jobber_jobs").select("id, total_amount, scheduled_start, client_name, property_address, title, status")
      .eq("business_id", businessId).gte("scheduled_start", prevYearStart).lt("scheduled_start", samePeriodEnd),
    fetchPlatformJobsUnified(businessId, yearStart, yearEnd),
    fetchPlatformJobsUnified(businessId, prevYearStart, prevYearEnd),
    fetchPlatformJobsUnified(businessId, twoYearsAgoStart, twoYearsAgoEnd),
    fetchPlatformJobsUnified(businessId, prevYearStart, samePeriodEnd),
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

  const toUnifiedJobber = (data: any[], importedIds: Set<string>): UnifiedJob[] =>
    (data || [])
      .filter(j => !importedIds.has(j.id))
      .map(j => ({
        id: j.id,
        scheduled_start: j.scheduled_start || null,
        total_amount: Number(j.total_amount) || 0,
        client_name: j.client_name || null,
        property_address: j.property_address || null,
        status: j.status || null,
        title: j.title || null,
      }));

  // Union platform_jobs + jobber_jobs (dedup by source_record_id), then add
  // legacy data only when neither modern source has anything for the range.
  const merge = (
    platform: { jobs: UnifiedJob[]; importedJobberIds: Set<string> },
    jobber: any,
    legacyJobs: UnifiedJob[],
    legacyInv: UnifiedJob[],
  ): UnifiedJob[] => {
    const jobberUnified = toUnifiedJobber(jobber.data || [], platform.importedJobberIds);
    const modern = [...platform.jobs, ...jobberUnified];
    if (modern.length > 0) return modern;
    return deduplicateByRevenue([], legacyJobs, legacyInv);
  };

  return {
    currentYear: merge(platformCurrent, jobberCurrent, legacyCur, legacyInvCur),
    prevYear: merge(platformPrev, jobberPrev, legacyPrev, legacyInvPrev),
    twoYearsAgo: merge(platformTwoAgo, jobberTwoAgo, legacyTwoAgo, legacyInvTwoAgo),
    prevYearSamePeriod: merge(platformPrevSamePeriod, jobberPrevSamePeriod, legacySamePeriod, legacyInvSamePeriod),
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
  const map: Record<string, { label: string; count: number; revenue: number }> = {};
  jobs.forEach(j => {
    const { key, label } = serviceAreaLabel(parseServiceArea(j.property_address));
    if (!map[key]) map[key] = { label, count: 0, revenue: 0 };
    map[key].count++;
    map[key].revenue += j.total_amount;
  });
  return Object.values(map)
    .map(v => ({ city: v.label, count: v.count, revenue: v.revenue }))
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
      <p className={cn("font-display text-2xl font-bold tracking-tight", highlight ? "text-primary" : "text-foreground")}>{value}</p>
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
  const { isOwner } = useUserRole();
  const currentActualYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentActualYear);
  const [syncing, setSyncing] = useState(false);
  const years = [2024, 2025, 2026];

  const { data, isLoading } = useQuery({
    queryKey: ["platform-analytics", selectedBusinessId, selectedYear],
    queryFn: () => fetchAnalytics(selectedBusinessId, selectedYear),
    enabled: !!selectedBusinessId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const handleSyncHistorical = async () => {
    setSyncing(true);
    try {
      const { data: fnData, error } = await supabase.functions.invoke("jobber-sync", {
        body: { action: "full", historical: true, businessId: selectedBusinessId },
      });
      if (error) throw error;
      toast.success(`Historical sync complete — ${fnData?.records_synced || 0} records synced`);
      queryClient.invalidateQueries({ queryKey: ["platform-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["conversion-funnel"] });
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
  const _now = new Date();
  const jobsCompleted = curJobs.filter(j => isJobCompleted(j, _now)).length;
  const prevJobsCompleted = prevJobs.filter(j => isJobCompleted(j, _now)).length;
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
        <ConversionFunnelWidget days={30} businessId={selectedBusinessId} />
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
                "text-muted-foreground border-[rgba(var(--biz-accent-rgb),0.2)] hover:text-foreground hover:border-[rgba(var(--biz-accent-rgb),0.4)] hover:bg-[rgba(var(--biz-accent-rgb),0.05)]",
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
                      ? "text-primary border border-[rgba(var(--biz-accent-rgb),0.4)] bg-[rgba(var(--biz-accent-rgb),0.1)]"
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
          background: "rgba(var(--biz-accent-rgb),0.05)",
          border: `1px solid ${CARD_BORDER}`,
        }}>
          <p className="font-body text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{selectedYear} Revenue to Date</p>
          <p className="font-display text-4xl md:text-5xl font-bold text-primary tracking-tight">
            ${curRevenue.toLocaleString()}
          </p>
          {prevSamePeriodRev > 0 && (
            <p className="font-body text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              vs {selectedYear - 1} same period: ${prevSamePeriodRev.toLocaleString()}
              {yoyPositive
                ? <span className="text-primary flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> {yoyPct}%</span>
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
              <Tooltip
                contentStyle={customTooltipStyle}
                labelStyle={{ color: "#ddd", fontWeight: 600 }}
                formatter={(v: number, name) => [`$${Number(v).toLocaleString()}`, String(name)]}
              />
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
              <Tooltip
                contentStyle={customTooltipStyle}
                labelStyle={{ color: "#ddd", fontWeight: 600 }}
                formatter={(v: number, name) => [`$${Number(v).toLocaleString()}`, String(name)]}
              />
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
