/**
 * Local-timezone date helpers.
 *
 * Timestamps are stored in UTC (correct); calendar math (grouping, day keys,
 * "today"/"tomorrow" labels) must happen in the user's local timezone. Never
 * use `new Date("YYYY-MM-DD")` on a date-only string (spec-parsed as UTC
 * midnight → shifts a day back in America/Chicago), and never build a day key
 * with `toISOString().slice(0, 10)` (spec-converted to UTC → an evening job
 * jumps to tomorrow).
 */

/** Parse a "YYYY-MM-DD" string as local midnight. */
export function parseDateOnlyLocal(dateStr: string): Date {
  if (!dateStr) throw new Error("dateStr cannot be empty");
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    throw new Error(`Invalid date value: ${dateStr}`);
  }
  return d;
}

/** Format a Date as "YYYY-MM-DD" using local calendar fields. */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local midnight for the given date. */
export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Local 23:59:59.999 for the given date. */
export function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Today's date-only key in local time. */
export function todayLocalKey(): string {
  return toLocalDateKey(new Date());
}

/** Add N days (local) and return the resulting Date. */
export function addLocalDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}