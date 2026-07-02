import { useEffect, useMemo, useRef, useState } from "react";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useDashboardScheduledJobs } from "@/hooks/useDashboardScheduledJobs";
import { SectionCard, fmtMoney } from "./primitives";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
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
  Customized,
} from "recharts";
import { CalendarDays } from "lucide-react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

function useCountUp(value: number, resetKey: string | number): number {
  const [n, setN] = useState<number>(value);
  const fromRef = useRef<number>(0);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setN(to);
      return;
    }
    const dur = 800;
    const startTs = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTs) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = from + (to - from) * eased;
      if (t >= 1) {
        setN(to);
        fromRef.current = to;
        return;
      }
      setN(cur);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, resetKey]);
  // restart from 0 whenever the resetKey changes (period toggle / first mount)
  useEffect(() => {
    fromRef.current = 0;
    setN(0);
  }, [resetKey]);
  return n;
}

export default function ScheduledValueChart() {
  const { selectedBusinessId } = usePlatformAuth();
  const { isOwner } = useUserRole();
  const [showDebug, setShowDebug] = useState(false);
  const [period, setPeriod] = useState<Period>("week");
  const ready = !!selectedBusinessId;

  // Intro / morph choreography ---------------------------------
  // Mount count drives odometer replay + intro-only layers.
  const mountedAtRef = useRef<number>(0);
  if (mountedAtRef.current === 0) mountedAtRef.current = performance.now();
  const [introPlayed, setIntroPlayed] = useState<boolean>(() =>
    prefersReducedMotion(),
  );
  const [toggleTick, setToggleTick] = useState(0);
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (introPlayed) return;
    const t = window.setTimeout(() => setIntroPlayed(true), 1600);
    return () => window.clearTimeout(t);
  }, [introPlayed]);

  // Bloom pulse (0..1) — 1 on mount, bumped on period toggle
  const [bloomKey, setBloomKey] = useState(0);

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

  const priorBuckets = useMemo<number[]>(() => {
    const days = eachDayOfInterval({ start: prevStart, end: prevEnd });
    const map = new Map<string, number>();
    for (const d of days) map.set(format(d, "yyyy-MM-dd"), 0);
    for (const j of prior.jobs ?? []) {
      const key = j.scheduled_local_date;
      if (!map.has(key)) continue;
      map.set(key, (map.get(key) ?? 0) + j.amount_counted);
    }
    return Array.from(map.values()).map((v) => Math.round(v));
  }, [prior.jobs, prevStart, prevEnd]);

  const chartData = useMemo(
    () =>
      buckets.map((b, i) => ({
        ...b,
        prior: priorBuckets[i] ?? null,
      })),
    [buckets, priorBuckets],
  );

  const hasPrior = priorBuckets.some((v) => v > 0);

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

  const ticks = niceTicks(
    Math.max(...buckets.map((b) => b.value), ...priorBuckets, 0),
  );
  const yMax = ticks[ticks.length - 1] ?? 0;

  const title =
    period === "week"
      ? "Scheduled Job Value This Week"
      : "Scheduled Job Value This Month";
  const animHeadline = useCountUp(visibleGraphTotal, period);
  const animTotal = useCountUp(stats.total, period);
  const animAvg = useCountUp(stats.avgPerDay, period);
  const subtitle = `${period === "week" ? "This week" : "This month"} · ${fmtMoney(Math.round(animHeadline))} total`;

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
  const peakIndex = peak
    ? buckets.findIndex((b) => b.date === peak.date && peak.value > 0)
    : -1;

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
            onClick={() => {
              if (period === p) return;
              setPeriod(p);
              setToggleTick((n) => n + 1);
              setBloomKey((n) => n + 1);
            }}
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

  // Odometer subtitle — headline total rolls into place
  const subtitleNode = (
    <span
      className="font-body"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        color: "hsl(220 8% 50%)",
      }}
    >
      {period === "week" ? "This week" : "This month"} · $
      <Odometer
        value={Math.max(0, visibleGraphTotal)}
        fontSize={11}
        color="hsl(220 8% 50%)"
        playKey={`${toggleTick}-${period}`}
      />{" "}
      total
    </span>
  );

  // Points for touch-scrub (from the DOM after mount)
  const [scrubPoints, setScrubPoints] = useState<Array<{ x: number; y: number }>>(
    [],
  );
  useEffect(() => {
    if (showEmpty || showSkeleton) {
      setScrubPoints([]);
      return;
    }
    const container = plotRef.current;
    if (!container) return;
    // Read the rendered CORE line points after the intro settles
    let raf1 = 0;
    let raf2 = 0;
    const read = () => {
      const paths = container.querySelectorAll<SVGPathElement>(
        ".recharts-area-curve",
      );
      const path = paths[paths.length - 1];
      if (!path) return;
      const total = path.getTotalLength();
      if (!(total > 0)) return;
      const n = Math.max(2, buckets.length);
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < n; i++) {
        const p = path.getPointAtLength((i / (n - 1)) * total);
        pts.push({ x: p.x, y: p.y });
      }
      setScrubPoints(pts);
    };
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(read);
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [buckets.length, showEmpty, showSkeleton, period, toggleTick]);

  return (
    <SectionCard title={title} subtitle={subtitleNode} action={toggle}>
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
      <StatsStrip
        stats={stats}
        period={period}
        animTotal={Math.round(animTotal)}
        animAvg={Math.round(animAvg)}
      />
      <div
        ref={plotRef}
        className="rounded-xl overflow-hidden"
        style={{
          width: "100%",
          height: 220,
          position: "relative",
          background:
            "radial-gradient(120% 90% at 50% 110%, rgba(var(--biz-accent-rgb),0.12) 0%, rgba(var(--biz-accent-rgb),0.04) 35%, rgba(0,0,0,0) 65%), radial-gradient(140% 100% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%), #05070a",
          border: "1px solid rgba(var(--biz-accent-rgb),0.10)",
          boxShadow:
            "inset 0 0 0 1px rgba(var(--biz-accent-rgb),0.05), inset 0 0 40px rgba(var(--biz-accent-rgb),0.05)",
        }}
      >
        {/* Ambient orbs — extremely slow, transform-only, low opacity */}
        <div
          aria-hidden
          className="sched-orb sched-orb-1"
          style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}
        />
        <div
          aria-hidden
          className="sched-orb sched-orb-2"
          style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}
        />
        <div
          aria-hidden
          className="sched-orb sched-orb-3"
          style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}
        />
        <style>{`
          /* ---------- NEW intro / ambient / interaction layers ---------- */
          @keyframes schedGridSweep {
            from { transform: scaleX(0); opacity: 0; }
            to   { transform: scaleX(1); opacity: 1; }
          }
          .sched-chart-mount .recharts-cartesian-grid-horizontal line {
            transform-origin: left center;
            animation: schedGridSweep 260ms cubic-bezier(0.22,1,0.36,1) both;
          }
          .sched-chart-mount .recharts-cartesian-grid-horizontal line:nth-child(1)  { animation-delay: 0ms; }
          .sched-chart-mount .recharts-cartesian-grid-horizontal line:nth-child(2)  { animation-delay: 40ms; }
          .sched-chart-mount .recharts-cartesian-grid-horizontal line:nth-child(3)  { animation-delay: 80ms; }
          .sched-chart-mount .recharts-cartesian-grid-horizontal line:nth-child(4)  { animation-delay: 120ms; }
          .sched-chart-mount .recharts-cartesian-grid-horizontal line:nth-child(5)  { animation-delay: 160ms; }
          .sched-chart-mount .recharts-cartesian-grid-horizontal line:nth-child(6)  { animation-delay: 200ms; }
          .sched-chart-mount .recharts-cartesian-grid-vertical line {
            opacity: 0;
            animation: schedGridSweep 260ms cubic-bezier(0.22,1,0.36,1) 220ms both;
            transform-origin: center top;
          }
          @keyframes schedAxisRise {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .sched-chart-mount .recharts-cartesian-axis-tick {
            animation: schedAxisRise 260ms ease-out 120ms both;
          }
          /* Ghost prior-period line sketches in faintly */
          @keyframes schedGhostIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          .sched-chart-mount .recharts-area:nth-of-type(1) .recharts-area-curve {
            animation: schedGhostIn 500ms ease-out 150ms both;
          }
          /* Milestone shockwave ring */
          @keyframes schedShockwave {
            0%   { r: 4;  opacity: 0.85; stroke-width: 2; }
            60%  { opacity: 0.55; }
            100% { r: 26; opacity: 0; stroke-width: 0.6; }
          }
          .sched-shockwave {
            animation: schedShockwave 450ms cubic-bezier(0.22,1,0.36,1) forwards;
          }
          /* Lake reflection fade in */
          @keyframes schedReflectionIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          .sched-reflection {
            animation: schedReflectionIn 300ms ease-out 1050ms both;
          }
          /* Ambient orbs — transform + opacity only, glacially slow */
          .sched-orb {
            background: radial-gradient(closest-side, rgba(var(--biz-accent-rgb),0.14), rgba(var(--biz-accent-rgb),0) 70%);
            filter: blur(30px);
            will-change: transform, opacity;
          }
          .sched-orb-1 {
            transform: translate3d(-15%, 20%, 0) scale(1);
            animation: schedOrb1 78s ease-in-out infinite;
            opacity: 0.08;
          }
          .sched-orb-2 {
            transform: translate3d(60%, -10%, 0) scale(0.9);
            animation: schedOrb2 92s ease-in-out infinite;
            opacity: 0.06;
          }
          .sched-orb-3 {
            transform: translate3d(30%, 60%, 0) scale(1.1);
            animation: schedOrb3 66s ease-in-out infinite;
            opacity: 0.05;
          }
          @keyframes schedOrb1 {
            0%,100% { transform: translate3d(-15%, 20%, 0) scale(1); }
            50%     { transform: translate3d(10%, 5%, 0) scale(1.15); }
          }
          @keyframes schedOrb2 {
            0%,100% { transform: translate3d(60%, -10%, 0) scale(0.9); }
            50%     { transform: translate3d(35%, 25%, 0) scale(1.05); }
          }
          @keyframes schedOrb3 {
            0%,100% { transform: translate3d(30%, 60%, 0) scale(1.1); }
            50%     { transform: translate3d(55%, 40%, 0) scale(0.95); }
          }
          /* Bloom pulse — retriggered by data-bloom attr change */
          @keyframes schedBloomPulse {
            0%   { opacity: 0.4; }
            60%  { opacity: 1;   }
            100% { opacity: 1;   }
          }
          .sched-chart-mount .recharts-area-area {
            animation: schedAreaFade 320ms ease-out 800ms both,
                       schedBloomPulse 300ms ease-out both;
          }
          /* ---------- existing layers ---------- */
          @keyframes schedPeakPulse {
            0%, 100% { transform: scale(1); opacity: 0.55; }
            50% { transform: scale(1.8); opacity: 0.05; }
          }
          .sched-peak-pulse {
            transform-origin: center;
            transform-box: fill-box;
            animation: schedPeakPulse 2s ease-in-out infinite;
          }
          @keyframes schedTodayPulse {
            0%, 100% { transform: scale(1); opacity: 0.45; }
            50% { transform: scale(2.2); opacity: 0; }
          }
          .sched-today-pulse {
            transform-origin: center;
            transform-box: fill-box;
            animation: schedTodayPulse 2.4s ease-in-out infinite;
          }
          @keyframes schedAreaFade {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .sched-chart-mount {
            animation: schedAreaFade 900ms ease-out both;
          }
          /* Area gradient fade-in: reveals AFTER the line finishes drawing (~800ms) */
          .sched-chart-mount .recharts-area-area {
            animation: schedAreaFade 320ms ease-out 800ms both;
          }
          @keyframes schedTileRise {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .sched-stat-tile {
            opacity: 0;
            animation: schedTileRise 420ms ease-out both;
          }
          @keyframes schedBreath {
            0%, 100% { opacity: 0.82; }
            50% { opacity: 1; }
          }
          .sched-breath-aura { animation: schedBreath 3.6s ease-in-out infinite; transform-origin: center; }
          .sched-breath-mid { animation: schedBreath 3.6s ease-in-out infinite; animation-delay: -0.4s; }
          @keyframes schedCometFade {
            0% { opacity: 0; }
            8% { opacity: 1; }
            85% { opacity: 1; }
            100% { opacity: 0; }
          }
          @keyframes schedLiveCursor {
            0%, 100% { opacity: 0.85; }
            50% { opacity: 1; }
          }
          /* Smooth Recharts tooltip movement */
          .sched-chart-mount .recharts-tooltip-wrapper {
            transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1),
                        left 160ms cubic-bezier(0.22, 1, 0.36, 1),
                        top 160ms cubic-bezier(0.22, 1, 0.36, 1) !important;
          }
          @media (prefers-reduced-motion: reduce) {
            .sched-peak-pulse,
            .sched-today-pulse,
            .sched-breath-aura,
            .sched-breath-mid,
            .sched-chart-mount,
            .sched-chart-mount .recharts-area-area,
            .sched-stat-tile,
            .sched-chart-mount .recharts-cartesian-grid-horizontal line,
            .sched-chart-mount .recharts-cartesian-grid-vertical line,
            .sched-chart-mount .recharts-cartesian-axis-tick,
            .sched-chart-mount .recharts-area:nth-of-type(1) .recharts-area-curve,
            .sched-reflection,
            .sched-shockwave,
            .sched-orb,
            .sched-orb-1,
            .sched-orb-2,
            .sched-orb-3 {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
            }
            .sched-chart-mount .recharts-tooltip-wrapper {
              transition: none !important;
            }
          }
        `}</style>
        {showSkeleton && <ChartSkeleton />}
        {showEmpty && !showSkeleton && (
          <EmptyState period={period} />
        )}
        {!showEmpty && !showSkeleton && (
          <ResponsiveContainer
            className="sched-chart-mount"
            data-bloom={bloomKey}
          >
            <AreaChart
              data={chartData}
              margin={{ top: 12, right: 12, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="schedValGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(var(--biz-accent-rgb),0.50)" />
                  <stop offset="45%" stopColor="rgba(var(--biz-accent-rgb),0.18)" />
                  <stop offset="100%" stopColor="rgba(var(--biz-accent-rgb),0)" />
                </linearGradient>
                {/* Vertical fade mask for the mirrored reflection */}
                <linearGradient id="schedReflectionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#fff" stopOpacity="1" />
                  <stop offset="80%" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <mask id="schedReflectionMask" maskUnits="userSpaceOnUse">
                  <rect x="0" y="0" width="100%" height="100%" fill="url(#schedReflectionGrad)" />
                </mask>
                <filter id="schedAuraBlur" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="7" />
                </filter>
                <filter id="schedMidBlur" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
                <filter id="schedCoreGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="0.6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="schedSheen" x1="-0.25" y1="0" x2="0.05" y2="0">
                  <stop offset="0%" stopColor="rgb(var(--biz-accent-rgb))" stopOpacity="1" />
                  <stop offset="40%" stopColor="rgb(var(--biz-accent-rgb))" stopOpacity="1" />
                  <stop offset="46%" stopColor="rgba(255,255,255,0.55)" stopOpacity="1" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.95)" stopOpacity="1" />
                  <stop offset="54%" stopColor="rgba(255,255,255,0.55)" stopOpacity="1" />
                  <stop offset="60%" stopColor="rgb(var(--biz-accent-rgb))" stopOpacity="1" />
                  <stop offset="100%" stopColor="rgb(var(--biz-accent-rgb))" stopOpacity="1" />
                  <animate
                    attributeName="x1"
                    values="-0.25;1;-0.25"
                    dur="3.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="x2"
                    values="0.05;1.3;0.05"
                    dur="3.5s"
                    repeatCount="indefinite"
                  />
                </linearGradient>
              </defs>
              {/* Lake reflection under the baseline */}
              <Customized component={ReflectionOverlay as never} />
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="rgba(255,255,255,0.05)"
                vertical
                horizontal
              />
              <XAxis
                dataKey="label"
                tick={{
                  fill: "hsl(220 8% 55%)",
                  fontSize: 9,
                  letterSpacing: 1.5,
                }}
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
                tick={{
                  fill: "hsl(220 8% 55%)",
                  fontSize: 9,
                  letterSpacing: 1,
                }}
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
                animationDuration={180}
                animationEasing="ease-out"
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
              {todayBucket && (
                <ReferenceDot
                  x={todayBucket.label}
                  y={todayBucket.value}
                  r={4}
                  isFront
                  shape={(props: { cx?: number; cy?: number }) => {
                    const cx = props.cx ?? 0;
                    const cy = props.cy ?? 0;
                    return (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={10}
                          fill="rgb(var(--biz-accent-rgb))"
                          className="sched-today-pulse"
                        />
                      </g>
                    );
                  }}
                />
              )}
              {/* GHOST prior-period comparison line — behind everything, no fill, dashed */}
              {hasPrior && (
                <Area
                  type="monotone"
                  dataKey="prior"
                  stroke="rgba(var(--biz-accent-rgb),0.22)"
                  strokeWidth={1.25}
                  strokeDasharray="3 4"
                  fill="none"
                  isAnimationActive={false}
                  dot={false}
                  activeDot={false}
                  legendType="none"
                  connectNulls={false}
                />
              )}
              {/* AURA underlay — thick, heavy blur, no fill */}
              <Area
                type="monotone"
                dataKey="value"
                stroke="rgba(var(--biz-accent-rgb),0.45)"
                strokeWidth={10}
                fill="none"
                filter="url(#schedAuraBlur)"
                animationDuration={800}
                animationEasing="ease-out"
                isAnimationActive
                dot={false}
                activeDot={false}
                legendType="none"
                className="sched-breath-aura"
              />
              {/* MID glow */}
              <Area
                type="monotone"
                dataKey="value"
                stroke="rgba(var(--biz-accent-rgb),0.8)"
                strokeWidth={4}
                fill="url(#schedValGrad)"
                filter="url(#schedMidBlur)"
                animationDuration={800}
                animationEasing="ease-out"
                isAnimationActive
                dot={false}
                activeDot={false}
                legendType="none"
                className="sched-breath-mid"
              />
              {/* CORE line — crisp, with traveling sheen */}
              <Area
                type="monotone"
                dataKey="value"
                stroke="url(#schedSheen)"
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                filter="url(#schedCoreGlow)"
                animationDuration={800}
                animationEasing="ease-out"
                isAnimationActive
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: "rgba(255,255,255,0.9)",
                  strokeWidth: 2,
                  fill: "rgb(var(--biz-accent-rgb))",
                }}
              />
              {/* Comet draw-head + live cursor — uses real rendered points */}
              {!introPlayed && <Customized component={CometOverlay as never} />}
              {peakLabel && peak && peak.value > 0 && (
                <ReferenceDot
                  x={peakLabel}
                  y={peak.value}
                  r={4}
                  isFront
                  shape={(props: { cx?: number; cy?: number }) => {
                    const cx = props.cx ?? 0;
                    const cy = props.cy ?? 0;
                    return (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={11}
                          fill="rgb(var(--biz-accent-rgb))"
                          className="sched-peak-pulse"
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="rgb(var(--biz-accent-rgb))"
                          stroke="rgba(255,255,255,0.85)"
                          strokeWidth={1}
                        />
                      </g>
                    );
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
        {!showEmpty && !showSkeleton && (
          <ParticleLayer
            containerRef={plotRef}
            playKey={bloomKey}
            peakIndex={peakIndex}
            totalPoints={buckets.length}
            enabled={!introPlayed}
          />
        )}
        {!showEmpty && !showSkeleton && (
          <TouchScrubLayer containerRef={plotRef} points={scrubPoints} />
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
  animTotal,
  animAvg,
}: {
  stats: {
    total: number;
    avgPerDay: number;
    busiest: DayBucket | null;
    deltaPct: number | null;
    priorTotal: number;
  };
  period: Period;
  animTotal: number;
  animAvg: number;
}) {
  const showDelta = stats.deltaPct !== null && Number.isFinite(stats.deltaPct);
  const up = (stats.deltaPct ?? 0) >= 0;
  const items: Array<{ label: string; value: string; tone?: "accent" }> = [
    { label: "Total scheduled", value: fmtMoney(animTotal), tone: "accent" },
    { label: "Avg / day", value: fmtMoney(animAvg) },
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
      {items.map((it, idx) => {
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
            className="rounded-xl px-3 py-2 sched-stat-tile"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(var(--biz-accent-rgb),0.10)",
              animationDelay: `${idx * 80}ms`,
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

type CometOverlayProps = {
  formattedGraphicalItems?: Array<{
    props?: { points?: Array<{ x: number; y: number }>; dataKey?: string };
    item?: { props?: { dataKey?: string } };
  }>;
};

function CometOverlay(props: CometOverlayProps) {
  const items = props.formattedGraphicalItems ?? [];
  // Find the CORE line (dataKey="value"). Recharts may expose dataKey on item.props.
  const valueItems = items.filter((it) => {
    const k = it.item?.props?.dataKey ?? it.props?.dataKey;
    return k === "value";
  });
  const target = valueItems[valueItems.length - 1] ?? items[items.length - 1];
  const points = target?.props?.points ?? [];
  const cleaned = points.filter(
    (p) => Number.isFinite(p?.x) && Number.isFinite(p?.y),
  );
  if (cleaned.length < 2) return null;
  const d = cleaned
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const pathId = `schedCometPath-${cleaned.length}-${Math.round(cleaned[0].x)}-${Math.round(cleaned[cleaned.length - 1].x)}`;
  const last = cleaned[cleaned.length - 1];
  return (
    <g style={{ pointerEvents: "none" }}>
      <path id={pathId} d={d} fill="none" stroke="none" />
      {/* Comet outer halo */}
      <circle
        r={7}
        fill="rgb(var(--biz-accent-rgb))"
        opacity={0.55}
        filter="url(#schedAuraBlur)"
        style={{ animation: "schedCometFade 900ms ease-out both" }}
      >
        <animateMotion dur="800ms" repeatCount="1" fill="freeze" begin="0s">
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
      {/* Comet bright core */}
      <circle
        r={3}
        fill="rgba(255,255,255,0.95)"
        style={{ animation: "schedCometFade 900ms ease-out both" }}
      >
        <animateMotion dur="800ms" repeatCount="1" fill="freeze" begin="0s">
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
      {/* Live cursor — steady glow on the most recent point, fades in after comet lands */}
      <g
        style={{
          opacity: 0,
          animation:
            "schedCometFade 500ms ease-out 800ms forwards, schedLiveCursor 2.4s ease-in-out 1400ms infinite",
        }}
      >
        <circle
          cx={last.x}
          cy={last.y}
          r={6}
          fill="rgb(var(--biz-accent-rgb))"
          opacity={0.45}
          filter="url(#schedMidBlur)"
        />
        <circle
          cx={last.x}
          cy={last.y}
          r={2.75}
          fill="rgb(var(--biz-accent-rgb))"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={1}
        />
      </g>
    </g>
  );
}

// ============================================================
// NEW: Reflection layer — mirrored copy of the core line under
// the baseline with a vertical gradient mask + reduced opacity.
// Rendered via <Customized> so it sits inside the recharts SVG
// and has access to the plot offset (baseline y).
// ============================================================
type ReflectionOverlayProps = CometOverlayProps & {
  offset?: { top?: number; left?: number; width?: number; height?: number };
};
function ReflectionOverlay(props: ReflectionOverlayProps) {
  const items = props.formattedGraphicalItems ?? [];
  const valueItems = items.filter((it) => {
    const k = it.item?.props?.dataKey ?? it.props?.dataKey;
    return k === "value";
  });
  const target = valueItems[valueItems.length - 1] ?? items[items.length - 1];
  const points = target?.props?.points ?? [];
  const cleaned = points.filter(
    (p) => Number.isFinite(p?.x) && Number.isFinite(p?.y),
  );
  if (cleaned.length < 2) return null;
  const offset = props.offset ?? {};
  const top = offset.top ?? 0;
  const height = offset.height ?? 0;
  const baseline = top + height; // y of x-axis
  const d = cleaned
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  return (
    <g
      className="sched-reflection"
      transform={`translate(0, ${baseline * 2}) scale(1, -1)`}
      style={{ pointerEvents: "none" }}
      mask="url(#schedReflectionMask)"
    >
      <path
        d={d}
        fill="none"
        stroke="rgb(var(--biz-accent-rgb))"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.12}
        filter="url(#schedMidBlur)"
      />
    </g>
  );
}

// ============================================================
// NEW: Odometer — each digit is a vertical strip that rolls
// into place. Non-digit chars (commas, $) don't roll.
// ============================================================
function Odometer({
  value,
  fontSize = 12,
  color = "hsl(220 8% 50%)",
  fontWeight = 400,
  playKey,
}: {
  value: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  // Increment to replay the roll (e.g. mount count, period toggle count)
  playKey: number | string;
}) {
  const reduce = useRef(prefersReducedMotion()).current;
  const str = fmtMoney(Math.round(value));
  // Two-phase render so the transition actually fires: start at 0, then
  // set the real digit on the next frame.
  const [armed, setArmed] = useState(reduce);
  useEffect(() => {
    if (reduce) {
      setArmed(true);
      return;
    }
    setArmed(false);
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => setArmed(true));
      return () => cancelAnimationFrame(r2);
    });
    return () => cancelAnimationFrame(r1);
  }, [playKey, str, reduce]);
  const chars = str.split("");
  // Delay so the roll finishes ~1050ms after mount, in sync with line draw.
  // Right-to-left stagger.
  return (
    <span
      key={playKey}
      className="tabular-nums"
      style={{
        display: "inline-flex",
        alignItems: "flex-end",
        lineHeight: 1,
        fontSize,
        color,
        fontWeight,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {chars.map((ch, i) => {
        if (!/\d/.test(ch)) {
          return (
            <span
              key={`${i}-${ch}`}
              style={{ display: "inline-block", lineHeight: 1 }}
            >
              {ch}
            </span>
          );
        }
        const digit = parseInt(ch, 10);
        // From right: last digit rolls first.
        const fromRight = chars.length - 1 - i;
        const delay = reduce ? 0 : Math.min(600, fromRight * 55);
        const target = armed ? digit : 0;
        return (
          <span
            key={`${i}-slot`}
            aria-hidden
            style={{
              display: "inline-block",
              height: `${fontSize}px`,
              lineHeight: `${fontSize}px`,
              overflow: "hidden",
              verticalAlign: "bottom",
            }}
          >
            <span
              style={{
                display: "block",
                transform: `translateY(-${target * fontSize}px)`,
                transition: reduce
                  ? "none"
                  : `transform 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
                willChange: "transform",
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <span
                  key={n}
                  style={{
                    display: "block",
                    height: `${fontSize}px`,
                    lineHeight: `${fontSize}px`,
                  }}
                >
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
      <span className="sr-only">{str}</span>
    </span>
  );
}

// ============================================================
// NEW: Particle canvas — samples the rendered SVG core-line
// path over the comet's 800ms timeline, emits spark particles
// at the moving head, fires a radial burst at the busiest day.
// Runs ONLY during the intro window (≤ 1600ms) + burst tail.
// ============================================================
function ParticleLayer({
  containerRef,
  playKey,
  peakIndex,
  totalPoints,
  enabled,
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  playKey: number;
  peakIndex: number;
  totalPoints: number;
  enabled: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ring, setRing] = useState<{ x: number; y: number; ts: number } | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) return;
    if (prefersReducedMotion()) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let raf = 0;
    let cleanupTimer = 0;

    // Wait one frame for recharts to render its paths, then grab the CORE line.
    const startId = requestAnimationFrame(() => {
      const paths = container.querySelectorAll<SVGPathElement>(
        ".recharts-area-curve",
      );
      const path = paths[paths.length - 1];
      if (!path) return;
      const totalLen = path.getTotalLength();
      if (!(totalLen > 0)) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      type P = {
        x: number;
        y: number;
        vx: number;
        vy: number;
        life: number;
        max: number;
        size: number;
        white: boolean;
      };
      const particles: P[] = [];
      const startTs = performance.now();
      const cometDur = 800;
      const peakT = totalPoints > 1 ? peakIndex / (totalPoints - 1) : 0;
      let burstFired = peakIndex < 0;
      let lastFrame = startTs;

      const tick = (now: number) => {
        const elapsed = now - startTs;
        const dt = Math.min(48, now - lastFrame);
        lastFrame = now;

        ctx.clearRect(0, 0, rect.width, rect.height);

        // Emit while comet is traveling
        if (elapsed <= cometDur) {
          const t = elapsed / cometDur;
          let head: DOMPoint | { x: number; y: number };
          try {
            head = path.getPointAtLength(t * totalLen);
          } catch {
            head = { x: 0, y: 0 };
          }
          const n = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n && particles.length < 60; i++) {
            particles.push({
              x: head.x + (Math.random() - 0.5) * 2,
              y: head.y + (Math.random() - 0.5) * 2,
              vx: (Math.random() - 0.5) * 0.6 - 0.15, // slight drift back
              vy: Math.random() * 0.25 + 0.05,
              life: 0,
              max: 500 + Math.random() * 200,
              size: 1.5 + Math.random() * 1.5,
              white: Math.random() < 0.45,
            });
          }

          if (!burstFired && t >= peakT) {
            burstFired = true;
            let pk: DOMPoint | { x: number; y: number };
            try {
              pk = path.getPointAtLength(peakT * totalLen);
            } catch {
              pk = head;
            }
            setRing({ x: pk.x, y: pk.y, ts: performance.now() });
            for (let i = 0; i < 12; i++) {
              const a = (i / 12) * Math.PI * 2;
              const speed = 1.1 + Math.random() * 0.6;
              particles.push({
                x: pk.x,
                y: pk.y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                life: 0,
                max: 550 + Math.random() * 200,
                size: 1.8 + Math.random() * 1.6,
                white: i % 3 === 0,
              });
            }
          }
        }

        // Update + draw
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life += dt;
          p.vy += 0.02; // mild gravity
          p.x += p.vx;
          p.y += p.vy;
          const alpha = Math.max(0, 1 - p.life / p.max);
          if (alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.white
            ? `rgba(255,255,255,${alpha.toFixed(3)})`
            : `rgba(0,200,83,${alpha.toFixed(3)})`;
          ctx.fill();
        }

        if (elapsed < 1650 || particles.length > 0) {
          raf = requestAnimationFrame(tick);
        } else {
          ctx.clearRect(0, 0, rect.width, rect.height);
        }
      };
      raf = requestAnimationFrame(tick);

      // Hard safety stop after 2s
      cleanupTimer = window.setTimeout(() => {
        cancelAnimationFrame(raf);
        ctx.clearRect(0, 0, rect.width, rect.height);
      }, 2200);
    });

    return () => {
      cancelAnimationFrame(startId);
      cancelAnimationFrame(raf);
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [containerRef, playKey, peakIndex, totalPoints, enabled]);

  // Auto-clear the ring after its CSS animation ends
  useEffect(() => {
    if (!ring) return;
    const t = window.setTimeout(() => setRing(null), 550);
    return () => window.clearTimeout(t);
  }, [ring]);

  if (!enabled) return null;
  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 3,
        }}
      />
      {ring && (
        <svg
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 4,
          }}
        >
          <circle
            cx={ring.x}
            cy={ring.y}
            r={4}
            fill="none"
            stroke="rgb(var(--biz-accent-rgb))"
            strokeWidth={2}
            className="sched-shockwave"
          />
        </svg>
      )}
    </>
  );
}

// ============================================================
// NEW: Touch scrub beam + magnetic dot. Uses rAF only while
// a pointer is actively pressed; cancels on release.
// ============================================================
function TouchScrubLayer({
  containerRef,
  points,
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  points: Array<{ x: number; y: number }>;
}) {
  const [beam, setBeam] = useState<{
    x: number;
    snapX: number;
    snapY: number;
  } | null>(null);
  const activeRef = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduce = prefersReducedMotion();

    const move = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      // ignore touches clearly outside the plot vertically
      if (clientY < rect.top - 20 || clientY > rect.bottom + 20) return;
      // find nearest data point
      let best = points[0];
      let bestD = Infinity;
      for (const p of points) {
        const d = Math.abs(p.x - x);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      if (!best) return;
      setBeam({ x, snapX: best.x, snapY: best.y });
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      activeRef.current = true;
      move(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => {
      if (!activeRef.current) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => move(e.clientX, e.clientY));
    };
    const onUp = () => {
      activeRef.current = false;
      cancelAnimationFrame(rafRef.current);
      setBeam(null);
    };
    container.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      container.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, points.length]);

  if (!beam) return null;
  const reduce = prefersReducedMotion();
  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      <defs>
        <linearGradient id="schedBeamGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(var(--biz-accent-rgb),0)" />
          <stop offset="50%" stopColor="rgba(var(--biz-accent-rgb),0.55)" />
          <stop offset="100%" stopColor="rgba(var(--biz-accent-rgb),0)" />
        </linearGradient>
      </defs>
      {/* soft glow band */}
      <rect
        x={beam.x - 6}
        y={0}
        width={12}
        height="100%"
        fill="url(#schedBeamGrad)"
        style={{
          transition: reduce ? "none" : "x 120ms linear",
          opacity: 0.9,
        }}
      />
      {/* crisp 1px core */}
      <line
        x1={beam.x}
        x2={beam.x}
        y1={0}
        y2="100%"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth={1}
        style={{ transition: reduce ? "none" : "x1 120ms linear, x2 120ms linear" }}
      />
      {/* magnetic snap dot */}
      <circle
        cx={beam.snapX}
        cy={beam.snapY}
        r={6}
        fill="rgb(var(--biz-accent-rgb))"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth={1.5}
        style={{
          transition: reduce
            ? "none"
            : "cx 160ms cubic-bezier(0.34, 1.56, 0.64, 1), cy 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          filter: "drop-shadow(0 0 6px rgba(0,200,83,0.65))",
        }}
      />
    </svg>
  );
}
