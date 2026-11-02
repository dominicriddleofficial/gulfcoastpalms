import { describe, it, expect, vi, afterEach } from "vitest";
import {
  lastServiceText, usablePreference, customerForBusiness, parsePhone, mailtoHref, appleMapsDirectionsUrl, fullAddress, copyText,
  jobberJobEvents, platformJobEvents, summarize, summarizeByProperty,
} from "./customerDetail";

const NOW = new Date("2026-11-02T15:00:00Z");

describe("phones", () => {
  it("formats US numbers and builds tel/sms", () => {
    const p = parsePhone("850.555.1234");
    expect(p?.display).toBe("(850) 555-1234");
    expect(p?.telHref).toBe("tel:+18505551234");
    expect(p?.smsHref).toBe("sms:+18505551234");
    expect(p?.raw).toBe("850.555.1234");
  });
  it("keeps international + numbers", () => {
    expect(parsePhone("+44 20 7946 0958")?.telHref).toBe("tel:+442079460958");
  });
  it("dials extensions after a pause but texts the base number", () => {
    const p = parsePhone("(850) 555-1234 ext 42");
    expect(p?.telHref).toBe("tel:+18505551234,42");
    expect(p?.smsHref).toBe("sms:+18505551234");
    expect(p?.display).toBe("(850) 555-1234 ext. 42");
  });
  it("gives no links for incomplete numbers", () => {
    const p = parsePhone("555-12");
    expect(p?.telHref).toBeNull();
    expect(p?.smsHref).toBeNull();
    expect(parsePhone("  ")).toBeNull();
  });
  it("validates emails", () => {
    expect(mailtoHref("a+b@x.com")).toBe("mailto:a%2Bb@x.com");
    expect(mailtoHref("nope")).toBeNull();
  });
});

describe("Apple Maps directions", () => {
  const base = { street1: "12 Palm Way", street2: "Unit 4", city: "Navarre", state: "FL", zip: "32566" };
  it("encodes the full address with driving mode", () => {
    expect(fullAddress(base)).toBe("12 Palm Way, Unit 4, Navarre, FL 32566");
    expect(appleMapsDirectionsUrl(base)).toBe(
      "https://maps.apple.com/?daddr=12%20Palm%20Way%2C%20Unit%204%2C%20Navarre%2C%20FL%2032566&dirflg=d");
  });
  it("prefers the written address over stored coordinates", () => {
    expect(appleMapsDirectionsUrl({ ...base, lat: 1, lng: 2, verified: true })).toContain("daddr=12%20Palm");
  });
  it("never routes to city only; uses verified coordinates when street missing", () => {
    const noStreet = { street1: null, street2: null, city: "Navarre", state: "FL", zip: null };
    expect(appleMapsDirectionsUrl(noStreet)).toBeNull();
    expect(appleMapsDirectionsUrl({ ...noStreet, lat: 30.4, lng: -86.8, verified: false })).toBeNull();
    expect(appleMapsDirectionsUrl({ ...noStreet, lat: 30.4, lng: -86.8, verified: true })).toBe("https://maps.apple.com/?daddr=30.4,-86.8&dirflg=d");
  });
});

describe("copyText", () => {
  afterEach(() => vi.restoreAllMocks());
  it("reports failure when clipboard and fallback both fail", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }, configurable: true });
    (document as unknown as { execCommand: () => boolean }).execCommand = () => false;
    expect(await copyText("x")).toBe(false);
  });
  it("reports success", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
    expect(await copyText("x")).toBe(true);
  });
});

describe("service history", () => {
  const pj = (id: string, extra: Partial<Parameters<typeof platformJobEvents>[0][number]> = {}) => ({
    id, job_number: id, title: null, status: "scheduled", property_id: "A", scheduled_start: null, completed_at: null, deleted_at: null, ...extra,
  });
  const pv = (id: string, job: string, status: string, extra: Record<string, string | null> = {}) => ({
    id, job_id: job, property_id: null as string | null, status, scheduled_date: "2026-01-01", actual_start_at: null, actual_end_at: null, ...extra,
  });

  it("counts both complete aliases per property and uses actual dates", () => {
    const ev = platformJobEvents(
      [pj("j1"), pj("j2", { property_id: "B" })],
      [pv("v1", "j1", "complete", { actual_end_at: "2026-03-05T20:00:00Z" }), pv("v2", "j1", "completed"),
        pv("v3", "j2", "completed"), pv("v4", "j2", "scheduled", { scheduled_date: "2026-12-01" })],
      NOW);
    const by = summarizeByProperty(ev);
    expect(by.get("A")?.completed).toBe(2);
    expect(by.get("B")?.completed).toBe(1);
    expect(by.get("B")?.nextScheduled?.date).toBe("2026-12-01");
    expect(by.get("A")?.lastCompleted?.dateKind).toBe("actual");
    // actual_start_at alone is not a completion date
    const startOnly = platformJobEvents([pj("s")], [pv("x", "s", "completed", { actual_start_at: "2026-03-05T13:00:00Z" })], NOW);
    expect(startOnly[0].dateKind).toBe("scheduled");
    expect(summarize(ev).completed).toBe(3);
  });

  it("excludes deleted/cancelled and past unconfirmed visits from completed", () => {
    const ev = platformJobEvents(
      [pj("j1", { deleted_at: "2026-01-01" }), pj("j2", { status: "cancelled" }), pj("j3")],
      [pv("a", "j1", "completed"), pv("b", "j2", "completed"), pv("c", "j3", "cancelled"), pv("d", "j3", "scheduled")],
      NOW);
    const s = summarize(ev);
    expect(s.completed).toBe(0);
    expect(s.nextScheduled).toBeNull();
    expect(ev.map((e) => e.status)).toEqual(["overdue"]);
  });

  it("jobber: completion evidence beats job status; late is not completed; deleted skipped", () => {
    const jobs = [
      { id: "1", job_number: "1", title: null, status: "requires_invoicing", visit_status: "completed", scheduled_start: "2026-02-01T14:00:00Z", property_id: "P" },
      { id: "2", job_number: "2", title: null, status: "late", visit_status: "late", scheduled_start: "2026-03-01T14:00:00Z", property_id: "P" },
      { id: "3", job_number: "3", title: null, status: "deleted", visit_status: "upcoming", scheduled_start: "2026-12-01T14:00:00Z", property_id: "P" },
      { id: "4", job_number: "4", title: null, status: "upcoming", visit_status: "upcoming", scheduled_start: "2026-12-10T14:00:00Z", property_id: "P" },
      { id: "5", job_number: "5", title: null, status: "late", visit_status: "late", scheduled_start: "2026-04-01T14:00:00Z", property_id: "P" },
    ];
    const ev = jobberJobEvents(jobs, new Map([["5", "2026-04-02T18:00:00Z"]]), NOW);
    const s = summarize(ev);
    expect(s.completed).toBe(2);
    expect(s.lastCompleted?.jobId).toBe("5");
    expect(s.lastCompleted?.dateKind).toBe("actual");
    expect(s.nextScheduled?.jobId).toBe("4");
    expect(ev.find((e) => e.jobId === "1")?.dateKind).toBe("scheduled");
  });

  it("maps mirrored native jobs to jobber properties and drops unknown mappings to null", () => {
    const ev = platformJobEvents([pj("n1", { property_id: "mirror" })], [pv("v", "n1", "completed")], NOW,
      (id) => (id === "mirror" ? "jobberProp" : null));
    expect(ev[0].propertyId).toBe("jobberProp");
  });

  it("counts a completed job with no visits once, without inventing a date", () => {
    const ev = platformJobEvents([pj("j", { status: "completed" })], [], NOW);
    expect(summarize(ev).completed).toBe(1);
    expect(ev[0].dateKind).toBe("unknown");
    expect(lastServiceText(summarize(ev), (d) => d).sub).toBe("Completion date not recorded");
  });

  it("labels planned dates in the summary", () => {
    const ev = platformJobEvents([pj("j")], [pv("v", "j", "complete")], NOW);
    expect(lastServiceText(summarize(ev), (d) => d)).toEqual({ value: "2026-01-01", sub: "Planned date · completion date not recorded" });
  });

  it("only genuinely scheduled statuses count as bookings; today handled by date vs timestamp", () => {
    const today = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, "0")}-${String(NOW.getDate()).padStart(2, "0")}`;
    const ev = platformJobEvents([pj("j")], [
      pv("a", "j", "skipped", { scheduled_date: "2026-12-01" }),
      pv("b", "j", "scheduled", { scheduled_date: today }),
    ], NOW);
    expect(ev.map((e) => [e.key, e.status])).toEqual([["visit:b", "scheduled"]]);
    const jj = jobberJobEvents([{ id: "t", job_number: null, title: null, status: "upcoming", visit_status: "upcoming", scheduled_start: "2026-11-02T13:00:00Z", property_id: null }], new Map(), NOW);
    expect(jj[0].status).toBe("overdue");
    expect(summarize(jj).nextScheduled).toBeNull();
  });
});

describe("contact preference + business guard", () => {
  it("hides preferences for channels the customer can't use", () => {
    expect(usablePreference("phone", { phone: null, secondary_phone: null, email: null })).toBeNull();
    expect(usablePreference("text", { phone: "8505551234", secondary_phone: null, email: null })).toBe("Prefers texts");
    expect(usablePreference("email", { phone: null, secondary_phone: null, email: "bad" })).toBeNull();
  });
  it("only returns a customer that belongs to the selected business", () => {
    const c = { id: "1", business_id: "A" };
    expect(customerForBusiness(c, "A")).toBe(c);
    expect(customerForBusiness(c, "B")).toBeNull();
    expect(customerForBusiness(c, null)).toBeNull();
  });
  it("includes country and rejects out-of-range coordinates", () => {
    expect(fullAddress({ street1: "1 A", street2: null, city: "Toronto", state: "ON", zip: "M5V", country: "Canada" })).toBe("1 A, Toronto, ON M5V, Canada");
    expect(appleMapsDirectionsUrl({ street1: null, street2: null, city: null, state: null, zip: null, lat: 120, lng: 10, verified: true })).toBeNull();
  });
  it("removes the fallback textarea even when copying throws", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    (document as unknown as { execCommand: () => boolean }).execCommand = () => { throw new Error("x"); };
    expect(await copyText("x")).toBe(false);
    expect(document.querySelectorAll("textarea").length).toBe(0);
  });
});
