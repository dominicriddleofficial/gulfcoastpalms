import { describe, it, expect } from "vitest";
import { mergeServiceJobs, periodFor, priorPeriod, toBusinessDateKey, totalsFor, workState, type ServiceJob } from "./serviceWork";

const job = (o: Partial<ServiceJob>): ServiceJob => ({ id: "j", source: "platform", dateKey: "2026-03-01", amount: 100, clientName: null, address: null, status: "scheduled", title: null, ...o });

describe("schedule-based work", () => {
  it("past scheduled work counts as done without a status change", () => {
    expect(workState(job({ dateKey: "2026-03-01" }), "2026-03-02")).toBe("done_by_schedule");
    expect(workState(job({ dateKey: "2026-03-02" }), "2026-03-02")).toBe("booked");
    expect(workState(job({ status: "cancelled" }), "2026-12-01")).toBe("excluded");
  });
  it("Jobber timestamps use Central time, date-only values never shift", () => {
    expect(toBusinessDateKey("2026-03-02T03:00:00Z")).toBe("2026-03-01");
    expect(toBusinessDateKey("2026-03-02")).toBe("2026-03-02");
  });
  it("a Jobber job mirrored into the app is counted once", () => {
    const jobs = mergeServiceJobs(
      [{ id: "p1", status: "scheduled", scheduled_start: "2026-01-05", total: 200, title: null, source_system: "jobber", source_record_id: "jj1", deleted_at: null, customer: null, property: null }],
      [{ id: "jj1", jobber_id: "x", title: null, status: "late", scheduled_start: "2026-01-05T15:00:00Z", total_amount: 200, client_name: null, property_address: null }],
    );
    expect(jobs).toHaveLength(1);
  });
  it("booked work is kept apart from done work", () => {
    const t = totalsFor([job({ dateKey: "2026-01-10", amount: 300 }), job({ id: "b", dateKey: "2026-06-10", amount: 50 })], periodFor(2026, "year", "2026-05-01"), "2026-05-01");
    expect(t.doneValue).toBe(300);
    expect(t.bookedValue).toBe(50);
  });
  it("year to date compares the same window last year", () => {
    const p = periodFor(2026, "ytd", "2026-05-15");
    expect(p).toMatchObject({ start: "2026-01-01", end: "2026-05-16" });
    expect(priorPeriod(p)).toMatchObject({ start: "2025-01-01", end: "2025-05-16" });
  });
});
