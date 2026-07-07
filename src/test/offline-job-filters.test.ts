import { describe, it, expect, beforeAll } from "vitest";
import { filterTodayJobs, filterWeekJobs } from "@/lib/offlineJobFilters";

// This test asserts local-timezone grouping. It is only meaningful when
// the runner is in America/Chicago (UTC-5/-6) — set TZ=America/Chicago
// when running (see package script). We still assert TZ inside the test
// so a wrong TZ fails loudly instead of silently passing.
describe("offline job filters — TZ=America/Chicago", () => {
  beforeAll(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(tz).toBe("America/Chicago");
  });

  it("groups jobs into Today and This Week using the LOCAL calendar", () => {
    // "Now" = 2026-07-06 12:00 local (Monday, Chicago). Week = Mon 7/6 – Sun 7/12.
    const now = new Date(2026, 6, 6, 12, 0, 0);

    // Job A: 2026-07-06 09:00 local (today)
    const jobA = { scheduled_start: new Date(2026, 6, 6, 9, 0, 0).toISOString() };
    // Job B: 2026-07-08 (Wed of same week)
    const jobB = { scheduled_start: new Date(2026, 6, 8, 8, 0, 0).toISOString() };
    // Control: last week — must NOT appear in either bucket
    const jobC = { scheduled_start: new Date(2026, 5, 29, 9, 0, 0).toISOString() };

    const jobs = [jobA, jobB, jobC];

    const today = filterTodayJobs(jobs, now);
    const week = filterWeekJobs(jobs, now);

    expect(today).toHaveLength(1);
    expect(week).toHaveLength(2);
    expect(today[0]).toBe(jobA);
    expect(week).toContain(jobA);
    expect(week).toContain(jobB);
  });

  it("does not off-by-one an evening job into tomorrow (regression)", () => {
    // 2026-07-06 21:00 local Chicago = 2026-07-07 02:00 UTC.
    // toISOString-based grouping would place this on 7/7 — filterToday
    // must still count it as 7/6.
    const now = new Date(2026, 6, 6, 22, 0, 0);
    const eveningJob = { scheduled_start: new Date(2026, 6, 6, 21, 0, 0).toISOString() };
    expect(filterTodayJobs([eveningJob], now)).toHaveLength(1);
  });
});