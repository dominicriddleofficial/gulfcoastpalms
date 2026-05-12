import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useScheduledJobs } from "@/hooks/useScheduledJobs";
import { SectionCard, fmtMoney } from "./primitives";
import { addDays, startOfDay, endOfDay, format } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const DAYS = 14;

type DayBucket = {
  date: string;
  label: string;
  value: number;
  jobs: Array<{
    id: string;
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

export default function ScheduledValueChart() {
  const { selectedBusinessId, userId, loading } = usePlatformAuth();
  const { isOwner } = useUserRole();
  const [showDebug, setShowDebug] = useState(false);
  const ready = !loading && !!userId && !!selectedBusinessId;

  const start = startOfDay(new Date());
  const end = endOfDay(addDays(start, DAYS - 1));

  const { data: jobs = [], isLoading } = useScheduledJobs({
    businessId: selectedBusinessId,
    startDate: start,
    endDate: end,
    enabled: ready,
  });

  const buckets = useMemo<DayBucket[]>(() => {
    const map = new Map<string, DayBucket>();
    for (let i = 0; i < DAYS; i++) {
      const d = addDays(start, i);
      const key = format(d, "yyyy-MM-dd");
      map.set(key, { date: key, label: format(d, "EEE"), value: 0, jobs: [] });
    }
    for (const j of jobs) {
      if (!j.scheduled_start) continue;
      const key = format(new Date(j.scheduled_start), "yyyy-MM-dd");
      const b = map.get(key);
      if (!b) continue;
      const amount = Number(j.total_amount ?? 0);
      b.value += amount;
      b.jobs.push({
        id: j.id,
        job_number: j.job_number,
        title: j.title,
        client_name: j.client_name,
        scheduled_start: j.scheduled_start,
        amount,
        source: "jobber_jobs",
      });
    }
    return Array.from(map.values()).map((b) => ({
      ...b,
      value: Math.round(b.value),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, start.getTime()]);

  const visibleGraphTotal = buckets.reduce((s, b) => s + b.value, 0);

  // Sync staleness
  const { data: lastSync } = useQuery({
    queryKey: ["dash-chart-last-sync"],
    enabled: ready,
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
  const { data: tokenExpired } = useQuery({
    queryKey: ["dash-chart-token-status"],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase
        .from("jobber_tokens")
        .select("expires_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data?.expires_at) return false;
      return new Date(data.expires_at).getTime() < Date.now();
    },
  });
  const staleMins = lastSync
    ? Math.round((Date.now() - new Date(lastSync).getTime()) / 60000)
    : null;
  const isStale = staleMins === null || staleMins > 120;

  const ticks = niceTicks(Math.max(...buckets.map((b) => b.value), 0));
  const yMax = ticks[ticks.length - 1] ?? 0;

  const subtitle = `Next ${DAYS} days · ${fmtMoney(visibleGraphTotal)} total`;

  return (
    <SectionCard title="Scheduled Job Value" subtitle={subtitle}>
      {tokenExpired && (
        <div
          className="rounded-md px-3 py-2 font-body"
          style={{
            fontSize: 12,
            color: "#ef4444",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.30)",
          }}
        >
          Jobber connection expired. Reconnect Jobber to refresh schedule data.
        </div>
      )}
      {!tokenExpired && isStale && (
        <div
          className="rounded-md px-3 py-2 font-body"
          style={{
            fontSize: 12,
            color: "#f59e0b",
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.30)",
          }}
        >
          Jobber sync is stale. Graph shows last synced schedule data.
        </div>
      )}
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <AreaChart
            data={buckets}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <defs>
              <linearGradient id="schedValGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(var(--biz-accent-rgb),0.55)" />
                <stop offset="100%" stopColor="rgba(var(--biz-accent-rgb),0)" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "hsl(220 8% 55%)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(220 8% 55%)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              ticks={ticks}
              domain={[0, yMax]}
              tickFormatter={fmtTick}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(10,12,14,0.95)",
                border: "1px solid rgba(var(--biz-accent-rgb),0.25)",
                borderRadius: 10,
                fontSize: 12,
                color: "#fff",
              }}
              formatter={(v: number) => [fmtMoney(v), "Scheduled"]}
              labelFormatter={(_l, p) => {
                const d = (p?.[0]?.payload as DayBucket | undefined)?.date;
                return d ? format(new Date(d + "T00:00:00"), "EEE, MMM d") : "";
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="rgba(var(--biz-accent-rgb),0.95)"
              strokeWidth={2}
              fill="url(#schedValGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
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
                {jobs.length} scheduled rows · graph total {fmtMoney(visibleGraphTotal)}
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
                    {b.date} ({b.label}) — {b.jobs.length} jobs — {fmtMoney(b.value)}
                  </div>
                  {b.jobs.map((j) => (
                    <div
                      key={j.id}
                      style={{ paddingLeft: 12, color: "hsl(220 8% 65%)" }}
                    >
                      • {j.job_number ?? j.id.slice(0, 8)} — {j.client_name ?? "—"}
                      {j.title ? ` — ${j.title}` : ""} —{" "}
                      {format(new Date(j.scheduled_start), "p")} —{" "}
                      {fmtMoney(j.amount)} · {j.source}
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
