/**
 * Local-timezone filters for the offline command copy.
 *
 * Timestamps in the mirror are UTC ISO strings; grouping into "today" and
 * "this week" must happen in the user's LOCAL calendar. Uses the shared
 * helpers in `src/lib/localDate.ts` — never `toISOString` or
 * `new Date("YYYY-MM-DD")` on date-only strings (both drift by a day in
 * negative-offset zones like America/Chicago).
 */

import { toLocalDateKey } from "./localDate";

export interface JobLike {
  scheduled_start?: string | null;
}

/** Local calendar day key (YYYY-MM-DD) for a job's start timestamp. */
export function jobLocalDateKey(start?: string | null): string {
  if (!start) return "";
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return "";
  return toLocalDateKey(d);
}

/** Local Monday-Sunday week containing `now` (default = today). */
export function localWeekKeys(now: Date = new Date()): Set<string> {
  const set = new Set<string>();
  const dow = now.getDay(); // 0=Sun ... 6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    set.add(toLocalDateKey(d));
  }
  return set;
}

export function filterTodayJobs<T extends JobLike>(jobs: T[], now: Date = new Date()): T[] {
  const key = toLocalDateKey(now);
  return jobs.filter((j) => jobLocalDateKey(j.scheduled_start) === key);
}

export function filterWeekJobs<T extends JobLike>(jobs: T[], now: Date = new Date()): T[] {
  const wk = localWeekKeys(now);
  return jobs.filter((j) => wk.has(jobLocalDateKey(j.scheduled_start)));
}