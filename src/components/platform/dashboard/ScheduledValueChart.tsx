import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { SectionCard, fmtMoney } from "./primitives";
import { addDays, startOfDay, format } from "date-fns";
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

export default function ScheduledValueChart() {
  const { selectedBusinessId, userId, loading } = usePlatformAuth();
  const ready = !loading && !!userId && !!selectedBusinessId;

  const start = startOfDay(new Date());
  const end = addDays(start, DAYS);

  const q = useQuery({
    queryKey: [
      "dash-scheduled-value-chart",
      selectedBusinessId,
      start.toISOString().slice(0, 10),
    ],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase
        .from("jobber_jobs")
        .select("scheduled_start,total_amount")
        .eq("business_id", selectedBusinessId!)
        .gte("scheduled_start", start.toISOString())
        .lt("scheduled_start", end.toISOString());

      const buckets = new Map<string, number>();
      for (let i = 0; i < DAYS; i++) {
        const d = addDays(start, i);
        buckets.set(format(d, "yyyy-MM-dd"), 0);
      }
      for (const row of data ?? []) {
        if (!row.scheduled_start) continue;
        const key = format(new Date(row.scheduled_start), "yyyy-MM-dd");
        if (buckets.has(key)) {
          buckets.set(key, (buckets.get(key) ?? 0) + Number(row.total_amount || 0));
        }
      }
      return Array.from(buckets.entries()).map(([date, value]) => ({
        date,
        label: format(new Date(date), "EEE"),
        value: Math.round(value),
      }));
    },
  });

  const total = (q.data ?? []).reduce((s, r) => s + r.value, 0);

  return (
    <SectionCard
      title="Scheduled Job Value"
      subtitle={`Next ${DAYS} days · ${fmtMoney(total)} total`}
    >
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <AreaChart
            data={q.data ?? []}
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
    </SectionCard>
  );
}
