import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingDown, Inbox } from "lucide-react";

const ACCENT = "var(--accent-color)";
const ACCENT_DIM = "rgba(var(--biz-accent-rgb),0.5)";
const CARD_BG = "rgba(255,255,255,0.03)";
const CARD_BORDER = "rgba(var(--biz-accent-rgb),0.15)";
const TRACK_BG = "rgba(255,255,255,0.05)";

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
  if (!d || d <= 0) return "—";
  const v = (n / d) * 100;
  return `${v >= 100 ? Math.round(v) : Math.round(v * 10) / 10}%`;
}

async function fetchFunnel(days: number, businessId: string | null): Promise<FunnelData> {
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

  // analytics_events has no business_id column (only a coarse business_type tag),
  // so site-wide event queries are intentionally not scoped by business here.
  const [visitors, quote_starts, quote_submits, calls, texts] = await Promise.all([
    distinctVisitors(),
    counts("quote_request_started"),
    counts("quote_request_submitted").then(async (v) => v || (await counts("lead_form_submit"))),
    groupByPage("call_now_click"),
    groupByPage("text_us_click"),
  ]);

  // These platform tables DO have business_id — scope to current workspace.
  const sinceDate = since.slice(0, 10);
  const scope = <T extends { eq: (col: string, v: string) => T }>(q: T): T =>
    businessId ? q.eq("business_id", businessId) : q;

  const [{ count: sent_quotes }, { count: approved_quotes }, { count: jobs_from_quotes }, { count: paid_invoices }] = await Promise.all([
    scope(supabase.from("platform_quotes").select("id", { count: "exact", head: true }).in("status", ["sent", "viewed", "approved", "won", "accepted", "declined"]).gte("created_at", since)),
    scope(supabase.from("platform_quotes").select("id", { count: "exact", head: true }).in("status", ["approved", "won", "accepted"]).gte("created_at", since)),
    scope(supabase.from("platform_jobs").select("id", { count: "exact", head: true }).not("quote_id", "is", null).gte("created_at", since)),
    scope(supabase.from("platform_invoices").select("id", { count: "exact", head: true }).eq("status", "paid").gte("issue_date", sinceDate)),
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

export default function ConversionFunnelWidget({
  days = 30,
  businessId = null,
}: { days?: number; businessId?: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["conversion-funnel", days, businessId],
    queryFn: () => fetchFunnel(days, businessId),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const panelStyle = {
    background: CARD_BG,
    border: `1px solid ${CARD_BORDER}`,
  } as const;

  if (isLoading || !data) {
    return (
      <div className="rounded-xl p-5" style={panelStyle}>
        <p className="font-body text-xs text-muted-foreground">Loading conversion funnel…</p>
      </div>
    );
  }

  const steps: Array<{ label: string; value: number; prev: number | null }> = [
    { label: "Visitors", value: data.visitors, prev: null },
    { label: "Quote starts", value: data.quote_starts, prev: data.visitors },
    { label: "Quote submits", value: data.quote_submits, prev: data.quote_starts },
    { label: "Sent quotes", value: data.sent_quotes, prev: data.quote_submits },
    { label: "Approved quotes", value: data.approved_quotes, prev: data.sent_quotes },
    { label: "Jobs from quotes", value: data.jobs_from_quotes, prev: data.approved_quotes },
    { label: "Paid invoices", value: data.paid_invoices, prev: data.jobs_from_quotes },
  ];

  const top = Math.max(1, ...steps.map((s) => s.value));

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-5 space-y-4" style={panelStyle}>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" style={{ color: ACCENT }} />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Conversion Funnel</h3>
            <p className="font-body text-[10px] text-muted-foreground">Last {days} days · website to paid</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {steps.map((s) => {
            const share = Math.max(0, Math.min(1, s.value / top));
            const conv = s.prev == null ? null : pct(s.value, s.prev);
            return (
              <div
                key={s.label}
                className="rounded-lg p-3 space-y-2"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${CARD_BORDER}` }}
              >
                <p className="font-body text-[9px] uppercase tracking-wider text-muted-foreground truncate">
                  {s.label}
                </p>
                <p className="font-display text-xl font-bold tracking-tight text-foreground">
                  {s.value.toLocaleString()}
                </p>
                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{ background: TRACK_BG }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${share * 100}%`,
                      background: ACCENT,
                      opacity: 0.85,
                    }}
                  />
                </div>
                {conv === null ? (
                  <span className="inline-block font-body text-[10px] text-muted-foreground">
                    top of funnel
                  </span>
                ) : conv === "—" ? (
                  <span className="inline-block font-body text-[10px] text-muted-foreground">—</span>
                ) : (
                  <span
                    className="inline-block font-body text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      color: ACCENT,
                      background: "rgba(var(--biz-accent-rgb),0.10)",
                      border: `1px solid ${CARD_BORDER}`,
                    }}
                  >
                    {conv} vs prior
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankCard title="Call clicks by page" subtitle="Tap-to-call CTA hits" rows={data.call_clicks_by_page} />
        <RankCard title="SMS clicks by page" subtitle="Text-us CTA hits" rows={data.sms_clicks_by_page} />
        <RankCard title="Top service pages" subtitle="Service page CTA clicks" rows={data.service_pages} />
        <RankCard title="Top city pages" subtitle="Location page CTA clicks" rows={data.city_pages} />
      </div>
    </div>
  );
}

function RankCard({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: Array<{ page: string; count: number }>;
}) {
  const max = rows.length > 0 ? Math.max(1, ...rows.map((r) => r.count)) : 1;
  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4" style={{ color: ACCENT }} />
        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">{title}</h4>
          <p className="font-body text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Inbox className="w-6 h-6 text-muted-foreground/40" />
          <p className="font-body text-xs text-muted-foreground">No data yet for this range</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.page} className="space-y-1">
              <div className="flex justify-between items-baseline gap-3">
                <span
                  className="font-body text-xs text-foreground truncate"
                  title={r.page}
                  style={{ maxWidth: "75%" }}
                >
                  {r.page}
                </span>
                <span className="font-body text-[10px] text-muted-foreground tabular-nums">
                  {r.count.toLocaleString()}
                </span>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: TRACK_BG }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(r.count / max) * 100}%`,
                    background: ACCENT,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}