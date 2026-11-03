/** Website traffic summary helpers. Numbers come from the website_analytics_summary database function. */
import { toCsv } from "@/lib/cashRecords";

export interface SiteTotals {
  visitors?: number; sessions?: number; page_views?: number; engaged_visitors?: number; contact_visitors?: number;
  cta_clicks?: number; call_taps?: number; text_taps?: number; form_start_sessions?: number; form_submits?: number; chat_opens?: number;
}
export interface SiteFunnel { sessions: number; acted: number; called: number; texted: number; started: number; started_and_submitted: number; submitted: number; contacted: number }
export interface SiteSummary {
  business_id: string; site: string | null; from: string; to: string; prior_from: string; timezone: string;
  current: SiteTotals; prior: SiteTotals; funnel: SiteFunnel;
  daily: Array<{ date: string; views: number; visitors: number; contacts: number }>;
  pages: Array<{ path: string; views: number; visitors: number; contacts: number }>;
  landing: Array<{ path: string; sessions: number; contacted: number }>;
  sources: Array<{ source: string; sessions: number; contacted: number }>;
  campaigns: Array<{ campaign: string; sessions: number; contacted: number }>;
  devices: Array<{ device: string; sessions: number; contacted: number }>;
  buttons: Array<{ kind: "cta" | "call" | "text"; placement: string; path: string; label: string; clicks: number }>;
  coverage: { raw_rows: number; site_rows: number; kept_rows: number; duplicate_rows_removed: number; no_session_rows: number; first_event_at: string | null; hosts: string[] };
}

export type RangeKey = "7" | "30" | "90" | "custom";

/** [from, to) as ISO timestamps. Custom dates are whole days in the business time zone (approximated in UTC offset of that day). */
export function rangeFor(key: RangeKey, now: Date, custom?: { from: string; to: string }): { from: string; to: string; days: number } | null {
  if (key !== "custom") {
    const days = Number(key);
    return { from: new Date(now.getTime() - days * 86_400_000).toISOString(), to: now.toISOString(), days };
  }
  if (!custom || !/^\d{4}-\d{2}-\d{2}$/.test(custom.from) || !/^\d{4}-\d{2}-\d{2}$/.test(custom.to)) return null;
  const f = Date.parse(`${custom.from}T00:00:00Z`); const t = Date.parse(`${custom.to}T00:00:00Z`) + 86_400_000;
  if (!(t > f) || t - f > 366 * 86_400_000) return null;
  return { from: new Date(f).toISOString(), to: new Date(t).toISOString(), days: Math.round((t - f) / 86_400_000) };
}

/** Share of a named denominator. Null when the denominator is zero, so the UI shows "—" instead of 0% or ∞. */
export function rate(n: number, d: number): number | null {
  if (!d || d <= 0 || !Number.isFinite(n)) return null;
  return n / d;
}
/** Change vs the previous equal-length period. Null when there was nothing before (no fake +100%). */
export function change(cur: number, prior: number | undefined): number | null {
  if (prior == null || prior <= 0) return null;
  return (cur - prior) / prior;
}
export function fmtRate(r: number | null): string {
  if (r == null) return "—";
  const v = r * 100;
  return `${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10}%`;
}
export function fmtChange(c: number | null): string {
  if (c == null) return "no earlier data";
  const v = Math.round(c * 100);
  return `${v > 0 ? "+" : ""}${v}% vs previous period`;
}

export const PLACEMENT_LABEL: Record<string, string> = {
  header: "Header", navbar: "Header", header_mobile: "Header (phone)", navbar_mobile: "Header (phone)", mobile_menu: "Phone menu", sticky_bar: "Bottom bar (phone)",
  footer: "Footer", hero: "Top of page", bottom_cta: "Bottom call box", quote_page: "Quote page", page_body: "In page",
  unknown: "Not recorded", public_site: "Not recorded",
};
export const placementLabel = (p: string) => PLACEMENT_LABEL[p] ?? p.replace(/_/g, " ");

/** Pages are grouped as service or city pages only by their address; anything else is "other". */
export function pageGroup(path: string): "service" | "city" | "other" {
  if (/^\/(services|palm-trees|tree-[a-z-]+|palm-tree-[a-z-]+)(\/|$)/.test(path) && !/-fl$/.test(path)) return "service";
  if (/-fl$|^\/(locations|service-areas|areas)\//.test(path)) return "city";
  return "other";
}

export function summaryCsv(s: SiteSummary): string {
  const c = s.current; const p = s.prior;
  const rows: Array<Record<string, unknown>> = [];
  const add = (section: string, item: string, value: unknown, prior: unknown = "") => rows.push({ section, item, value, previous_period: prior });
  add("Scope", "Site", s.site ?? ""); add("Scope", "From", s.from); add("Scope", "To", s.to);
  for (const [k, label] of [["visitors", "Unique visitors (browsers)"], ["sessions", "Visits (sessions)"], ["page_views", "Page views"],
    ["engaged_visitors", "Visitors who clicked something"], ["contact_visitors", "Visitors who tapped call/text or sent a request"],
    ["cta_clicks", "Button clicks (all)"], ["call_taps", "Call taps"], ["text_taps", "Text taps"],
    ["form_start_sessions", "Visits that started a quote form"], ["form_submits", "Quote requests sent"]] as const) {
    add("Totals", label, c[k] ?? 0, p[k] ?? 0);
  }
  for (const d of s.daily) add("Daily", d.date, `${d.views} views / ${d.visitors} visitors / ${d.contacts} contacts`);
  for (const r of s.pages) add("Top pages", r.path, `${r.views} views / ${r.contacts} contacts`);
  for (const r of s.landing) add("Landing pages", r.path, `${r.sessions} visits / ${r.contacted} contacted`);
  for (const r of s.buttons) add("Buttons", `${r.kind} · ${placementLabel(r.placement)} · ${r.path}${r.label ? ` · ${r.label}` : ""}`, r.clicks);
  for (const r of s.sources) add("Sources", r.source, `${r.sessions} visits / ${r.contacted} contacted`);
  for (const r of s.campaigns) add("Campaigns", r.campaign, `${r.sessions} visits / ${r.contacted} contacted`);
  for (const r of s.devices) add("Devices", r.device, `${r.sessions} visits / ${r.contacted} contacted`);
  return toCsv(rows, ["section", "item", "value", "previous_period"]);
}
