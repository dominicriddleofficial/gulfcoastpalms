import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDashboardScheduledJobs, type DashboardScheduledJob } from "@/hooks/useDashboardScheduledJobs";
import { fmtMoney } from "./primitives";
import {
  eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth,
  startOfWeek, subMonths, subWeeks,
} from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { ArrowDownRight, ArrowUpRight, CalendarDays, RefreshCw } from "lucide-react";
import { parseDateOnlyLocal } from "@/lib/localDate";

type Period = "week" | "month";
type DayBucket = {
  date: string;
  label: string;
  value: number;
  prior?: number | null;
  jobs: DashboardScheduledJob[];
};

// Keep the schedule's local-date keys and unrounded amounts. Formatting must
// never change the values used to reconcile the chart with the schedule.
function dayBuckets(jobs: DashboardScheduledJob[], start: Date, end: Date, period: Period): DayBucket[] {
  const buckets = eachDayOfInterval({ start, end }).map(date => ({
    date: format(date, "yyyy-MM-dd"),
    label: format(date, period === "week" ? "EEE" : "d"),
    value: 0,
    jobs: [] as DashboardScheduledJob[],
  }));
  const byDate = new Map(buckets.map(bucket => [bucket.date, bucket]));
  for (const job of jobs) {
    const bucket = byDate.get(job.scheduled_local_date);
    if (!bucket) continue;
    bucket.value += job.amount_counted;
    bucket.jobs.push(job);
  }
  return buckets;
}

function axisMoney(value: number) {
  if (Math.abs(value) >= 1000) return `$${Number((value / 1000).toFixed(1))}k`;
  return `$${value}`;
}

function ChartTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: DayBucket }>;
}) {
  const bucket = payload?.[0]?.payload;
  if (!active || !bucket) return null;
  return (
    <div className="command-chart-tooltip">
      <span>{format(parseDateOnlyLocal(bucket.date), "EEEE, MMM d")}</span>
      <strong>{fmtMoney(bucket.value)}</strong>
      <span>{bucket.jobs.length} scheduled {bucket.jobs.length === 1 ? "job" : "jobs"}</span>
      {bucket.prior != null && <div className="mt-2 border-t border-white/10 pt-2">Prior period: {fmtMoney(bucket.prior)}</div>}
    </div>
  );
}

export default function ScheduledValueChart() {
  const { selectedBusinessId } = usePlatformAuth();
  const { isOwner } = useUserRole();
  const reducedMotion = usePrefersReducedMotion();
  const [period, setPeriod] = useState<Period>("week");
  const gradientId = `scheduled-fill-${useId().replace(/:/g, "")}`;
  const today = new Date();
  const todayKey = format(today, "yyyy-MM-dd");
  const { start, end, prevStart, prevEnd } = useMemo(() => {
    const now = parseDateOnlyLocal(todayKey);
    if (period === "week") {
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
        prevStart: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
        prevEnd: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
      };
    }
    const previous = subMonths(now, 1);
    return { start: startOfMonth(now), end: endOfMonth(now), prevStart: startOfMonth(previous), prevEnd: endOfMonth(previous) };
  }, [period, todayKey]);

  const current = useDashboardScheduledJobs({ businessId: selectedBusinessId, startDate: start, endDate: end });
  const prior = useDashboardScheduledJobs({ businessId: selectedBusinessId, startDate: prevStart, endDate: prevEnd });
  const buckets = useMemo(() => dayBuckets(current.jobs, start, end, period), [current.jobs, start, end, period]);
  const previousBuckets = useMemo(() => dayBuckets(prior.jobs, prevStart, prevEnd, period), [prior.jobs, prevStart, prevEnd, period]);
  const hasPrior = !prior.isPending && !prior.isError && previousBuckets.some(b => b.value !== 0);
  const chartData = buckets.map((bucket, index) => ({ ...bucket, prior: hasPrior ? previousBuckets[index]?.value ?? null : null }));
  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const jobCount = buckets.reduce((sum, bucket) => sum + bucket.jobs.length, 0);
  const peak = buckets.reduce<DayBucket | null>((best, bucket) => !best || bucket.value > best.value ? bucket : best, null);
  const priorTotal = previousBuckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const delta = hasPrior && priorTotal > 0 ? ((total - priorTotal) / priorTotal) * 100 : null;
  const elapsedDays = Math.max(1, buckets.filter(b => b.date <= todayKey).length);
  const mismatch = Math.abs(total - current.summary.revenueTotal) > .01 || jobCount !== current.summary.jobCount;
  const unavailable = !selectedBusinessId || current.isPending || current.isError;
  const showEmpty = !unavailable && jobCount === 0;
  const todayLabel = buckets.find(bucket => bucket.date === todayKey)?.label;
  const tickLabels = period === "week" ? undefined : buckets.filter((_, index) => index === 0 || (index + 1) % 5 === 0).map(b => b.label);
  const directionUp = delta !== null && delta >= 0;
  const DeltaIcon = directionUp ? ArrowUpRight : ArrowDownRight;

  return (
    <section className="command-panel command-chart" aria-label="Scheduled job value">
      <header className="command-panel-header">
        <div>
          <h2 className="command-panel-title">Scheduled job value</h2>
          <p className="command-panel-subtitle">{format(start, "MMM d")} – {format(end, "MMM d, yyyy")}</p>
        </div>
        <div className="command-period" role="group" aria-label="Chart period">
          {(["week", "month"] as const).map(value => (
            <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}>
              {value === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
      </header>

      <div className="command-chart-summary">
        <div>
          <div className="command-chart-total" aria-busy={current.isPending}>{unavailable ? "—" : fmtMoney(total)}</div>
          <div className="command-chart-total-label flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Total scheduled this {period}</span>
            {!unavailable && delta !== null && (
              <span className="inline-flex items-center gap-0.5" style={{ color: directionUp ? "var(--accent-color)" : "#f87171" }}>
                <DeltaIcon className="h-3 w-3" />{Math.abs(delta).toFixed(0)}% <span className="ml-1 text-muted-foreground">vs last full {period}</span>
              </span>
            )}
          </div>
        </div>
        <div className="command-chart-legend" aria-label="Chart legend">
          <span><i />This {period}</span>
          {hasPrior && <span><i className="prior" />Last {period}</span>}
        </div>
      </div>

      {!selectedBusinessId ? (
        <div className="command-chart-state">Select a workspace to view its schedule.</div>
      ) : current.isPending ? (
        <div className="command-chart-state command-skeleton" role="status">Loading scheduled jobs…</div>
      ) : current.isError ? (
        <div className="command-chart-state" role="alert">
          <p>Scheduled job data is unavailable.</p>
          <button type="button" className="inline-flex items-center gap-2" onClick={() => current.refetch()}><RefreshCw className="h-3.5 w-3.5" />Retry</button>
        </div>
      ) : showEmpty ? (
        <div className="command-chart-state">
          <CalendarDays className="h-6 w-6 text-primary/70" strokeWidth={1.5} />
          <p>No jobs scheduled this {period}</p>
          <Link to="/platform/schedule">Open schedule →</Link>
        </div>
      ) : (
        <div className="command-chart-plot" aria-label={`Daily scheduled value: ${fmtMoney(total)} across ${jobCount} jobs. Daily values are available in the table below.`}>
          <ResponsiveContainer width="100%" height="100%" debounce={60}>
            <AreaChart data={chartData} margin={{ top: 18, right: 10, bottom: 0, left: 0 }} accessibilityLayer>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-color)" stopOpacity={.24} />
                  <stop offset="70%" stopColor="var(--accent-color)" stopOpacity={.045} />
                  <stop offset="100%" stopColor="var(--accent-color)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,.065)" strokeDasharray="2 5" />
              <XAxis dataKey="label" ticks={tickLabels} interval={0} tick={{ fill: "#93a4a7", fontSize: 10 }} tickLine={false} axisLine={false} tickMargin={12} height={32} />
              <YAxis tickFormatter={axisMoney} tick={{ fill: "#93a4a7", fontSize: 10 }} tickLine={false} axisLine={false} width={48} tickCount={4} domain={[0, "auto"]} />
              {todayLabel && <ReferenceLine x={todayLabel} stroke="rgba(var(--biz-accent-rgb), .23)" strokeDasharray="3 5" />}
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(var(--biz-accent-rgb),.45)", strokeWidth: 1, strokeDasharray: "3 3" }} wrapperStyle={{ zIndex: 10 }} />
              {hasPrior && <Area type="monotone" dataKey="prior" stroke="#70818c" strokeWidth={1.5} strokeDasharray="4 5" fill="transparent" activeDot={false} isAnimationActive={false} connectNulls={false} />}
              <Area type="monotone" dataKey="value" stroke="var(--accent-color)" strokeWidth={2.5} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 5, fill: "var(--accent-color)", stroke: "#0c1214", strokeWidth: 3 }} isAnimationActive={!reducedMotion} animationDuration={600} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <dl className="command-chart-stats">
        <div><dt title="Full scheduled total divided by elapsed calendar days">Average / elapsed day</dt><dd>{unavailable ? "—" : fmtMoney(total / elapsedDays)}</dd></div>
        <div><dt>Highest-value day</dt><dd>{unavailable || !peak || peak.value <= 0 ? "—" : `${peak.label} · ${fmtMoney(peak.value)}`}</dd></div>
        <div><dt>Scheduled jobs</dt><dd>{unavailable ? "—" : jobCount}</dd></div>
      </dl>
      {prior.isError && <p className="mt-3 text-xs text-muted-foreground">Previous-period comparison is unavailable.</p>}
      {isOwner && !unavailable && mismatch && <p role="alert" className="mt-3 text-xs text-red-300">Chart and schedule totals differ. Review graph data below.</p>}
      {!unavailable && (
        <details className="command-chart-data">
          <summary>View daily totals{isOwner ? " & graph data" : ""}</summary>
          <div className="max-h-80 overflow-auto rounded-lg border border-white/5">
            <table>
              <caption className="sr-only">Daily scheduled values for the selected {period}</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Jobs</th><th scope="col">Scheduled</th></tr></thead>
              <tbody>{buckets.map(bucket => <tr key={bucket.date}><td>{format(parseDateOnlyLocal(bucket.date), "MMM d")}</td><td>{bucket.jobs.length}</td><td>{fmtMoney(bucket.value)}</td></tr>)}</tbody>
            </table>
            {isOwner && (
              <div className="space-y-2 p-3 text-[10px]">
                <p>Schedule total: {fmtMoney(current.summary.revenueTotal)} · {current.summary.jobCount} jobs</p>
                {buckets.flatMap(bucket => bucket.jobs.map(job => (
                  <p key={`${job.job_id}-${job.visit_id ?? job.id}`}>
                    {bucket.date} · {job.client_name ?? "Unnamed customer"} · {job.title} · {fmtMoney(job.amount_counted)} · {job.source}
                    <span className="block break-all text-muted-foreground">Job {job.job_id} · Visit {job.visit_id ?? "—"}</span>
                  </p>
                )))}
              </div>
            )}
          </div>
        </details>
      )}
    </section>
  );
}
