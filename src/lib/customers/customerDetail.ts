/**
 * Pure helpers for the customer detail panel: phone/email/address actions and
 * service-history derivation. Kept free of React/Supabase so they are testable.
 */

// ── Phones ──────────────────────────────────────────────────────────────────

export type PhoneInfo = {
  /** Original text exactly as stored (used for Copy). */
  raw: string;
  /** Human-friendly display. */
  display: string;
  /** tel: href (with extension as a post-dial pause) or null when unusable. */
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
  if (!hasPlus && digits.length === 10) {
    e164 = `+1${digits}`;
  } else if (!hasPlus && digits.length === 11 && digits.startsWith("1")) {
    e164 = `+${digits}`;
  } else if (hasPlus && digits.length >= 8 && digits.length <= 15) {
    e164 = `+${digits}`;
  }
  if (e164 && e164.startsWith("+1") && e164.length === 12) {
    const d = e164.slice(2);
    display = `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    if (extension) display += ` ext. ${extension}`;
  }
  if (!e164) return { raw, display: raw, telHref: null, smsHref: null, extension };
  return {
    raw,
    display,
    telHref: `tel:${e164}${extension ? `,${extension}` : ""}`,
    smsHref: `sms:${e164}`,
    extension,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function mailtoHref(email: string | null | undefined): string | null {
  const e = (email ?? "").trim();
  if (!EMAIL_RE.test(e)) return null;
  return `mailto:${encodeURIComponent(e).replace(/%40/g, "@")}`;
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
  const line2 = [clean(a.city), stateZip].filter(Boolean).join(", ");
  return { line1, line2 };
}

export function fullAddress(a: AddressParts): string {
  const { line1, line2 } = addressLines(a);
  return [line1, line2].filter(Boolean).join(", ");
}

/**
 * Apple Maps driving directions from the device's current location.
 * The written street address wins over stored coordinates (coordinates can be
 * stale or belong to an old geocode). Coordinates are only used when the street
 * is missing and the address was verified. City-only addresses never route.
 */
export function appleMapsDirectionsUrl(a: AddressParts): string | null {
  if (clean(a.street1)) {
    const dest = fullAddress(a);
    return `https://maps.apple.com/?daddr=${encodeURIComponent(dest)}&dirflg=d`;
  }
  if (a.verified && typeof a.lat === "number" && typeof a.lng === "number"
    && Number.isFinite(a.lat) && Number.isFinite(a.lng) && !(a.lat === 0 && a.lng === 0)) {
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
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand?.("copy") ?? false;
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
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
  /** yyyy-mm-dd or ISO timestamp. */
  date: string | null;
  /** "actual" = recorded finish/start time; "scheduled" = planned date only. */
  dateKind: "actual" | "scheduled";
};

const COMPLETE = new Set(["complete", "completed"]);
const DEAD_JOB = new Set(["deleted", "cancelled", "canceled", "void"]);

export type JobberJobRow = {
  id: string; job_number: string | null; title: string | null; status: string | null;
  visit_status: string | null; scheduled_start: string | null; property_id: string | null;
};

/** One Jobber job = one visit record in our mirror. */
export function jobberJobEvents(
  jobs: JobberJobRow[], completedAt: Map<string, string>, now: Date,
): ServiceEvent[] {
  const out: ServiceEvent[] = [];
  for (const j of jobs) {
    const st = (j.status ?? "").toLowerCase();
    if (DEAD_JOB.has(st)) continue;
    const vs = (j.visit_status ?? "").toLowerCase();
    const done = completedAt.get(j.id);
    const label = j.job_number ? `Job #${j.job_number}` : j.title || "Job";
    const base = { key: `jobber:${j.id}`, jobId: j.id, jobSource: "jobber" as const, label, propertyId: j.property_id };
    if (done || COMPLETE.has(vs)) {
      out.push({ ...base, status: "completed", date: done ?? j.scheduled_start, dateKind: done ? "actual" : "scheduled" });
    } else if (j.scheduled_start) {
      const future = new Date(j.scheduled_start).getTime() >= now.getTime();
      out.push({ ...base, status: future && vs !== "late" ? "scheduled" : "overdue", date: j.scheduled_start, dateKind: "scheduled" });
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
  scheduled_date: string | null; actual_start_at: string | null; actual_end_at: string | null;
};

const todayKey = (now: Date) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

export function platformJobEvents(
  jobs: PlatformJobRow[], visits: PlatformVisitRow[], now: Date,
  mapProperty: (id: string | null) => string | null = (id) => id,
): ServiceEvent[] {
  const today = todayKey(now);
  const byJob = new Map<string, PlatformVisitRow[]>();
  for (const v of visits) {
    const arr = byJob.get(v.job_id) ?? [];
    arr.push(v);
    byJob.set(v.job_id, arr);
  }
  const out: ServiceEvent[] = [];
  for (const j of jobs) {
    if (j.deleted_at || DEAD_JOB.has((j.status ?? "").toLowerCase())) continue;
    const label = j.job_number ? `Job ${j.job_number}` : j.title || "Job";
    const vs = byJob.get(j.id) ?? [];
    if (vs.length === 0) {
      const base = { key: `platform-job:${j.id}`, jobId: j.id, jobSource: "platform" as const, label, propertyId: mapProperty(j.property_id) };
      if (COMPLETE.has((j.status ?? "").toLowerCase()) && j.completed_at) {
        out.push({ ...base, status: "completed", date: j.completed_at, dateKind: "actual" });
      } else if (j.scheduled_start && (j.status ?? "") === "scheduled") {
        out.push({ ...base, status: j.scheduled_start >= today ? "scheduled" : "overdue", date: j.scheduled_start, dateKind: "scheduled" });
      }
      continue;
    }
    for (const v of vs) {
      const s = (v.status ?? "").toLowerCase();
      if (DEAD_JOB.has(s)) continue;
      const base = { key: `visit:${v.id}`, jobId: j.id, jobSource: "platform" as const, label, propertyId: mapProperty(v.property_id ?? j.property_id) };
      if (COMPLETE.has(s)) {
        const actual = v.actual_end_at ?? v.actual_start_at;
        out.push({ ...base, status: "completed", date: actual ?? v.scheduled_date, dateKind: actual ? "actual" : "scheduled" });
      } else if (s === "in_progress") {
        out.push({ ...base, status: "in_progress", date: v.actual_start_at ?? v.scheduled_date, dateKind: v.actual_start_at ? "actual" : "scheduled" });
      } else if (v.scheduled_date) {
        out.push({ ...base, status: v.scheduled_date >= today ? "scheduled" : "overdue", date: v.scheduled_date, dateKind: "scheduled" });
      }
    }
  }
  return out;
}

export type ServiceSummary = {
  completed: number;
  lastCompleted: ServiceEvent | null;
  nextScheduled: ServiceEvent | null;
  recent: ServiceEvent[];
};

const ts = (e: ServiceEvent) => (e.date ? new Date(e.date.length === 10 ? `${e.date}T12:00:00` : e.date).getTime() : 0);

export function summarize(events: ServiceEvent[], recentLimit = 5): ServiceSummary {
  const completed = events.filter((e) => e.status === "completed");
  const lastCompleted = completed.reduce<ServiceEvent | null>((best, e) => (!best || ts(e) > ts(best) ? e : best), null);
  const upcoming = events.filter((e) => e.status === "scheduled");
  const nextScheduled = upcoming.reduce<ServiceEvent | null>((best, e) => (!best || ts(e) < ts(best) ? e : best), null);
  const recent = [...events].sort((a, b) => ts(b) - ts(a)).slice(0, recentLimit);
  return { completed: completed.length, lastCompleted, nextScheduled, recent };
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
