import { describe, it, expect } from "vitest";
import {
  normalizeQuery, ilikeOr, containsPattern, numberPattern, recordPath, parseRecordParams, runUniversalSearch,
} from "./universalSearch";
import { allowedSearchTypes } from "./universalSearch";
const ALL = allowedSearchTypes("owner");

describe("normalizeQuery", () => {
  it("strips displayed prefixes, # and leading zeros from record numbers", () => {
    expect(normalizeQuery("GCP-I-000018").numberCore).toBe("18");
    expect(normalizeQuery("#42").numberCore).toBe("42");
    expect(normalizeQuery("334701").numberCore).toBe("334701");
    expect(normalizeQuery("Smith").numberCore).toBeNull();
  });
  it("builds a formatted-phone pattern from 4+ digits only for phone-like input", () => {
    expect(normalizeQuery("(850) 529-3801").phonePattern).toBe("%8%5%0%5%2%9%3%8%0%1%");
    expect(normalizeQuery("334701").phonePattern).toBe("%3%3%4%7%0%1%");
    expect(normalizeQuery("12 Oak St").phonePattern).toBeNull();
  });
  it("treats LIKE wildcards as literal text", () => {
    expect(containsPattern(normalizeQuery("50%_off"))).toBe("%50\\%\\_off%");
    expect(numberPattern(normalizeQuery("#0042"))).toBe("%42");
  });
});

describe("ilikeOr", () => {
  it("quotes values so commas, parens and quotes cannot break the OR filter", () => {
    const f = ilikeOr([["display_name", '%Smith, (Jr) "Bo"%'], ["phone", null]]);
    expect(f).toBe('display_name.ilike."%Smith, (Jr) \\"Bo\\"%"');
  });
});

describe("record deep links", () => {
  it("round-trips id + source", () => {
    const path = recordPath("customer", "11111111-2222-3333-4444-555555555555", "jobber");
    const url = new URL(path, "http://x");
    expect(url.pathname).toBe("/platform/customers");
    expect(parseRecordParams(url.search)).toEqual({ id: "11111111-2222-3333-4444-555555555555", source: "jobber", propertyId: null });
  });
  it("routes properties to their owning customer, and drops orphans", () => {
    const path = recordPath("property", "aaaaaaaa-0000-0000-0000-000000000001", "platform", { ownerId: "bbbbbbbb-0000-0000-0000-000000000002" });
    expect(parseRecordParams(new URL(path, "http://x").search)).toMatchObject({ id: "bbbbbbbb-0000-0000-0000-000000000002", propertyId: "aaaaaaaa-0000-0000-0000-000000000001" });
    expect(recordPath("property", "aaaaaaaa-0000-0000-0000-000000000001", "platform", { ownerId: null })).toBe("");
  });
  it("routes crew to the crew section of settings", () => {
    expect(recordPath("crew", "c1c1c1c1")).toBe("/platform/settings?crew=c1c1c1c1#crew-members");
  });
  it("rejects malformed ids", () => {
    expect(parseRecordParams("?open=../etc")).toBeNull();
  });
});

function mockClient(tables: Record<string, Array<Record<string, unknown>>>, failing: string[] = []) {
  const calls: Array<{ table: string; or?: string }> = [];
  return {
    calls,
    from(table: string) {
      const call: { table: string; or?: string } = { table };
      calls.push(call);
      const b = {
        select: () => b, eq: () => b, is: () => b, limit: () => b,
        or: (f: string) => { call.or = f; return b; },
        then: (res: (v: unknown) => unknown) =>
          Promise.resolve(failing.includes(table) ? { data: null, error: { message: "boom" } } : { data: tables[table] ?? [], error: null }).then(res),
      };
      return b;
    },
  };
}

describe("runUniversalSearch", () => {
  it("keeps distinct customers with the same name and preserves source", async () => {
    const c = mockClient({
      platform_customers: [{ id: "p1", display_name: "Jane Doe" }],
      jobber_clients: [{ id: "j1", display_name: "Jane Doe" }],
    });
    const { results } = await runUniversalSearch(c, "biz", "Jane", { isOwner: true, allowedTypes: ALL });
    const customers = results.filter((r) => r.type === "customer");
    expect(customers.map((r) => `${r.source}:${r.id}`)).toEqual(["platform:p1", "jobber:j1"]);
    expect(customers[1].path).toBe("/platform/customers?open=j1&source=jobber");
  });
  it("puts an exact invoice number ahead of partial matches", async () => {
    const c = mockClient({ platform_invoices: [
      { id: "i2", invoice_number: "GCP-I-001018" },
      { id: "i1", invoice_number: "GCP-I-000018" },
    ] });
    const { results } = await runUniversalSearch(c, "biz", "18", { isOwner: false, allowedTypes: ALL });
    expect(results[0].id).toBe("i1");
    expect(results[0].path).toBe("/platform/invoices?open=i1");
  });
  it("matches formatted phones from an unformatted query", async () => {
    const c = mockClient({});
    await runUniversalSearch(c, "biz", "334701", { isOwner: false, allowedTypes: ALL });
    const pc = c.calls.find((x) => x.table === "platform_customers");
    expect(pc?.or).toContain('phone.ilike."%3%3%4%7%0%1%"');
  });
  it("reports backend failures instead of pretending there are no matches", async () => {
    const c = mockClient({}, ["platform_invoices"]);
    const out = await runUniversalSearch(c, "biz", "334701", { isOwner: false, allowedTypes: ALL });
    expect(out.failedSources).toEqual(["platform_invoices"]);
  });
  it("omits properties without an owning customer", async () => {
    const c = mockClient({ platform_properties: [{ id: "pp1", customer_id: null, address_1: "1 Main" }] });
    const { results } = await runUniversalSearch(c, "biz", "Main", { isOwner: false, allowedTypes: ALL });
    expect(results.find((r) => r.type === "property")).toBeUndefined();
  });
});
