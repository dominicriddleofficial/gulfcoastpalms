import { describe, it, expect } from "vitest";
import { change, fmtChange, fmtRate, rangeFor, rate, summaryCsv, type SiteSummary } from "./websiteAnalytics";
import { planningAmounts } from "@/pages/platform/finance/TaxCenterPanel";

describe("website numbers", () => {
  it("no earlier data shows no change instead of a fake percentage", () => {
    expect(change(12, 0)).toBeNull();
    expect(change(12, undefined)).toBeNull();
    expect(fmtChange(null)).toBe("no earlier data");
    expect(change(15, 10)).toBeCloseTo(0.5);
  });
  it("rates use their own denominator and show — when it is zero", () => {
    expect(rate(5, 0)).toBeNull();
    expect(fmtRate(rate(5, 0))).toBe("—");
    expect(fmtRate(rate(1, 3))).toBe("33%");
  });
  it("the previous period is the same length as the chosen one", () => {
    const r = rangeFor("30", new Date("2026-11-03T00:00:00Z"));
    expect(r?.days).toBe(30);
    const c = rangeFor("custom", new Date(), { from: "2026-10-01", to: "2026-10-07" });
    expect(c?.days).toBe(7);
    expect(rangeFor("custom", new Date(), { from: "2026-10-07", to: "2026-10-01" })).toBeNull();
  });
  it("CSV export neutralises formulas from page paths or sources", () => {
    const s = { site: "GCP", from: "a", to: "b", current: {}, prior: {}, daily: [], pages: [], landing: [], buttons: [], campaigns: [], devices: [],
      sources: [{ source: "=cmd()", sessions: 1, contacted: 0 }] } as unknown as SiteSummary;
    expect(summaryCsv(s)).toContain("'=cmd()");
  });
});

describe("tax planning set-aside", () => {
  const m = Array.from({ length: 12 }, (_, i) => ({ receipts: i < 3 ? 100000 : 0, refunds: 0, expenses: i === 0 ? 20000 : 0, payroll: 0 }));
  it("uses only the entered rate, with no default", () => {
    expect(planningAmounts(m, null)[0].planCents).toBeNull();
    expect(planningAmounts(m, 20)[0]).toEqual({ quarter: 1, netCents: 280000, planCents: 56000 });
  });
  it("a loss quarter plans zero, not a negative amount", () => {
    const loss = m.map((x, i) => (i === 3 ? { ...x, expenses: 5000 } : x));
    expect(planningAmounts(loss, 20)[1].planCents).toBe(0);
  });
});
