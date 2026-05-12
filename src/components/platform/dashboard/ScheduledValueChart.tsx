import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { SectionCard, fmtMoney } from "./primitives";
import { addDays, startOfDay, endOfDay, format } from "date-fns";
import { useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
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
const EXCLUDED_STATUSES = new Set(["archived", "canceled", "cancelled", "deleted"]);

export default function ScheduledValueChart() {
  const { selectedBusinessId, userId, loading } = usePlatformAuth();
  const { isOwner } = useUserRole();
  const [showDebug, setShowDebug] = useState(false);
  const ready = !loading && !!userId && !!selectedBusinessId;

  const start = startOfDay(new Date());
  const end = endOfDay(addDays(start, DAYS - 1));

  const q = useQuery({
    queryKey: [
      "dash-scheduled-value-chart",
      selectedBusinessId,
      start.toISOString().slice(0, 10),
    ],
    enabled: ready,
    queryFn: async () => {
      // Mirror PlatformSchedule query exactly: jobber_jobs, scheduled_start NOT NULL,
      // scoped by business_id, no status pre-filter (apply exclusions client-side).
      const { data } = await supabase
        .from("jobber_jobs")
        .select("id, job_number, client_name, scheduled_start, total_amount, status, visit_status")
        .eq("business_id", selectedBusinessId!)
        .not("scheduled_start", "is", null)
        .gte("scheduled_start", start.toISOString())
        .lte("scheduled_start", end.toISOString())
        .order("scheduled_start", { ascending: true });

      const buckets = new Map<string, { value: number; jobs: Array<{ id: string; job_number: string | null; client_name: string | null; scheduled_start: string; amount: number }> }>();
      for (let i = 0; i < DAYS; i++) {
        const d = addDays(start, i);
        buckets.set(format(d, "yyyy-MM-dd"), { value: 0, jobs: [] });
      }
      const seen = new Set<string>();
      for (const row of data ?? []) {
        if (!row.scheduled_start) continue;
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        const status = (row.status || "").toLowerCase();
        const vstatus = (row.visit_status || "").toLowerCase();
        if (EXCLUDED_STATUSES.has(status) || EXCLUDED_STATUSES.has(vstatus)) continue;
        const key = format(new Date(row.scheduled_start), "yyyy-MM-dd");
        const bucket = buckets.get(key);
        if (!bucket) continue;
        const amount = Number(row.total_amount || 0);
        bucket.value += amount;
        bucket.jobs.push({
          id: row.id,
          job_number: row.job_number,
          client_name: row.client_name,
          scheduled_start: row.scheduled_start,
          amount,
        });
      }
      return Array.from(buckets.entries()).map(([date, b]) => ({
        date,
        label: format(new Date(date + "T00:00:00"), "EEE"),
        value: Math.round(b.value),
        jobs: b.jobs,
      }));
    },
  });

  const rows = q.data ?? [];
  const total = rows.reduce((s, r) => s + r.value, 0);

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
  const staleMins = lastSync ? Math.round((Date.now() - new Date(lastSync).getTime()) / 60000) : null;
  const isStale = staleMins === null || staleMins > 120;

  return (
    <SectionCard
      title="Scheduled Job Value"
      subtitle={`Next ${DAYS} days · ${fmtMoney(total)} total`}
    >
      {isStale && (
        <div
          className="rounded-md px-3 py-2 font-body"
          style={{
            fontSize: 12,
            color: "#f59e0b",
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.30)",
          }}
        >
          Jobber sync is stale. Graph may be outdated.
        </div>
      )}
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <AreaChart
            data={rows}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <defs>
              <linearGradient id="schedValGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="rgba(var(--biz-accent-rgb),0.55)"
                />
                <stop
                  offset="100%"
                  stopColor="rgba(var(--biz-accent-rgb),0)"
                />
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
              tickFormatter={(v) =>
                v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
              }
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
                const d = p?.[0]?.payload?.date;
                return d ? format(new Date(d), "EEE, MMM d") : "";
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
            onClick={() => setShowDebug((v) => !v)}
            className="font-body uppercase tracking-wider"
            style={{ fontSize: 10, color: "hsl(220 8% 55%)" }}
          >
            {showDebug ? "Hide" : "View"} graph data
          </button>
          {showDebug && (
            <div
              className="mt-2 rounded-md p-2 max-h-72 overflow-auto font-mono"
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.85)",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {rows.map((r) => (
                <div key={r.date} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "4px 0" }}>
                  <div style={{ color: "#fff" }}>
                    {r.date} ({r.label}) — {r.jobs.length} jobs — {fmtMoney(r.value)}
                  </div>
                  {r.jobs.map((j) => (
                    <div key={j.id} style={{ paddingLeft: 12, color: "hsl(220 8% 65%)" }}>
                      • {j.job_number ?? j.id.slice(0, 8)} — {j.client_name ?? "—"} — {format(new Date(j.scheduled_start), "p")} — {fmtMoney(j.amount)}
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
