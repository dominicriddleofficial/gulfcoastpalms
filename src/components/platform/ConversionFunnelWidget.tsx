import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface FunnelData {
  visitors: number;
  quote_starts: number;
  quote_submits: number;
  sent_quotes: number;
  approved_quotes: number;
  jobs_from_quotes: number;
  paid_invoices: number;
  call_clicks_by_page: Array<{ page: string; count: number }>;
  sms_clicks_by_page: Array<{ page: string; count: number }>;
  service_pages: Array<{ page: string; count: number }>;
  city_pages: Array<{ page: string; count: number }>;
}

function pct(n: number, d: number): string {
  if (!d) return "—";
  return `${Math.round((n / d) * 1000) / 10}%`;
}

async function fetchFunnel(days: number): Promise<FunnelData> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const counts = async (event: string): Promise<number> => {
    const { count } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", event)
      .gte("created_at", since);
    return count ?? 0;
  };

  const distinctVisitors = async (): Promise<number> => {
    const { data } = await supabase
      .from("analytics_events")
      .select("visitor_id")
      .eq("event_name", "page_view")
      .gte("created_at", since)
      .limit(10000);
    const set = new Set((data || []).map((r) => r.visitor_id).filter(Boolean));
    return set.size;
  };

  const groupByPage = async (event: string): Promise<Array<{ page: string; count: number }>> => {
    const { data } = await supabase
      .from("analytics_events")
      .select("page_path")
      .eq("event_name", event)
      .gte("created_at", since)
      .limit(5000);
    const m = new Map<string, number>();
    for (const r of data || []) {
      const p = r.page_path || "/";
      m.set(p, (m.get(p) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  const [visitors, quote_starts, quote_submits, calls, texts] = await Promise.all([
    distinctVisitors(),
    counts("quote_request_started"),
    counts("quote_request_submitted").then(async (v) => v || (await counts("lead_form_submit"))),
    groupByPage("call_now_click"),
    groupByPage("text_us_click"),
  ]);

  // Backend pipeline counts (already exist in platform tables)
  const sinceDate = since.slice(0, 10);
  const [{ count: sent_quotes }, { count: approved_quotes }, { count: jobs_from_quotes }, { count: paid_invoices }] = await Promise.all([
    supabase.from("platform_quotes").select("id", { count: "exact", head: true }).in("status", ["sent", "viewed", "approved", "won", "accepted", "declined"]).gte("created_at", since),
    supabase.from("platform_quotes").select("id", { count: "exact", head: true }).in("status", ["approved", "won", "accepted"]).gte("created_at", since),
    supabase.from("platform_jobs").select("id", { count: "exact", head: true }).not("quote_id", "is", null).gte("created_at", since),
    supabase.from("platform_invoices").select("id", { count: "exact", head: true }).eq("status", "paid").gte("issue_date", sinceDate),
  ]);

  const all_service_pages = await groupByPage("service_page_cta_click");
  const all_city_pages = await groupByPage("location_page_cta_click");

  return {
    visitors,
    quote_starts,
    quote_submits,
    sent_quotes: sent_quotes ?? 0,
    approved_quotes: approved_quotes ?? 0,
    jobs_from_quotes: jobs_from_quotes ?? 0,
    paid_invoices: paid_invoices ?? 0,
    call_clicks_by_page: calls,
    sms_clicks_by_page: texts,
    service_pages: all_service_pages,
    city_pages: all_city_pages,
  };
}

export default function ConversionFunnelWidget({ days = 30 }: { days?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["conversion-funnel", days],
    queryFn: () => fetchFunnel(days),
    refetchOnWindowFocus: false,
  });

  if (isLoading || !data) {
    return <Card className="p-6 text-sm text-muted-foreground">Loading conversion funnel…</Card>;
  }

  const steps = [
    { label: "Visitors", value: data.visitors, prev: null },
    { label: "Quote starts", value: data.quote_starts, prev: data.visitors },
    { label: "Quote submits", value: data.quote_submits, prev: data.quote_starts },
    { label: "Sent quotes", value: data.sent_quotes, prev: data.quote_submits },
    { label: "Approved quotes", value: data.approved_quotes, prev: data.sent_quotes },
    { label: "Jobs from quotes", value: data.jobs_from_quotes, prev: data.approved_quotes },
    { label: "Paid invoices", value: data.paid_invoices, prev: data.jobs_from_quotes },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Conversion funnel · last {days}d</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {steps.map((s, i) => (
            <div key={s.label} className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-bold">{s.value.toLocaleString()}</div>
              {s.prev != null && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {pct(s.value, s.prev)} {i > 0 && <ArrowRight className="w-3 h-3 inline ml-0.5" />}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankCard title="Call clicks by page" rows={data.call_clicks_by_page} />
        <RankCard title="SMS clicks by page" rows={data.sms_clicks_by_page} />
        <RankCard title="Top service pages (CTA clicks)" rows={data.service_pages} />
        <RankCard title="Top city pages (CTA clicks)" rows={data.city_pages} />
      </div>
    </div>
  );
}

function RankCard({ title, rows }: { title: string; rows: Array<{ page: string; count: number }> }) {
  return (
    <Card className="p-4">
      <h4 className="text-sm font-semibold mb-2">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data yet for this range.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.page} className="flex items-center justify-between text-sm">
              <span className="truncate text-foreground/90 mr-2">{r.page}</span>
              <Badge variant="outline">{r.count}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}