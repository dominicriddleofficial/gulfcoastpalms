import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { SectionCard, MetricTile, fmtMoney } from "./primitives";
import { subDays } from "date-fns";

export default function PipelineSection() {
  const { selectedBusinessId, userId, loading } = usePlatformAuth();
  const ready = !loading && !!userId && !!selectedBusinessId;
  const since7d = subDays(new Date(), 7).toISOString();
  const since30d = subDays(new Date(), 30).toISOString();

  const newLeads = useQuery({
    queryKey: ["dash-pipe-leads", selectedBusinessId, since7d],
    enabled: ready,
    queryFn: async () => {
      const { count } = await supabase
        .from("platform_leads")
        .select("id", { count: "exact", head: true })
        .eq("business_id", selectedBusinessId!)
        .gte("created_at", since7d);
      return count ?? 0;
    },
  });

  const quoteCounts = useQuery({
    queryKey: ["dash-pipe-quotes", selectedBusinessId, since30d],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_quotes")
        .select("status, total, sent_at, first_viewed_at, accepted_at, created_at")
        .eq("business_id", selectedBusinessId!)
        .gte("created_at", since30d);
      const rows = data ?? [];
      const sent = rows.filter((r) => !!r.sent_at).length;
      const viewed = rows.filter((r) => !!r.first_viewed_at).length;
      const approved = rows.filter(
        (r) =>
          !!r.accepted_at ||
          ["approved", "accepted", "won"].includes(String(r.status)),
      ).length;
      const awaiting = rows.filter((r) =>
        ["sent", "viewed"].includes(String(r.status)),
      ).length;
      const totalSent = rows.filter((r) => !!r.sent_at);
      const avg =
        totalSent.length > 0
          ? totalSent.reduce((s, r) => s + (Number(r.total) || 0), 0) /
            totalSent.length
          : 0;
      const conversion = sent > 0 ? Math.round((approved / sent) * 100) : 0;
      return { sent, viewed, approved, awaiting, avg, conversion };
    },
  });

  const q = quoteCounts.data;

  return (
    <SectionCard title="Pipeline" subtitle="Last 30 days · leads 7 days">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <MetricTile
          label="New leads 7d"
          value={newLeads.data ?? 0}
          loading={newLeads.isPending}
          to="/platform/leads"
        />
        <MetricTile
          label="Quotes sent"
          value={q?.sent ?? 0}
          loading={quoteCounts.isPending}
          to="/platform/quotes?status=sent"
        />
        <MetricTile
          label="Quotes viewed"
          value={q?.viewed ?? 0}
          loading={quoteCounts.isPending}
          to="/platform/quotes?status=viewed"
        />
        <MetricTile
          label="Quotes approved"
          value={q?.approved ?? 0}
          loading={quoteCounts.isPending}
          intent="good"
          to="/platform/quotes?status=approved"
        />
        <MetricTile
          label="Awaiting follow-up"
          value={q?.awaiting ?? 0}
          loading={quoteCounts.isPending}
          intent={(q?.awaiting ?? 0) > 0 ? "warn" : "neutral"}
          to="/platform/quotes?status=sent"
        />
        <MetricTile
          label="Conversion"
          value={`${q?.conversion ?? 0}%`}
          loading={quoteCounts.isPending}
        />
        <MetricTile
          label="Avg quote"
          value={fmtMoney(q?.avg ?? 0)}
          loading={quoteCounts.isPending}
        />
      </div>
    </SectionCard>
  );
}