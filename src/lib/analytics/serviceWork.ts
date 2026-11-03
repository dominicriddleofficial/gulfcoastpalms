/**
 * Schedule-based service reporting. The owner does not click "completed":
 * work on the schedule before today is treated as done for reporting only.
 * Nothing here changes job status or triggers any action.
 */
import { dateKeyInZone, DEFAULT_BUSINESS_TZ } from "@/lib/customers/customerDetail";

export type WorkSource = "platform" | "jobber";
export type WorkState = "done_recorded" | "done_by_schedule" | "booked" | "excluded" | "undated";

export interface ServiceJob {
  id: string;
  source: WorkSource;
  /** yyyy-mm-dd in the business's time zone. */
  dateKey: string | null;
  amount: number;
  clientName: string | null;
  address: string | null;
  status: string | null;
  title: string | null;
}

export const EXCLUDED_STATUSES = new Set([
  "archived", "canceled", "cancelled", "deleted", "draft", "void",
]);
const RECORDED_DONE = new Set(["completed", "complete", "done", "paid", "invoiced", "closed", "requires_invoicing"]);

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Date-only values stay as-is (no UTC shift); timestamps use the business zone. */
export function toBusinessDateKey(v: string | null | undefined, tz = DEFAULT_BUSINESS_TZ): string | null {
  if (!v) return null;
  if (DATE_ONLY.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return dateKeyInZone(d, tz);
}

export function workState(j: ServiceJob, todayKey: string): WorkState {
  const s = (j.status ?? "").toLowerCase().trim();
  if (EXCLUDED_STATUSES.has(s)) return "excluded";
  if (!j.dateKey) return "undated";
  if (j.dateKey < todayKey) return RECORDED_DONE.has(s) ? "done_recorded" : "done_by_schedule";
  // Future-dated work stays booked even if its status says paid/completed/invoiced.
  if (j.dateKey > todayKey) return "booked";
  return RECORDED_DONE.has(s) ? "done_recorded" : "booked";
}
export const isDone = (s: WorkState) => s === "done_recorded" || s === "done_by_schedule";

export interface JobberRow {
  id: string; jobber_id: string | null; title: string | null; status: string | null;
  scheduled_start: string | null; total_amount: number | string | null;
  client_name: string | null; property_address: string | null;
}
export interface PlatformRow {
  id: string; status: string | null; scheduled_start: string | null; total: number | string | null;
  title: string | null; source_system: string | null; source_record_id: string | null;
  deleted_at: string | null;
  customer: { display_name: string | null } | null;
  property: { address_1: string | null; city: string | null; state: string | null; zip: string | null } | null;
}

/**
 * Combine app jobs and Jobber jobs. A Jobber row is dropped only when an app
 * row records it as its source (by internal id or Jobber's external id) —
 * never by a name/date guess. Deleted app mirrors still suppress their source.
 */
export function mergeServiceJobs(platform: PlatformRow[], jobber: JobberRow[], tz = DEFAULT_BUSINESS_TZ): ServiceJob[] {
  const mirrored = new Set<string>();
  for (const p of platform) if (p.source_system === "jobber" && p.source_record_id) mirrored.add(p.source_record_id);
  const out: ServiceJob[] = [];
  for (const p of platform) {
    if (p.deleted_at) continue;
    const prop = p.property;
    const addr = prop ? [prop.address_1, [prop.city, prop.state, prop.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null : null;
    out.push({
      id: p.id, source: "platform", dateKey: toBusinessDateKey(p.scheduled_start, tz),
      amount: Number(p.total) || 0, clientName: p.customer?.display_name ?? null, address: addr,
      status: p.status, title: p.title,
    });
  }
  for (const j of jobber) {
    if (mirrored.has(j.id) || (j.jobber_id && mirrored.has(j.jobber_id))) continue;
    out.push({
      id: j.id, source: "jobber", dateKey: toBusinessDateKey(j.scheduled_start, tz),
      amount: Number(j.total_amount) || 0, clientName: j.client_name, address: j.property_address,
      status: j.status, title: j.title,
    });
  }
  return out;
}

export interface Period { start: string; end: string; label: string } // [start, end) date keys

export const addYears = (key: string, n: number) => {
  const [y, m, d] = key.split("-").map(Number);
  const yy = y + n;
  // Feb 29 → Feb 28 in non-leap years
  const last = new Date(Date.UTC(yy, m, 0)).getUTCDate();
  return `${yy}-${String(m).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
};
const nextDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

export type PeriodKind = "ytd" | "year" | "q1" | "q2" | "q3" | "q4" | `m${number}`;

export function periodFor(year: number, kind: PeriodKind, todayKey: string): Period {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (kind === "ytd") {
    const thisYear = Number(todayKey.slice(0, 4));
    if (year < thisYear) return { start: `${year}-01-01`, end: `${year + 1}-01-01`, label: `${year}` };
    // Same calendar window in any year: Jan 1 through today's month/day.
    const md = todayKey.slice(5);
    const endKey = nextDay(addYears(`${thisYear}-${md}`, year - thisYear));
    return { start: `${year}-01-01`, end: endKey, label: `${year} to date` };
  }
  if (kind === "year") return { start: `${year}-01-01`, end: `${year + 1}-01-01`, label: `${year} full year` };
  if (kind.startsWith("q")) {
    const q = Number(kind.slice(1));
    const sm = (q - 1) * 3 + 1;
    const end = q === 4 ? `${year + 1}-01-01` : `${year}-${pad(sm + 3)}-01`;
    return { start: `${year}-${pad(sm)}-01`, end, label: `Q${q} ${year}` };
  }
  const m = Number(kind.slice(1));
  const end = m === 12 ? `${year + 1}-01-01` : `${year}-${pad(m + 1)}-01`;
  return { start: `${year}-${pad(m)}-01`, end, label: `${MONTH_NAMES[m - 1]} ${year}` };
}

/** Same window one year earlier, for like-for-like comparison. */
export function priorPeriod(p: Period): Period {
  return { start: addYears(p.start, -1), end: addYears(p.end, -1), label: "same period last year" };
}

export const inPeriod = (key: string | null, p: Period) => !!key && key >= p.start && key < p.end;

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface PeriodTotals { doneValue: number; doneJobs: number; recordedJobs: number; bookedValue: number; bookedJobs: number; undated: number }

export function totalsFor(jobs: ServiceJob[], p: Period, todayKey: string): PeriodTotals {
  const t: PeriodTotals = { doneValue: 0, doneJobs: 0, recordedJobs: 0, bookedValue: 0, bookedJobs: 0, undated: 0 };
  for (const j of jobs) {
    const s = workState(j, todayKey);
    if (s === "undated") { t.undated++; continue; }
    if (s === "excluded" || !inPeriod(j.dateKey, p)) continue;
    if (isDone(s)) {
      t.doneValue += j.amount; t.doneJobs++;
      if (s === "done_recorded") t.recordedJobs++;
    } else { t.bookedValue += j.amount; t.bookedJobs++; }
  }
  t.doneValue = Math.round(t.doneValue * 100) / 100;
  t.bookedValue = Math.round(t.bookedValue * 100) / 100;
  return t;
}

export interface MonthPoint { month: string; done: number; booked: number; prior: number; doneJobs: number }

export function monthlySeries(jobs: ServiceJob[], year: number, todayKey: string): MonthPoint[] {
  const pts = MONTH_NAMES.map((month) => ({ month, done: 0, booked: 0, prior: 0, doneJobs: 0 }));
  for (const j of jobs) {
    const s = workState(j, todayKey);
    if (s === "excluded" || s === "undated" || !j.dateKey) continue;
    const y = Number(j.dateKey.slice(0, 4));
    const m = Number(j.dateKey.slice(5, 7)) - 1;
    if (y === year) {
      if (isDone(s)) { pts[m].done += j.amount; pts[m].doneJobs++; } else pts[m].booked += j.amount;
    } else if (y === year - 1 && isDone(s)) pts[m].prior += j.amount;
  }
  return pts.map((p) => ({ ...p, done: Math.round(p.done), booked: Math.round(p.booked), prior: Math.round(p.prior) }));
}

export function rankBy<K extends string>(jobs: ServiceJob[], key: (j: ServiceJob) => K, limit = 8) {
  const m = new Map<K, { key: K; jobs: number; value: number }>();
  for (const j of jobs) {
    const k = key(j);
    const cur = m.get(k) ?? { key: k, jobs: 0, value: 0 };
    cur.jobs++; cur.value += j.amount;
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}
