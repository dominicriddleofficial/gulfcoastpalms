/**
 * Pure helpers for the customer detail panel: phone/email/address actions and
 * service-history derivation. Kept free of React/Supabase so they are testable.
 */

// ── Phones ──────────────────────────────────────────────────────────────────

export type PhoneInfo = {
  /** Original text exactly as stored (used for Copy). */
  raw: string;
  display: string;
  /** tel: href (extension dialed after a pause) or null when unusable. */
  telHref: string | null;
  /** sms: href (base number only — extensions can't receive texts) or null. */
  smsHref: string | null;
  extension: string | null;
};

const EXT_RE = /\s*(?:ext\.?|extension|x|#)\s*(\d{1,6})\s*$/i;

export function parsePhone(input: string | null | undefined): PhoneInfo | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  let main = raw;
  let extension: string | null = null;
  const m = raw.match(EXT_RE);
  if (m && m.index !== undefined && m.index > 0) {
    extension = m[1];
    main = raw.slice(0, m.index);
  }
  const hasPlus = main.trim().startsWith("+");
  const digits = main.replace(/\D/g, "");
  let e164: string | null = null;
  let display = raw;
  if (!hasPlus && digits.length === 10) e164 = `+1${digits}`;
  else if (!hasPlus && digits.length === 11 && digits.startsWith("1")) e164 = `+${digits}`;
  else if (hasPlus && digits.length >= 8 && digits.length <= 15) e164 = `+${digits}`;
  if (e164 && e164.startsWith("+1") && e164.length === 12) {
    const d = e164.slice(2);
    display = `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    if (extension) display += ` ext. ${extension}`;
  }
  if (!e164) return { raw, display: raw, telHref: null, smsHref: null, extension };
  return { raw, display, telHref: `tel:${e164}${extension ? `,${extension}` : ""}`, smsHref: `sms:${e164}`, extension };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function mailtoHref(email: string | null | undefined): string | null {
  const e = (email ?? "").trim();
  if (!EMAIL_RE.test(e)) return null;
  return `mailto:${encodeURIComponent(e).replace(/%40/g, "@")}`;
}

/**
 * Shows a stored preferred contact method only when the matching channel is
 * actually usable for this customer.
 */
export function usablePreference(
  method: string | null | undefined,
  contact: { phone: string | null; secondary_phone: string | null; email: string | null },
): string | null {
  const m = (method ?? "").trim().toLowerCase();
  if (!m) return null;
  const phoneOk = [contact.phone, contact.secondary_phone].some((p) => !!parsePhone(p)?.telHref);
  if (["phone", "call", "voice"].includes(m)) return phoneOk ? "Prefers phone calls" : null;
  if (["text", "sms"].includes(m)) return phoneOk ? "Prefers texts" : null;
  if (m === "email") return mailtoHref(contact.email) ? "Prefers email" : null;
  return null;
}

// ── Addresses ───────────────────────────────────────────────────────────────

export type AddressParts = {
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  verified?: boolean | null;
};

const clean = (s: string | null | undefined) => (s ?? "").trim();

export function addressLines(a: AddressParts): { line1: string; line2: string } {
  const line1 = [clean(a.street1), clean(a.street2)].filter(Boolean).join(", ");
  const stateZip = [clean(a.state), clean(a.zip)].filter(Boolean).join(" ");
  const line2 = [clean(a.city), stateZip, clean(a.country)].filter(Boolean).join(", ");
  return { line1, line2 };
}

export function fullAddress(a: AddressParts): string {
  const { line1, line2 } = addressLines(a);
  return [line1, line2].filter(Boolean).join(", ");
}

const validCoord = (lat: unknown, lng: unknown): lat is number =>
  typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)
  && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

/**
 * Apple Maps driving directions from the device's current location.
 * The written street address wins over stored coordinates (coordinates can be
 * stale). Coordinates are only used when the street is missing and the address
 * was verified. City-only addresses never route.
 */
export function appleMapsDirectionsUrl(a: AddressParts): string | null {
  if (clean(a.street1)) {
    return `https://maps.apple.com/?daddr=${encodeURIComponent(fullAddress(a))}&dirflg=d`;
  }
  if (a.verified && validCoord(a.lat, a.lng)) {
    return `https://maps.apple.com/?daddr=${a.lat},${a.lng}&dirflg=d`;
  }
  return null;
}

// ── Clipboard ───────────────────────────────────────────────────────────────

export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  if (typeof document === "undefined") return false;
  const ta = document.createElement("textarea");
  try {
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    return document.execCommand?.("copy") ?? false;
  } catch {
    return false;
  } finally {
    ta.remove();
  }
}

// ── Service history ─────────────────────────────────────────────────────────

export type ServiceStatus = "completed" | "scheduled" | "in_progress" | "overdue";

export type ServiceEvent = {
  key: string;
  jobId: string;
  jobSource: "platform" | "jobber";
  label: string;
  propertyId: string | null;
  status: ServiceStatus;
  /** yyyy-mm-dd (date only) or ISO timestamp; null when unknown. */
  date: string | null;
  /** actual = recorded completion/start; scheduled = planned date; unknown = no date. */
  dateKind: "actual" | "scheduled" | "unknown";
  /**
   * True when counted as done only because its scheduled day has passed (the owner doesn't
   * click Complete). Status is never changed in the database. False/undefined = recorded completion.
   */
  inferred?: boolean;
};

const COMPLETE = new Set(["complete", "completed"]);
const DEAD = new Set(["deleted", "cancelled", "canceled", "void"]);
const SCHEDULED = new Set(["scheduled", "upcoming", "confirmed"]);
const ACTIVE = new Set(["in_progress", "on_my_way", "arrived", "started"]);
const isDateOnly = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

export const DEFAULT_BUSINESS_TZ = "America/Chicago";

function zoneParts(ms: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: g("year"), mo: g("month"), d: g("day"), h: g("hour") % 24, mi: g("minute"), s: g("second") };
}

/** yyyy-mm-dd for an instant, in the business's time zone (not the viewer's). */
export function dateKeyInZone(at: Date, tz: string): string {
  const p = zoneParts(at.getTime(), tz);
  return `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** Business-local date + wall-clock time → UTC ISO timestamp (DST-safe). */
export function zonedToUtcIso(date: string, time: string, tz: string): string | null {
  const dm = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!dm || !tm) return null;
  const wall = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], +tm[1], +tm[2], +(tm[3] ?? 0));
  const offsetAt = (ms: number) => {
    const p = zoneParts(ms, tz);
    return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - ms;
  };
  let ms = wall - offsetAt(wall);
  ms = wall - offsetAt(ms);
  return new Date(ms).toISOString();
}

/** Display for a booking: local time when known, else the date only. */
export function formatBooking(e: Pick<ServiceEvent, "date">, tz: string, now = new Date()): string {
  if (!e.date) return "Date not recorded";
  if (isDateOnly(e.date)) {
    if (e.date === dateKeyInZone(now, tz)) return "Today";
    const [y, m, d] = e.date.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  }
  const at = new Date(e.date);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(at);
  if (dateKeyInZone(at, tz) === dateKeyInZone(now, tz)) return `Today, ${time}`;
  const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" }).format(at);
  return `${day}, ${time}`;
}

export const localDateKey = (now: Date) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/**
 * Booking on a business-local day before today → service inferred from the schedule.
 * Today/future → upcoming ("scheduled"), or "overdue" only for a timed booking earlier today.
 */
function scheduleState(date: string, now: Date, tz: string): "scheduled" | "overdue" | "inferred" {
  const today = dateKeyInZone(now, tz);
  const day = isDateOnly(date) ? date : dateKeyInZone(new Date(date), tz);
  if (day < today) return "inferred";
  if (isDateOnly(date)) return "scheduled";
  return new Date(date).getTime() >= now.getTime() ? "scheduled" : "overdue";
}
function scheduledEvent<B extends object>(base: B, date: string, now: Date, tz: string): B & Pick<ServiceEvent, "status" | "date" | "dateKind" | "inferred"> {
  const st = scheduleState(date, now, tz);
  return st === "inferred"
    ? { ...base, status: "completed", date, dateKind: "scheduled", inferred: true }
    : { ...base, status: st, date, dateKind: "scheduled" };
}

/**
 * Marked complete but with no recorded finish time: a past planned day is a recorded completion;
 * a planned day today or later never becomes history — it stays upcoming.
 */
function completeWithoutActual<B extends object>(base: B, planned: string | null, now: Date, tz: string): B & Pick<ServiceEvent, "status" | "date" | "dateKind"> {
  if (!planned) return { ...base, status: "completed", date: null, dateKind: "unknown" };
  const day = planned.length <= 10 ? planned : dateKeyInZone(new Date(planned), tz);
  return day < dateKeyInZone(now, tz)
    ? { ...base, status: "completed", date: planned, dateKind: "scheduled" }
    : { ...base, status: "scheduled", date: planned, dateKind: "scheduled" };
}

export type JobberJobRow = {
  id: string; job_number: string | null; title: string | null; status: string | null;
  visit_status: string | null; scheduled_start: string | null; property_id: string | null;
};

/** One Jobber job = one visit in our mirror. */
export function jobberJobEvents(
  jobs: JobberJobRow[], completedAt: Map<string, string>, now: Date,
  mapProperty: (id: string | null) => string | null = (id) => id,
  tz: string = DEFAULT_BUSINESS_TZ,
): ServiceEvent[] {
  const out: ServiceEvent[] = [];
  for (const j of jobs) {
    if (DEAD.has((j.status ?? "").toLowerCase())) continue;
    const vs = (j.visit_status ?? "").toLowerCase();
    const done = completedAt.get(j.id);
    const label = j.job_number ? `Job #${j.job_number}` : j.title || "Job";
    const base = { key: `jobber:${j.id}`, jobId: j.id, jobSource: "jobber" as const, label, propertyId: mapProperty(j.property_id) };
    if (done) {
      out.push({ ...base, status: "completed", date: done, dateKind: "actual" });
    } else if (COMPLETE.has(vs)) {
      out.push(completeWithoutActual(base, j.scheduled_start, now, tz));
    } else if ((vs === "late" || SCHEDULED.has(vs)) && j.scheduled_start) {
      out.push(scheduledEvent(base, j.scheduled_start, now, tz));
    }
  }
  return out;
}

export type PlatformJobRow = {
  id: string; job_number: string | null; title: string | null; status: string | null;
  property_id: string | null; scheduled_start: string | null; completed_at: string | null;
  deleted_at: string | null;
};
export type PlatformVisitRow = {
  id: string; job_id: string; property_id: string | null; status: string | null;
  scheduled_date: string | null; scheduled_start_time?: string | null; actual_start_at: string | null; actual_end_at: string | null;
};

export function platformJobEvents(
  jobs: PlatformJobRow[], visits: PlatformVisitRow[], now: Date,
  mapProperty: (id: string | null) => string | null = (id) => id,
  tz: string = DEFAULT_BUSINESS_TZ,
): ServiceEvent[] {
  const byJob = new Map<string, PlatformVisitRow[]>();
  for (const v of visits) {
    const arr = byJob.get(v.job_id) ?? [];
    arr.push(v);
    byJob.set(v.job_id, arr);
  }
  const out: ServiceEvent[] = [];
  for (const j of jobs) {
    const js = (j.status ?? "").toLowerCase();
    if (j.deleted_at || DEAD.has(js)) continue;
    const label = j.job_number ? `Job ${j.job_number}` : j.title || "Job";
    const vs = byJob.get(j.id) ?? [];
    if (vs.length === 0) {
      const base = { key: `platform-job:${j.id}`, jobId: j.id, jobSource: "platform" as const, label, propertyId: mapProperty(j.property_id) };
      if (COMPLETE.has(js)) {
        if (j.completed_at) out.push({ ...base, status: "completed", date: j.completed_at, dateKind: "actual" });
        else out.push(completeWithoutActual(base, j.scheduled_start, now, tz));
      } else if (SCHEDULED.has(js) && j.scheduled_start) {
        out.push(scheduledEvent(base, j.scheduled_start, now, tz));
      } else if (ACTIVE.has(js)) {
        out.push({ ...base, status: "in_progress", date: j.scheduled_start, dateKind: j.scheduled_start ? "scheduled" : "unknown" });
      }
      continue;
    }
    for (const v of vs) {
      const s = (v.status ?? "").toLowerCase();
      if (DEAD.has(s)) continue;
      const base = { key: `visit:${v.id}`, jobId: j.id, jobSource: "platform" as const, label, propertyId: mapProperty(v.property_id ?? j.property_id) };
      if (COMPLETE.has(s)) {
        // Only a recorded finish time is a completion date; a start time is not.
        if (v.actual_end_at) out.push({ ...base, status: "completed", date: v.actual_end_at, dateKind: "actual" });
        else out.push(completeWithoutActual(base, v.scheduled_date, now, tz));
      } else if (ACTIVE.has(s)) {
        out.push({ ...base, status: "in_progress", date: v.actual_start_at ?? v.scheduled_date, dateKind: v.actual_start_at ? "actual" : v.scheduled_date ? "scheduled" : "unknown" });
      } else if (SCHEDULED.has(s) && v.scheduled_date) {
        // Use the booked local time when present; missing-time visits stay date-only.
        const at = v.scheduled_start_time ? zonedToUtcIso(v.scheduled_date, v.scheduled_start_time, tz) : null;
        const when = at ?? v.scheduled_date;
        out.push(scheduledEvent(base, when, now, tz));
      }
    }
  }
  return out;
}

export type ServiceSummary = {
  /** All services: recorded completions + past scheduled visits inferred from the schedule. */
  completed: number;
  recordedCompleted: number;
  inferredFromSchedule: number;
  /** Latest completed visit that has any date (actual or planned). */
  lastCompleted: ServiceEvent | null;
  nextScheduled: ServiceEvent | null;
  recent: ServiceEvent[];
};

export const eventTime = (e: ServiceEvent) =>
  e.date ? new Date(isDateOnly(e.date) ? `${e.date}T12:00:00` : e.date).getTime() : Number.NEGATIVE_INFINITY;

export function summarize(events: ServiceEvent[], recentLimit = 5): ServiceSummary {
  const completed = events.filter((e) => e.status === "completed");
  const dated = completed.filter((e) => e.date);
  const lastCompleted = dated.reduce<ServiceEvent | null>((best, e) => (!best || eventTime(e) > eventTime(best) ? e : best), null);
  const upcoming = events.filter((e) => e.status === "scheduled");
  const nextScheduled = upcoming.reduce<ServiceEvent | null>((best, e) => (!best || eventTime(e) < eventTime(best) ? e : best), null);
  const recent = [...events].sort((a, b) => eventTime(b) - eventTime(a)).slice(0, recentLimit);
  const inferred = completed.filter((e) => e.inferred).length;
  return { completed: completed.length, recordedCompleted: completed.length - inferred, inferredFromSchedule: inferred, lastCompleted, nextScheduled, recent };
}

/** Text for a "Last service" stat, always qualifying planned/unknown dates. */
export function lastServiceText(s: ServiceSummary, fmt: (d: string) => string): { value: string; sub?: string } {
  if (s.completed === 0) return { value: "None recorded" };
  const e = s.lastCompleted;
  if (!e || !e.date) return { value: "Date not recorded", sub: "Completion date not recorded" };
  if (e.inferred) return { value: fmt(e.date), sub: "Scheduled day has passed · counted by schedule" };
  if (e.dateKind === "scheduled") return { value: fmt(e.date), sub: "Planned date · completion date not recorded" };
  return { value: fmt(e.date) };
}

export function summarizeByProperty(events: ServiceEvent[]): Map<string | null, ServiceSummary> {
  const groups = new Map<string | null, ServiceEvent[]>();
  for (const e of events) {
    const arr = groups.get(e.propertyId) ?? [];
    arr.push(e);
    groups.set(e.propertyId, arr);
  }
  const out = new Map<string | null, ServiceSummary>();
  for (const [k, v] of groups) out.set(k, summarize(v));
  return out;
}

/** Only show a customer when it belongs to the business currently selected. */
export function customerForBusiness<T extends { business_id?: string | null }>(c: T | null, businessId: string | null): T | null {
  return c && businessId && c.business_id === businessId ? c : null;
}
