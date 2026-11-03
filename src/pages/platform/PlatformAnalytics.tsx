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
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { Link } from "react-router-dom";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { dateKeyInZone, DEFAULT_BUSINESS_TZ } from "@/lib/customers/customerDetail";
import { recordPath } from "@/lib/search/universalSearch";
import { inPeriod, isDone, mergeServiceJobs, monthlySeries, periodFor, priorPeriod, totalsFor, workState, type JobberRow, type Period, type PeriodKind, type PlatformRow, type ServiceJob } from "@/lib/analytics/serviceWork";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GREEN = "var(--accent-color)";
const GREEN_DIM = "#8195a2";
const GREEN_FAINT = "#61717f";
const RED = "#f87171";
const CARD_BORDER = "rgba(255,255,255,0.08)";

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
    <div className="command-kpi space-y-2">
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
    <div className="command-panel space-y-5">
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
  backgroundColor: "#101b1ef5",
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: "10px",
  boxShadow: "0 8px 30px #0008",
  padding: "12px 15px",
  fontSize: "12px",
  color: "#fff",
};

const PERIOD_OPTIONS: Array<{ v: PeriodKind; label: string }> = [
  { v: "ytd", label: "Year to date" }, { v: "year", label: "Full year" },
  { v: "q1", label: "Q1" }, { v: "q2", label: "Q2" }, { v: "q3", label: "Q3" }, { v: "q4", label: "Q4" },
  ...MONTHS.map((m, i) => ({ v: `m${i + 1}` as PeriodKind, label: m })),
];

/** Business-scoped, paginated reads of app + Jobber jobs for year-2 .. year (+ upcoming). */
async function fetchServiceJobs(businessId: string, year: number) {
  const start = `${year - 2}-01-01`;
  const end = `${year + 2}-01-01`;
  const [platform, jobber] = await Promise.all([
    fetchAllPages<PlatformRow>((f, t) => supabase.from("platform_jobs")
      .select("id, status, scheduled_start, total, title, source_record_id, source_system, deleted_at, customer:platform_customers(display_name), property:platform_properties(address_1, city, state, zip)")
      .eq("business_id", businessId).gte("scheduled_start", start).lt("scheduled_start", end)
      .order("id").range(f, t) as never),
    // Pad a day either side so timestamps near midnight land on the right local date.
    fetchAllPages<JobberRow>((f, t) => supabase.from("jobber_jobs")
      .select("id, jobber_id, title, status, scheduled_start, total_amount, client_name, property_address")
      .eq("business_id", businessId).gte("scheduled_start", `${year - 3}-12-31`).lt("scheduled_start", `${year + 2}-01-02`)
      .order("id").range(f, t)),
  ]);
  // Mirrors outside the window still suppress their Jobber source.
  const jobs = mergeServiceJobs(platform, jobber).filter((j) => !j.dateKey || (j.dateKey >= start && j.dateKey < end));
  return { businessId, year, jobs, todayKey: dateKeyInZone(new Date(), DEFAULT_BUSINESS_TZ) };
}

export default function PlatformAnalytics() {
  const reducedMotion = usePrefersReducedMotion();
  const { selectedBusinessId } = useBusinessContext();
  const queryClient = useQueryClient();
  const { isOwner } = useUserRole();
  const currentActualYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentActualYear);
  const [periodKind, setPeriodKind] = useState<PeriodKind>("ytd");
  const [syncing, setSyncing] = useState(false);
  const years = Array.from({ length: currentActualYear - 2023 }, (_, i) => 2024 + i);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["platform-analytics", selectedBusinessId, selectedYear],
    queryFn: () => fetchServiceJobs(selectedBusinessId as string, selectedYear),
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

  if (isError) {
    return <PlatformLayout><p className="text-destructive text-center py-20 font-body text-sm">Couldn't load analytics. <button className="underline" onClick={() => void refetch()}>Try again</button></p></PlatformLayout>;
  }
  if (isLoading || !data || data.businessId !== selectedBusinessId || data.year !== selectedYear) {
    return <PlatformLayout><LoadingSkeleton /></PlatformLayout>;
  }

  const todayKey = data.todayKey;
  const all = data.jobs;
  const period = periodFor(selectedYear, periodKind, todayKey);
  const prior = priorPeriod(period);
  const cur = totalsFor(all, period, todayKey);
  const prev = totalsFor(all, prior, todayKey);
  const prevFull = totalsFor(all, periodFor(selectedYear - 1, "year", todayKey), todayKey);
  const doneIn = (p: Period) => all.filter((j) => inPeriod(j.dateKey, p) && isDone(workState(j, todayKey)));
  const curDone = doneIn(period);
  const asUnified = (js: ServiceJob[]): UnifiedJob[] => js.map((j) => ({ id: j.id, scheduled_start: j.dateKey, total_amount: j.amount, client_name: j.clientName, property_address: j.address, status: j.status, title: j.title }));
  const curJobs = asUnified(curDone);
  const prevJobs = asUnified(doneIn(prior));

  const curRevenue = Math.round(cur.doneValue);
  const prevSamePeriodRev = Math.round(prev.doneValue);
  const yoyPct = prevSamePeriodRev > 0 ? Math.round(((curRevenue - prevSamePeriodRev) / prevSamePeriodRev) * 100) : 0;
  const yoyPositive = curRevenue >= prevSamePeriodRev;
  const prevFullRev = Math.round(prevFull.doneValue);
  const jobsCompleted = cur.doneJobs;
  const prevJobsCompleted = prev.doneJobs;
  const avgJobValue = cur.doneJobs > 0 ? cur.doneValue / cur.doneJobs : 0;
  const prevAvgJobValue = prev.doneJobs > 0 ? prev.doneValue / prev.doneJobs : 0;

  const series = monthlySeries(all, selectedYear, todayKey);
  const series2 = monthlySeries(all, selectedYear - 1, todayKey);
  const monthlyRev = series.map((p) => p.done);
  const bestMonthIdx = monthlyRev.indexOf(Math.max(...monthlyRev));
  const bestMonthRev = monthlyRev[bestMonthIdx];

  const revenueChartData = MONTHS.map((name, i) => ({
    name,
    [selectedYear]: series[i].done,
    booked: series[i].booked,
    [`${selectedYear - 1}`]: series[i].prior,
  }));
  const maxJobs = Math.max(...series.map((p) => p.doneJobs));
  const jobCountChartData = MONTHS.map((name, i) => ({ name, jobs: series[i].doneJobs, isMax: series[i].doneJobs === maxJobs }));

  const geoData = groupByCity(curJobs);
  const maxGeoCount = geoData.length > 0 ? geoData[0].count : 1;
  const serviceData = groupByService(curJobs);
  const maxServiceRev = serviceData.length > 0 ? serviceData[0].revenue : 1;

  const yoyChartData = MONTHS.map((name, i) => ({
    name,
    [selectedYear]: series[i].done,
    [selectedYear - 1]: series[i].prior,
    [selectedYear - 2]: series2[i].prior,
  }));

  // Customers are counted by name only within one business; this is a reporting estimate.
  const uniqueClients = new Set(curJobs.map(j => j.client_name).filter(Boolean)).size;
  const prevClients = new Set(prevJobs.map(j => j.client_name).filter(Boolean));
  const repeatCount = new Set(curJobs.filter(j => j.client_name && prevClients.has(j.client_name)).map(j => j.client_name)).size;
  const biggest = curDone.reduce<ServiceJob | null>((m, j) => (!m || j.amount > m.amount ? j : m), null);
  const biggestJob = { amount: Math.round(biggest?.amount ?? 0), name: biggest?.clientName || "—" };
  const upcoming = all.filter((j) => workState(j, todayKey) === "booked").sort((a, b) => (a.dateKey ?? "").localeCompare(b.dateKey ?? ""));
  const upcomingValue = Math.round(upcoming.reduce((t, j) => t + j.amount, 0));
  const thisMonthJobs = all.filter((j) => j.dateKey?.slice(0, 7) === todayKey.slice(0, 7) && workState(j, todayKey) !== "excluded").length;

  return (
    <PlatformLayout>
      <div className="platform-analytics space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight">Analytics</h1>
            <p className="font-body text-xs text-muted-foreground">Work on the schedule before today counts as done. Booked work is shown separately. This is job value, not money received.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <select aria-label="Period" value={periodKind} onChange={(e) => setPeriodKind(e.target.value as PeriodKind)} className="h-8 rounded-lg border border-border bg-background px-2 font-body text-xs text-foreground">
              {PERIOD_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
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
        <div className="command-panel p-6 text-center" style={{
          background: "rgba(var(--biz-accent-rgb),0.05)",
          border: `1px solid ${CARD_BORDER}`,
        }}>
          <p className="font-body text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Work done — {period.label}</p>
          <p className="font-display text-4xl md:text-5xl font-bold text-primary tracking-tight">
            ${curRevenue.toLocaleString()}
          </p>
          {prevSamePeriodRev > 0 && (
            <p className="font-body text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              vs same period last year: ${prevSamePeriodRev.toLocaleString()}
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
            label={`${selectedYear - 1} work done`}
            value={`$${prevFullRev.toLocaleString()}`}
            sub={`Full year ${selectedYear - 1}`}
            icon={DollarSign}
          />
          <StatCard
            label="Jobs done"
            value={jobsCompleted.toString()}
            sub={`${cur.recordedJobs} marked done · ${cur.doneJobs - cur.recordedJobs} by schedule${prevJobsCompleted > 0 ? ` · ${prevJobsCompleted} last year` : ""}`}
            icon={Briefcase}
          />
          <StatCard
            label="Avg Job Value"
            value={`$${Math.round(avgJobValue).toLocaleString()}`}
            sub={prevAvgJobValue > 0 ? `vs $${Math.round(prevAvgJobValue).toLocaleString()} last year` : undefined}
            icon={TrendingUp}
          />
          <StatCard
            label={`Best month ${selectedYear}`}
            value={bestMonthRev > 0 ? MONTHS[bestMonthIdx] : "—"}
            sub={bestMonthRev > 0 ? `$${bestMonthRev.toLocaleString()}` : "No data yet"}
            icon={Trophy}
            highlight={bestMonthRev > 0}
          />
        </div>

        {/* Website activity sits directly under the work summary */}
        <ConversionFunnelWidget businessId={selectedBusinessId} />

        {/* SECTION 3 — Monthly Revenue */}
        <ChartSection title={`Job value by month — ${selectedYear}`} subtitle="Done work, booked work still ahead, and last year" empty={series.every((p) => p.done === 0 && p.booked === 0)}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GREEN} stopOpacity={0.24} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="2 5" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#94a4a7", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "#94a4a7", fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip
                contentStyle={customTooltipStyle}
                labelStyle={{ color: "#ddd", fontWeight: 600 }}
                formatter={(v: number, name) => [`$${Number(v).toLocaleString()}`, String(name)]}
              />
              <Area isAnimationActive={!reducedMotion} animationDuration={600} type="monotone" dataKey={`${selectedYear - 1}`} stroke={GREEN_DIM} strokeWidth={1.5} strokeDasharray="4 4" fill="none" name={`${selectedYear - 1}`} />
              <Area isAnimationActive={!reducedMotion} animationDuration={600} type="monotone" dataKey="booked" stroke={GREEN} strokeWidth={1.5} strokeDasharray="2 3" fill="none" name="Booked" />
              <Area isAnimationActive={!reducedMotion} animationDuration={600} type="monotone" dataKey={selectedYear.toString()} stroke={GREEN} strokeWidth={2.5} fill="url(#greenGrad)" name={`${selectedYear}`} />
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

          <ChartSection title={`Jobs done per month — ${selectedYear}`} subtitle="Counted by scheduled start date" empty={maxJobs === 0}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={jobCountChartData}>
                <CartesianGrid vertical={false} strokeDasharray="2 5" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#94a4a7", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#94a4a7", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar isAnimationActive={!reducedMotion} animationDuration={600} maxBarSize={30} dataKey="jobs" fill={GREEN} radius={[5, 5, 0, 0]} opacity={0.9} />
              </BarChart>
            </ResponsiveContainer>
          </ChartSection>
        </div>

        {/* SECTION 6 — Year Over Year */}
        <ChartSection title="Year over year" subtitle="Done job value by month" empty={yoyChartData.every((r) => !r[selectedYear] && !r[selectedYear - 1] && !r[selectedYear - 2])}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={yoyChartData}>
              <CartesianGrid vertical={false} strokeDasharray="2 5" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#94a4a7", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "#94a4a7", fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip
                contentStyle={customTooltipStyle}
                labelStyle={{ color: "#ddd", fontWeight: 600 }}
                formatter={(v: number, name) => [`$${Number(v).toLocaleString()}`, String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#888" }} />
              <Line isAnimationActive={!reducedMotion} animationDuration={600} type="monotone" dataKey={selectedYear.toString()} stroke={GREEN} strokeWidth={2.5} dot={false} name={`${selectedYear}`} />
              <Line isAnimationActive={!reducedMotion} animationDuration={600} type="monotone" dataKey={`${selectedYear - 1}`} stroke={GREEN_DIM} strokeWidth={2} dot={false} name={`${selectedYear - 1}`} />
              <Line isAnimationActive={!reducedMotion} animationDuration={600} type="monotone" dataKey={`${selectedYear - 2}`} stroke={GREEN_FAINT} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name={`${selectedYear - 2}`} />
            </LineChart>
          </ResponsiveContainer>
        </ChartSection>

        {/* SECTION 7 — Revenue by Service Type */}
        {serviceData.length > 1 && (
          <ChartSection title="Job value by service" subtitle={period.label}>
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

        {/* Booked work ahead — exact job links */}
        <ChartSection title="Booked work ahead" subtitle={`${upcoming.length} jobs · $${upcomingValue.toLocaleString()} scheduled from today`} empty={upcoming.length === 0}>
          <ul className="divide-y divide-border/50">
            {upcoming.slice(0, 15).map((j) => (
              <li key={`${j.source}-${j.id}`}>
                <Link to={recordPath("job", j.id, j.source)} className="flex justify-between gap-3 py-2 hover:text-primary">
                  <span className="min-w-0 font-body text-xs"><span className="text-muted-foreground mr-2">{j.dateKey}</span>{j.clientName || j.title || "Job"}</span>
                  <span className="font-body text-xs tabular-nums shrink-0">${Math.round(j.amount).toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ul>
          {cur.undated > 0 && <p className="font-body text-[10px] text-muted-foreground mt-2">{cur.undated} jobs have no date and aren't counted.</p>}
        </ChartSection>

      </div>
    </PlatformLayout>
  );
}
