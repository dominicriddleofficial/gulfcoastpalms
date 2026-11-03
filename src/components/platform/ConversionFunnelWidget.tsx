import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download, Globe, Info, Inbox } from "lucide-react";
import {
  change, fmtChange, fmtRate, pageGroup, placementLabel, rangeFor, rate, summaryCsv,
  type RangeKey, type SiteSummary, type SiteTotals,
} from "@/lib/websiteAnalytics";

const ACCENT = "var(--accent-color)";
const PANEL = { background: "rgba(10,18,14,0.88)", border: "1px solid rgba(var(--biz-accent-rgb),0.18)" } as const;
const TILE = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(var(--biz-accent-rgb),0.12)" } as const;

async function fetchSummary(businessId: string, from: string, to: string): Promise<SiteSummary> {
  const { data, error } = await supabase.rpc("website_analytics_summary", { _business_id: businessId, _from: from, _to: to });
  if (error) throw new Error(error.message);
  return data as unknown as SiteSummary;
}

interface CrmActivity { leads: number; websiteLeads: number; sent: number; approved: number; jobs: number; paid: number }
/** CRM records by the date each step happened. Not linked to website visits. */
async function fetchCrm(businessId: string, from: string, to: string): Promise<CrmActivity> {
  const c = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const r = await q; if (r.error) throw new Error(r.error.message); return r.count ?? 0;
  };
  const head = { count: "exact" as const, head: true };
  const [leads, websiteLeads, sent, approved, jobs, paid] = await Promise.all([
    c(supabase.from("platform_leads").select("id", head).eq("business_id", businessId).is("deleted_at", null).gte("created_at", from).lt("created_at", to)),
    c(supabase.from("platform_leads").select("id", head).eq("business_id", businessId).is("deleted_at", null).gte("created_at", from).lt("created_at", to).or("lead_source.ilike.%website%,lead_source.ilike.%quote%,utm_source.not.is.null")),
    c(supabase.from("platform_quotes").select("id", head).eq("business_id", businessId).is("deleted_at", null).gte("sent_at", from).lt("sent_at", to)),
    c(supabase.from("platform_quotes").select("id", head).eq("business_id", businessId).is("deleted_at", null).gte("approved_at", from).lt("approved_at", to)),
    c(supabase.from("platform_jobs").select("id", head).eq("business_id", businessId).is("deleted_at", null).not("quote_id", "is", null).gte("created_at", from).lt("created_at", to)),
    c(supabase.from("platform_invoices").select("id", head).eq("business_id", businessId).is("deleted_at", null).eq("status", "paid").gte("paid_at", from).lt("paid_at", to)),
  ]);
  return { leads, websiteLeads, sent, approved, jobs, paid };
}

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ConversionFunnelWidget({ businessId }: { businessId: string | null; days?: number }) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("30");
  const [custom, setCustom] = useState({ from: "", to: "" });
  // Freeze "now" per selection so the query key is stable.
  const [now] = useState(() => new Date());
  // Custom ranges are whole days in the business's own time zone.
  const tzq = useQuery({
    queryKey: ["business-timezone", businessId], enabled: !!businessId, staleTime: 3_600_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("timezone").eq("id", businessId as string).maybeSingle();
      if (error) throw new Error(error.message);
      return (data?.timezone as string | null) || "America/Chicago";
    },
  });
  const tz = tzq.data ?? "America/Chicago";
  const range = useMemo(() => (rangeKey === "custom" && !tzq.data ? null : rangeFor(rangeKey, now, custom, tz)), [rangeKey, now, custom, tz, tzq.data]);

  const q = useQuery({
    queryKey: ["website-analytics", businessId, range?.from, range?.to],
    enabled: !!businessId && !!range,
    queryFn: () => fetchSummary(businessId as string, (range as { from: string }).from, (range as { to: string }).to),
    staleTime: 60_000,
  });
  const crm = useQuery({
    queryKey: ["website-crm", businessId, range?.from, range?.to],
    enabled: !!businessId && !!range,
    queryFn: () => fetchCrm(businessId as string, (range as { from: string }).from, (range as { to: string }).to),
    staleTime: 60_000,
  });
  const s = q.data && q.data.business_id === businessId ? q.data : null;

  return (
    <section aria-label="Website activity" className="rounded-xl p-4 sm:p-5 space-y-4" style={PANEL}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Globe className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ACCENT }} />
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-foreground">Website activity</h2>
            <p className="font-body text-[11px] text-muted-foreground">
              {s ? `${s.site ?? "This business"} public website only` : "Public website only"} · app, customer links and test traffic left out · compared with the previous {range?.days ?? "—"} days
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["7", "30", "90"] as const).map((k) => (
            <button key={k} onClick={() => setRangeKey(k)} aria-pressed={rangeKey === k}
              className={`px-2.5 py-1 rounded-md font-body text-[11px] border ${rangeKey === k ? "text-primary border-primary/50 bg-primary/10" : "text-muted-foreground border-transparent hover:text-foreground"}`}>{k} days</button>
          ))}
          <button onClick={() => setRangeKey("custom")} aria-pressed={rangeKey === "custom"}
            className={`px-2.5 py-1 rounded-md font-body text-[11px] border ${rangeKey === "custom" ? "text-primary border-primary/50 bg-primary/10" : "text-muted-foreground border-transparent hover:text-foreground"}`}>Custom</button>
          <button onClick={() => s && download(`website-activity-${s.from.slice(0, 10)}-to-${s.to.slice(0, 10)}.csv`, summaryCsv(s))} disabled={!s}
            className="px-2.5 py-1 rounded-md font-body text-[11px] border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 inline-flex items-center gap-1">
            <Download className="w-3 h-3" />CSV
          </button>
        </div>
      </div>
      {rangeKey === "custom" && (
        <div className="flex flex-wrap items-center gap-2 font-body text-xs">
          <label className="flex items-center gap-1">From <input aria-label="From date" type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="h-8 rounded-md border border-border bg-background px-2 text-foreground" /></label>
          <label className="flex items-center gap-1">To <input aria-label="To date" type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="h-8 rounded-md border border-border bg-background px-2 text-foreground" /></label>
          {!range && <span className="text-muted-foreground">Pick a real start and end date, end on or after start (up to a year).</span>}
        </div>
      )}

      {range && <p className="font-body text-[11px] text-muted-foreground">Showing: <span className="text-foreground">{range.label}</span>{rangeKey !== "custom" ? ` · days shown in ${tz.replace(/_/g, " ")} time` : ""}</p>}
      {!businessId ? <p className="font-body text-xs text-muted-foreground">Pick a business.</p>
        : q.isError ? <p className="font-body text-xs text-destructive">Couldn't load website activity: {(q.error as Error).message}. <button className="underline" onClick={() => void q.refetch()}>Try again</button></p>
        : !s ? (range ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-16 rounded-lg bg-muted/20 animate-pulse" />)}</div> : null)
        : s.coverage.hosts.length === 0 ? <Empty text="This business has no public website being tracked." />
        : <Body s={s} crm={crm.data ?? null} crmError={crm.isError} />}
    </section>
  );
}

function Body({ s, crm, crmError }: { s: SiteSummary; crm: CrmActivity | null; crmError: boolean }) {
  const c = s.current; const p = s.prior; const f = s.funnel;
  const n = (t: SiteTotals, k: keyof SiteTotals) => t[k] ?? 0;
  const tiles: Array<{ label: string; k: keyof SiteTotals; hint: string }> = [
    { label: "Unique visitors", k: "visitors", hint: "Separate browsers. One person on two devices counts twice." },
    { label: "Visits", k: "sessions", hint: "A visit ends after 30 minutes of no activity." },
    { label: "Page views", k: "page_views", hint: "Each page opened." },
    { label: "Button clicks", k: "cta_clicks", hint: "Quote buttons plus call and text taps." },
    { label: "Call taps", k: "call_taps", hint: "Taps on a phone link. Doesn't prove a call connected." },
    { label: "Text taps", k: "text_taps", hint: "Taps on a text link. Doesn't prove a message was sent." },
    { label: "Quote forms started", k: "form_start_sessions", hint: "Visits where someone typed into a quote form." },
    { label: "Quote requests sent", k: "form_submits", hint: "Only requests that saved successfully." },
  ];
  const contactRate = rate(n(c, "contact_visitors"), n(c, "visitors"));
  const completion = rate(f.started_and_submitted, f.started);
  const groups = { service: [] as typeof s.pages, city: [] as typeof s.pages };
  for (const r of s.pages) { const g = r.grp ?? pageGroup(r.path); if (g === "service" || g === "city") groups[g].push(r); }

  const steps = [
    { label: "Visits", v: f.sessions, d: null as number | null, dl: "" },
    { label: "Clicked something", v: f.acted, d: f.sessions, dl: "of visits" },
    { label: "Tapped call", v: f.called, d: f.sessions, dl: "of visits" },
    { label: "Tapped text", v: f.texted, d: f.sessions, dl: "of visits" },
    { label: "Started quote form", v: f.started, d: f.sessions, dl: "of visits" },
    { label: "Sent quote request", v: f.started_and_submitted, d: f.started, dl: "of forms started" },
  ];

  return (
    <div className="space-y-4">
      <Coverage s={s} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tiles.map((t) => {
          const ch = change(n(c, t.k), p[t.k]);
          return (
            <div key={t.k} className="rounded-lg p-2.5 min-w-0" style={TILE} title={t.hint}>
              <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground truncate">{t.label}</p>
              <p className="font-display text-lg font-bold text-foreground tabular-nums">{n(c, t.k).toLocaleString()}</p>
              <p className={`font-body text-[10px] ${ch == null ? "text-muted-foreground" : ch >= 0 ? "text-primary" : "text-destructive"}`}>{fmtChange(ch)}</p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Rate label="Visitors who reached out" value={fmtRate(contactRate)} sub={`${n(c, "contact_visitors")} of ${n(c, "visitors")} visitors tapped call/text or sent a request`} />
        <Rate label="Quote form completion" value={fmtRate(completion)} sub={`${f.started_and_submitted} of ${f.started} visits that started a form sent it`} />
      </div>

      <Block title="What visitors did" sub="Same visits followed through. Each % says what it's out of.">
        <ul className="space-y-2">
          {steps.map((st) => (
            <li key={st.label} className="font-body text-xs">
              <div className="flex justify-between gap-2"><span>{st.label}</span>
                <span className="tabular-nums text-muted-foreground">{st.v.toLocaleString()}{st.d != null && <> · <span className="text-foreground">{fmtRate(rate(st.v, st.d))}</span> {st.dl}</>}</span></div>
              <div className="h-1.5 mt-1 rounded-full bg-secondary/40"><div className="h-1.5 rounded-full" style={{ width: `${f.sessions && st.v > 0 ? Math.max(1, (st.v / f.sessions) * 100) : 0}%`, background: ACCENT }} /></div>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Daily visitors and contacts" sub={`Visitors = unique browsers that day · contacts = call taps + text taps + quote requests sent · every day shown, ${s.timezone.replace(/_/g, " ")} time`}>
        {s.daily.every((d) => d.views === 0 && d.visitors === 0 && d.contacts === 0) ? <Empty text="No visits in this range." /> : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={s.daily}>
              <CartesianGrid vertical={false} strokeDasharray="2 5" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fill: "#94a4a7", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={{ fill: "#94a4a7", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ background: "#0b130f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="visitors" name="Visitors" stroke={ACCENT} fill="rgba(var(--biz-accent-rgb),0.15)" strokeWidth={2} />
              <Area type="monotone" dataKey="contacts" name="Contacts" stroke="#e5e7eb" fill="none" strokeWidth={1.5} strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Block>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Rank title="Most-clicked buttons" rows={s.buttons.map((b) => ({ key: `${b.kind}|${b.placement}|${b.path}|${b.label}`, label: `${b.kind === "call" ? "Call" : b.kind === "text" ? "Text" : b.label === "quote_request" ? "Get a quote" : b.label || "Button"} · ${placementLabel(b.placement)}`, sub: b.path, v: b.clicks }))} unit="clicks" />
        <Rank title="Top pages" rows={s.pages.slice(0, 10).map((r) => ({ key: r.path, label: r.path, sub: `${r.visitors} visitors · ${r.contacts} contacts`, v: r.views }))} unit="views" />
        <Rank title="Where visits started" rows={s.landing.slice(0, 10).map((r) => ({ key: r.path, label: r.path, sub: `${r.contacted} reached out`, v: r.sessions }))} unit="visits" />
        <Rank title="Traffic sources" rows={s.sources.map((r) => ({ key: r.source, label: r.source, sub: `${r.contacted} reached out`, v: r.sessions }))} unit="visits" note="From ad tags or the site visitors came from. Missing ones show as direct or unknown." />
        {s.campaigns.length > 0 && <Rank title="Ad campaigns" rows={s.campaigns.map((r) => ({ key: r.campaign, label: r.campaign, sub: `${r.contacted} reached out`, v: r.sessions }))} unit="visits" />}
        <Rank title="Devices" rows={s.devices.map((r) => ({ key: r.device, label: r.device, sub: `${r.contacted} reached out`, v: r.sessions }))} unit="visits" />
        {groups.service.length > 0 && <Rank title="Service pages" rows={groups.service.map((r) => ({ key: r.path, label: r.path, sub: `${r.contacts} contacts`, v: r.views }))} unit="views" />}
        {groups.city.length > 0 && <Rank title="City pages" rows={groups.city.map((r) => ({ key: r.path, label: r.path, sub: `${r.contacts} contacts`, v: r.views }))} unit="views" />}
      </div>

      <Block title="Office activity in the same dates" sub="Counted from your records by the date each happened. Not tied to specific website visits, so no website-to-paid rate is shown.">
        {crmError ? <p className="font-body text-xs text-destructive">Couldn't load office activity.</p> : !crm ? <p className="font-body text-xs text-muted-foreground">Loading…</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[["New leads", crm.leads], ["Leads tagged website", crm.websiteLeads], ["Quotes sent", crm.sent], ["Quotes approved", crm.approved], ["Jobs from quotes", crm.jobs], ["Invoices paid", crm.paid]].map(([l, v]) => (
              <div key={l as string} className="rounded-lg p-2.5" style={TILE}>
                <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">{l}</p>
                <p className="font-display text-lg font-bold text-foreground tabular-nums">{(v as number).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </Block>
    </div>
  );
}

function Coverage({ s }: { s: SiteSummary }) {
  const first = s.coverage.first_event_at ? s.coverage.first_event_at.slice(0, 10) : null;
  return (
    <p className="font-body text-[10px] text-muted-foreground flex gap-1.5">
      <Info className="w-3 h-3 shrink-0 mt-0.5" />
      <span>
        {s.coverage.kept_rows.toLocaleString()} website actions counted
        {s.coverage.duplicate_rows_removed > 0 && ` · ${s.coverage.duplicate_rows_removed.toLocaleString()} repeat records of the same tap removed`}
        {first ? ` · site data since ${first}` : " · no site data yet"}.
        Button placement and separate text taps are recorded from this update on; older taps show as "Not recorded".
      </span>
    </p>
  );
}

function Rate({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg p-3 min-w-0" style={{ ...TILE, background: "rgba(var(--biz-accent-rgb),0.06)" }}>
      <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold text-primary tabular-nums">{value}</p>
      <p className="font-body text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function Block({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3 sm:p-4 space-y-3" style={TILE}>
      <div><h3 className="font-display text-xs font-semibold text-foreground">{title}</h3>{sub && <p className="font-body text-[10px] text-muted-foreground">{sub}</p>}</div>
      {children}
    </div>
  );
}

function Rank({ title, rows, unit, note }: { title: string; rows: Array<{ key: string; label: string; sub?: string; v: number }>; unit: string; note?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.v));
  return (
    <Block title={title} sub={note}>
      {rows.length === 0 ? <Empty text="Nothing recorded in this range." /> : (
        <ul className="space-y-2">
          {rows.slice(0, 10).map((r) => (
            <li key={r.key} className="font-body text-xs min-w-0">
              <div className="flex justify-between gap-2 min-w-0">
                <span className="truncate text-foreground" title={r.label}>{r.label}</span>
                <span className="tabular-nums text-muted-foreground shrink-0">{r.v.toLocaleString()} {unit}</span>
              </div>
              {r.sub && <p className="text-[10px] text-muted-foreground truncate" title={r.sub}>{r.sub}</p>}
              <div className="h-1 mt-1 rounded-full bg-secondary/40"><div className="h-1 rounded-full" style={{ width: `${(r.v / max) * 100}%`, background: ACCENT }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground"><Inbox className="w-4 h-4 opacity-50" /><p className="font-body text-xs">{text}</p></div>;
}
