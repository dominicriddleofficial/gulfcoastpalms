import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, unknown>;
const db: Record<string, Row[]> = {};
const calls: { table: string; filters: string[] }[] = [];

function builder(table: string) {
  const preds: ((r: Row) => boolean)[] = [];
  const filters: string[] = [];
  calls.push({ table, filters });
  let lim = Infinity; let from = 0; let to = Infinity; let single = false;
  const run = () => {
    const rows = (db[table] ?? []).filter((r) => preds.every((p) => p(r))).slice(from, Math.min(to + 1, from + lim));
    return single ? { data: rows[0] ?? null, error: null } : { data: rows, error: null };
  };
  const b = {
    select: () => b,
    eq: (c: string, v: unknown) => { filters.push(`${c}=${String(v)}`); preds.push((r) => r[c] === v); return b; },
    in: (c: string, v: unknown[]) => { filters.push(`${c} in`); preds.push((r) => v.includes(r[c])); return b; },
    is: (c: string, v: unknown) => { preds.push((r) => (r[c] ?? null) === v); return b; },
    not: (c: string) => { preds.push((r) => r[c] != null); return b; },
    order: () => b,
    limit: (n: number) => { lim = n; return b; },
    range: (f: number, t: number) => { from = f; to = t; return b; },
    maybeSingle: () => { single = true; return Promise.resolve(run()); },
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  };
  return b;
}
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (t: string) => builder(t) } }));

import { fetchCustomerProfile } from "./useCustomerProfile";
import { summarize, summarizeByProperty } from "@/lib/customers/customerDetail";

const BIZ = "biz-1", OTHER = "biz-2";
const JC = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-11-02T15:00:00Z");

beforeEach(() => {
  calls.length = 0;
  for (const k of Object.keys(db)) delete db[k];
  db.jobber_clients = [{ id: JC, jobber_id: "EXT-1", business_id: BIZ }];
  // Linked by INTERNAL id (one of the 3 production profiles of this shape).
  db.platform_customers = [
    { id: "pc-1", business_id: BIZ, source_system: "jobber", source_record_id: JC, do_not_contact_flag: false, preferred_contact_method: "text" },
    { id: "pc-x", business_id: OTHER, source_system: "jobber", source_record_id: JC, do_not_contact_flag: true, preferred_contact_method: null },
  ];
  db.jobber_properties = [{ id: "jp-1", jobber_id: "PEXT-1", client_id: JC, business_id: BIZ, street1: "1 A St" }];
  db.platform_properties = [
    { id: "pp-mirror", customer_id: "pc-1", business_id: BIZ, source_system: "jobber", source_record_id: "PEXT-1", address_1: "1 A St" },
    { id: "pp-native", customer_id: "pc-1", business_id: BIZ, source_system: null, source_record_id: null, address_1: "9 Native Rd" },
  ];
  db.jobber_jobs = [
    { id: "jj-1", client_id: JC, business_id: BIZ, job_number: "1", status: "requires_invoicing", visit_status: "completed", scheduled_start: "2026-05-01T14:00:00Z", property_id: "jp-1" },
    { id: "jj-x", client_id: JC, business_id: OTHER, job_number: "9", status: "late", visit_status: "completed", scheduled_start: "2026-05-01T14:00:00Z", property_id: "jp-1" },
  ];
  db.job_visit_events = [{ id: "e1", jobber_job_id: "jj-1", business_id: BIZ, completed_at: "2026-05-01T19:30:00Z" }];
  db.platform_jobs = [
    // Mirror of jj-1: must not be counted again.
    { id: "pj-mirror", customer_id: "pc-1", business_id: BIZ, status: "completed", source_system: "jobber", source_record_id: "jj-1", property_id: "pp-mirror", deleted_at: null, job_number: "M" },
    { id: "pj-native", customer_id: "pc-1", business_id: BIZ, status: "scheduled", source_system: null, source_record_id: null, property_id: "pp-native", deleted_at: null, job_number: "N" },
  ];
  db.platform_job_visits = [
    { id: "v-m", job_id: "pj-mirror", business_id: BIZ, status: "completed", scheduled_date: "2026-05-01", actual_start_at: null, actual_end_at: null },
    { id: "v-n", job_id: "pj-native", business_id: BIZ, status: "completed", scheduled_date: "2026-08-01", actual_start_at: "2026-08-01T13:00:00Z", actual_end_at: "2026-08-01T16:00:00Z" },
  ];
});

describe("fetchCustomerProfile linkage", () => {
  it("jobber and linked native profiles agree, dedupe mirrors and keep actual Jobber completion", async () => {
    const j = await fetchCustomerProfile("jobber", JC, BIZ, NOW);
    const p = await fetchCustomerProfile("platform", "pc-1", BIZ, NOW);
    for (const prof of [j, p]) {
      const s = summarize(prof.events);
      expect(s.completed).toBe(2);
      expect(prof.events.some((e) => e.jobId === "pj-mirror")).toBe(false);
      const jobber = prof.events.find((e) => e.jobId === "jj-1");
      expect(jobber?.jobSource).toBe("jobber");
      expect(jobber?.dateKind).toBe("actual");
      expect(jobber?.date).toBe("2026-05-01T19:30:00Z");
    }
    expect(j.prefs?.preferredMethod).toBe("text");
    expect(j.linkAmbiguous).toBe(false);
    // Jobber view: jobber address + native-only address as its own editable card.
    expect(j.properties.map((x) => [x.id, x.kind])).toEqual([["jp-1", "jobber_property"], ["pp-native", "platform_property"]]);
    expect(j.properties[1].ownerCustomerId).toBe("pc-1");
    const byJ = summarizeByProperty(j.events);
    expect(byJ.get("jp-1")?.completed).toBe(1);
    expect(byJ.get("pp-native")?.completed).toBe(1);
    // Native view: Jobber job attributed to the mirror property.
    expect(summarizeByProperty(p.events).get("pp-mirror")?.completed).toBe(1);
  });

  it("links through external Jobber ids too and scopes every query to the business", async () => {
    db.platform_customers[0].source_record_id = "EXT-1";
    const j = await fetchCustomerProfile("jobber", JC, BIZ, NOW);
    expect(j.prefs).not.toBeNull();
    expect(j.events.some((e) => e.jobId === "jj-x")).toBe(false);
    for (const c of calls) expect(c.filters).toContain(`business_id=${BIZ}`);
  });

  it("rejects ambiguous links instead of guessing", async () => {
    db.platform_customers.push({ id: "pc-2", business_id: BIZ, source_system: "jobber", source_record_id: "EXT-1", do_not_contact_flag: false, preferred_contact_method: null });
    const j = await fetchCustomerProfile("jobber", JC, BIZ, NOW);
    expect(j.linkAmbiguous).toBe(true);
    expect(j.prefs).toBeNull();
    expect(j.events.map((e) => e.jobId)).toEqual(["jj-1"]);
  });

  it("fails rather than showing another business's customer", async () => {
    await expect(fetchCustomerProfile("jobber", JC, OTHER, NOW)).rejects.toThrow();
  });
});
