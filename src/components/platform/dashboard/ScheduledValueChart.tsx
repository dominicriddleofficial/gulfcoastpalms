import { useEffect, useMemo, useState } from "react";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useDashboardScheduledJobs } from "@/hooks/useDashboardScheduledJobs";
import { SectionCard, fmtMoney } from "./primitives";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { CalendarDays } from "lucide-react";

type DayBucket = {
  date: string;
  label: string;
  value: number;
  jobs: Array<{
    job_id: string;
    visit_id: string | null;
    job_number: string | null;
    title: string | null;
    client_name: string | null;
    scheduled_start: string;
    amount: number;
    source: string;
  }>;
};

function niceTicks(maxValue: number): number[] {
  if (maxValue <= 0) return [0, 100, 250, 500];
  const steps = [
    100, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000,
  ];
  const target = maxValue / 4;
  const step = steps.find((s) => s >= target) ?? steps[steps.length - 1];
  const top = Math.ceil(maxValue / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top; v += step) out.push(v);
  return out;
}

function fmtTick(v: number): string {
  if (v === 0) return "$0";
  if (v >= 1000) {
    const k = v / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `$${v}`;
}

type Period = "week" | "month";

export default function ScheduledValueChart() {
  const { selectedBusinessId, userId, loading } = usePlatformAuth();
  const { isOwner } = useUserRole();
  const [showDebug, setShowDebug] = useState(false);
  const [period, setPeriod] = useState<Period>("week");
  const ready = !loading && !!userId && !!selectedBusinessId;

  const today = useMemo(() => new Date(), []);
  const { start, end, prevStart, prevEnd } = useMemo(() => {
    if (period === "week") {
      const s = startOfWeek(today, { weekStartsOn: 1 });
      const e = endOfWeek(today, { weekStartsOn: 1 });
      const ps = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
      const pe = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
      return { start: s, end: e, prevStart: ps, prevEnd: pe };
    }
    const s = startOfMonth(today);
    const e = endOfMonth(today);
    const prev = subMonths(today, 1);
    return { start: s, end: e, prevStart: startOfMonth(prev), prevEnd: endOfMonth(prev) };
  }, [period, today]);

  const { jobs, summary, isLoading } = useDashboardScheduledJobs({
    businessId: selectedBusinessId,
    startDate: start,
    endDate: end,
    enabled: ready,
  });

  const prior = useDashboardScheduledJobs({
    businessId: selectedBusinessId,
    startDate: prevStart,
    endDate: prevEnd,
    enabled: ready,
  });

  const buckets = useMemo<DayBucket[]>(() => {
    const days = eachDayOfInterval({ start, end });
    const map = new Map<string, DayBucket>();
    for (const d of days) {
      const key = format(d, "yyyy-MM-dd");
      const label = period === "week" ? format(d, "EEE") : format(d, "d");
      map.set(key, { date: key, label, value: 0, jobs: [] });
    }
    for (const j of jobs) {
      const key = j.scheduled_local_date;
      const b = map.get(key);
      if (!b) continue;
      const amount = j.amount_counted;
      b.value += amount;
      b.jobs.push({
        job_id: j.job_id,
        visit_id: j.visit_id,
        job_number: j.job_number,
        title: j.title,
        client_name: j.client_name,
        scheduled_start: j.scheduled_start,
        amount,
        source: j.source,
      });
    }
    return Array.from(map.values()).map((b) => ({
      ...b,
      value: Math.round(b.value),
    }));
  }, [jobs, start, end, period]);

  const visibleGraphTotal = buckets.reduce((s, b) => s + b.value, 0);
  const graphJobCount = buckets.reduce((s, b) => s + b.jobs.length, 0);

  const stats = useMemo(() => {
    const total = visibleGraphTotal;
    const daysElapsed = Math.max(
      1,
      buckets.filter((b) => new Date(b.date + "T00:00:00") <= today).length,
    );
    const avgPerDay = Math.round(total / daysElapsed);
    const busiest = buckets.reduce<DayBucket | null>(
      (best, b) => (best && best.value >= b.value ? best : b),
      null,
    );
    const priorTotal = (prior.jobs ?? []).reduce(
      (s, j) => s + j.amount_counted,
      0,
    );
    let deltaPct: number | null = null;
    if (!prior.isLoading && priorTotal > 0) {
      deltaPct = ((total - priorTotal) / priorTotal) * 100;
    } else if (!prior.isLoading && priorTotal === 0 && total > 0) {
      deltaPct = null;
    }
    return { total, avgPerDay, busiest, deltaPct, priorTotal };
  }, [buckets, prior.jobs, prior.isLoading, today, visibleGraphTotal]);

  const hasMismatch =
    graphJobCount !== summary.jobCount ||
    Math.round(visibleGraphTotal) !== Math.round(summary.revenueTotal);

  useEffect(() => {
    if (!ready || isLoading || !hasMismatch) return;
    console.error("[ScheduledValueChart] KPI/graph mismatch", {
      period,
      start: start.toISOString(),
      end: end.toISOString(),
      kpiJobsThisWeek: summary.jobCount,
      kpiRevenueThisWeek: summary.revenueTotal,
      graphJobCount,
      graphTotal: visibleGraphTotal,
      buckets,
    });
  }, [buckets, end, graphJobCount, hasMismatch, isLoading, period, ready, start, summary.jobCount, summary.revenueTotal, visibleGraphTotal]);

  const ticks = niceTicks(Math.max(...buckets.map((b) => b.value), 0));
  const yMax = ticks[ticks.length - 1] ?? 0;

  const title =
    period === "week"
      ? "Scheduled Job Value This Week"
      : "Scheduled Job Value This Month";
  const subtitle = `${period === "week" ? "This week" : "This month"} · ${fmtMoney(visibleGraphTotal)} total`;

  // Sparse x-axis labels for month view
  const monthLabelTargets = useMemo(() => {
    if (period !== "month") return null;
    const lastDay = buckets.length;
    const targets = new Set<string>(["1", "5", "10", "15", "20", "25", String(lastDay)]);
    return targets;
  }, [period, buckets.length]);

  const peak = buckets.reduce<DayBucket | null>(
    (best, b) => (best && best.value >= b.value ? best : b),
    null,
  );
  const peakLabel = peak && peak.value > 0 ? peak.label : null;
  const todayKey = format(today, "yyyy-MM-dd");
  const todayBucket = buckets.find((b) => b.date === todayKey);

  const toggle = (
    <div
      className="inline-flex rounded-full p-0.5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(var(--biz-accent-rgb),0.18)",
      }}
      role="tablist"
      aria-label="Period"
    >
      {(["week", "month"] as const).map((p) => {
        const active = period === p;
        return (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setPeriod(p)}
            className="font-body uppercase tracking-wider transition-colors"
            style={{
              minHeight: 32,
              padding: "6px 14px",
              fontSize: 11,
              borderRadius: 999,
              color: active ? "#0a0f0a" : "rgba(255,255,255,0.75)",
              background: active
                ? "rgb(var(--biz-accent-rgb))"
                : "transparent",
              fontWeight: active ? 700 : 500,
            }}
          >
            {p === "week" ? "Week" : "Month"}
          </button>
        );
      })}
    </div>
  );

  const showEmpty = !isLoading && visibleGraphTotal === 0;
  const showSkeleton = isLoading && buckets.length === 0;

  return (
    <SectionCard title={title} subtitle={subtitle} action={toggle}>
      {isOwner && hasMismatch && (
        <div
          className="rounded-md px-3 py-2 font-body"
          style={{
            fontSize: 12,
            color: "#ef4444",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.30)",
          }}
        >
          Graph mismatch detected. Open View graph data for details.
        </div>
      )}
      <StatsStrip stats={stats} period={period} />
      <div style={{ width: "100%", height: 220, position: "relative" }}>
        {showSkeleton && <ChartSkeleton />}
        {showEmpty && !showSkeleton && (
          <EmptyState period={period} />
        )}
        {!showEmpty && !showSkeleton && (
          <ResponsiveContainer>
            <AreaChart
              key={period}
              data={buckets}
              margin={{ top: 12, right: 12, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="schedValGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(var(--biz-accent-rgb),0.55)" />
                  <stop offset="60%" stopColor="rgba(var(--biz-accent-rgb),0.18)" />
                  <stop offset="100%" stopColor="rgba(var(--biz-accent-rgb),0)" />
                </linearGradient>
                <filter id="schedValGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(220 8% 55%)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                tickFormatter={(v: string) => {
                  if (!monthLabelTargets) return v;
                  return monthLabelTargets.has(v) ? v : "";
                }}
                minTickGap={0}
              />
              <YAxis
                tick={{ fill: "hsl(220 8% 55%)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                ticks={ticks}
                domain={[0, yMax]}
                tickFormatter={fmtTick}
                width={44}
              />
              <Tooltip
                cursor={{ stroke: "rgba(var(--biz-accent-rgb),0.35)", strokeWidth: 1 }}
                content={<ChartTooltip period={period} />}
              />
              {todayBucket && (
                <ReferenceLine
                  x={todayBucket.label}
                  stroke="rgba(var(--biz-accent-rgb),0.55)"
                  strokeDasharray="3 3"
                  label={{
                    value: "Today",
                    position: "top",
                    fill: "rgba(var(--biz-accent-rgb),0.95)",
                    fontSize: 10,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke="rgb(var(--biz-accent-rgb))"
                strokeWidth={2.25}
                fill="url(#schedValGrad)"
                filter="url(#schedValGlow)"
                animationDuration={600}
                animationEasing="ease-out"
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: "rgb(var(--biz-accent-rgb))",
                  strokeWidth: 2,
                  fill: "#0a0f0a",
                }}
              />
              {peakLabel && peak && peak.value > 0 && (
                <ReferenceDot
                  x={peakLabel}
                  y={peak.value}
                  r={6}
                  fill="rgb(var(--biz-accent-rgb))"
                  stroke="rgba(var(--biz-accent-rgb),0.35)"
                  strokeWidth={6}
                  isFront
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {isOwner && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowDebug((v) => !v)}
            className="font-body uppercase tracking-wider"
            style={{ fontSize: 10, color: "hsl(220 8% 55%)" }}
          >
            {showDebug ? "Hide" : "View"} graph data
          </button>
          {showDebug && (
            <div
              className="mt-2 rounded-md p-2 max-h-80 overflow-auto font-mono"
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.85)",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ color: "hsl(220 8% 60%)", marginBottom: 6 }}>
                {period === "week" ? "Week" : "Month"} {format(start, "yyyy-MM-dd")} → {format(end, "yyyy-MM-dd")} · KPI Jobs {summary.jobCount} · KPI Revenue {fmtMoney(summary.revenueTotal)} · Graph jobs {graphJobCount} · Graph total {fmtMoney(visibleGraphTotal)}
                {isLoading ? " · loading…" : ""}
              </div>
              {buckets.map((b) => (
                <div
                  key={b.date}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    padding: "4px 0",
                  }}
                >
                  <div style={{ color: "#fff" }}>
                    {b.date} ({b.label}) — daily total {fmtMoney(b.value)} — {b.jobs.length} jobs
                  </div>
                  {b.jobs.map((j) => (
                    <div
                      key={`${j.job_id}-${j.visit_id ?? "job"}`}
                      style={{ paddingLeft: 12, color: "hsl(220 8% 65%)" }}
                    >
                      • job_id {j.job_id} · visit_id {j.visit_id ?? "—"} · customer {j.client_name ?? "—"}
                      {j.title ? ` · ${j.title}` : ""} · scheduled_start {j.scheduled_start} · amount counted {fmtMoney(j.amount)} · {j.source}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function StatsStrip({
  stats,
  period,
}: {
  stats: {
    total: number;
    avgPerDay: number;
    busiest: DayBucket | null;
    deltaPct: number | null;
    priorTotal: number;
  };
  period: Period;
}) {
  const showDelta = stats.deltaPct !== null && Number.isFinite(stats.deltaPct);
  const up = (stats.deltaPct ?? 0) >= 0;
  const items: Array<{ label: string; value: string; tone?: "accent" }> = [
    { label: "Total scheduled", value: fmtMoney(stats.total), tone: "accent" },
    { label: "Avg / day", value: fmtMoney(stats.avgPerDay) },
    {
      label: "Busiest day",
      value:
        stats.busiest && stats.busiest.value > 0
          ? `${stats.busiest.label} · ${fmtMoney(stats.busiest.value)}`
          : "—",
    },
  ];
  if (showDelta) {
    items.push({
      label: period === "week" ? "vs last week" : "vs last month",
      value: `${up ? "▲" : "▼"} ${Math.abs(stats.deltaPct as number).toFixed(0)}%`,
    });
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {items.map((it) => {
        const isDelta = it.label.startsWith("vs ");
        const valueColor = it.tone === "accent"
          ? "rgb(var(--biz-accent-rgb))"
          : isDelta
            ? up
              ? "rgb(var(--biz-accent-rgb))"
              : "#ef4444"
            : "#fff";
        return (
          <div
            key={it.label}
            className="rounded-xl px-3 py-2"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(var(--biz-accent-rgb),0.10)",
            }}
          >
            <div
              className="font-body uppercase tracking-wider"
              style={{ fontSize: 9, color: "hsl(220 8% 55%)" }}
            >
              {it.label}
            </div>
            <div
              className="font-display font-semibold"
              style={{ fontSize: 14, color: valueColor, marginTop: 2 }}
            >
              {it.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  period,
}: {
  active?: boolean;
  payload?: Array<{ payload: DayBucket; value: number }>;
  period: Period;
}) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  const d = new Date(p.date + "T00:00:00");
  const dateLabel =
    period === "week" ? format(d, "EEE, MMM d") : format(d, "MMM d");
  return (
    <div
      style={{
        background: "rgba(10,12,14,0.96)",
        border: "1px solid rgba(var(--biz-accent-rgb),0.35)",
        borderRadius: 10,
        padding: "8px 10px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ fontSize: 11, color: "hsl(220 8% 65%)" }}>{dateLabel}</div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "rgb(var(--biz-accent-rgb))",
          marginTop: 2,
        }}
      >
        Scheduled: {fmtMoney(p.value)}
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="absolute inset-0 rounded-xl overflow-hidden"
      style={{
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(var(--biz-accent-rgb),0.06) 50%, rgba(255,255,255,0.02) 100%)",
        backgroundSize: "200% 100%",
        animation: "schedShimmer 1.4s ease-in-out infinite",
      }}
    >
      <style>{`@keyframes schedShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

function EmptyState({ period }: { period: Period }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
      <div
        className="rounded-full p-3"
        style={{
          background: "rgba(var(--biz-accent-rgb),0.08)",
          border: "1px solid rgba(var(--biz-accent-rgb),0.18)",
        }}
      >
        <CalendarDays size={20} color="rgb(var(--biz-accent-rgb))" />
      </div>
      <div className="font-body" style={{ fontSize: 12, color: "hsl(220 8% 60%)" }}>
        No jobs scheduled this {period === "week" ? "week" : "month"} yet
      </div>
    </div>
  );
}
