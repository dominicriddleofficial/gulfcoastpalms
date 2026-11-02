/**
 * Pure helpers + query runner for the platform universal search.
 * Kept free of React so it can be unit-tested with a mocked client.
 */

export type SearchEntityType = "customer" | "lead" | "quote" | "job" | "invoice" | "property" | "crew";
export type RecordSource = "platform" | "jobber";

export interface SearchResult {
  type: SearchEntityType;
  id: string;
  source: RecordSource;
  title: string;
  subtitle: string;
  path: string;
  /** 0 = exact, 1 = prefix, 2 = partial. Lower sorts first. */
  rank: number;
  meta?: { status?: string | null; amount?: number | null };
}

export interface NormalizedQuery {
  raw: string;
  /** Digits only (for phones / numbers). */
  digits: string;
  /** Record number core with prefix/#/leading zeros removed, e.g. "GCP-I-000018" → "18". */
  numberCore: string | null;
  /** LIKE pattern matching formatted phones, or null if too few digits. */
  phonePattern: string | null;
}

export function normalizeQuery(input: string): NormalizedQuery {
  const raw = input.trim().replace(/\s+/g, " ");
  const digits = raw.replace(/\D/g, "");
  let numberCore: string | null = null;
  // "#123", "GCP-I-000123", "INV 123", "Q-0042", "334701"
  const m = raw.match(/^#?\s*(?:[a-z]{1,6}[\s-]*){0,3}#?\s*(\d+)$/i);
  if (m) numberCore = m[1].replace(/^0+(?=\d)/, "");
  const onlyPhoneChars = /^[\d\s().+-]+$/.test(raw);
  const phonePattern = onlyPhoneChars && digits.length >= 4 ? `%${digits.split("").join("%")}%` : null;
  return { raw, digits, numberCore, phonePattern };
}

/** Escape LIKE wildcards so user input is matched literally. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Quote a value for a PostgREST `or=(...)` filter so commas/parens/quotes are literal. */
export function quotePostgrest(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Build a safe PostgREST OR filter of `col.ilike.<pattern>` clauses. */
export function ilikeOr(clauses: Array<[column: string, pattern: string | null]>): string {
  return clauses
    .filter((c): c is [string, string] => !!c[1])
    .map(([col, pat]) => `${col}.ilike.${quotePostgrest(pat)}`)
    .join(",");
}

export function containsPattern(q: NormalizedQuery): string {
  return `%${escapeLike(q.raw)}%`;
}

/** Pattern matching a record number ending in the numeric core ("...000018"). */
export function numberPattern(q: NormalizedQuery): string | null {
  return q.numberCore ? `%${escapeLike(q.numberCore)}` : null;
}

export function rankFor(q: NormalizedQuery, fields: Array<string | null | undefined>): number {
  const needle = q.raw.toLowerCase();
  let best = 2;
  for (const f of fields) {
    if (!f) continue;
    const v = f.toLowerCase();
    if (v === needle) return 0;
    const fd = f.replace(/\D/g, "");
    if (fd) {
      if (q.numberCore && fd.replace(/^0+(?=\d)/, "") === q.numberCore) return 0;
      if (q.digits.length >= 7 && fd === q.digits) return 0;
    }
    if (v.startsWith(needle)) best = Math.min(best, 1);
  }
  return best;
}

// ── Deep links ──────────────────────────────────────────────────────────────

export const OPEN_PARAM = "open";
export const SOURCE_PARAM = "source";
export const PROPERTY_PARAM = "property";
export const CREW_PARAM = "crew";

const BASE: Record<Exclude<SearchEntityType, "property" | "crew">, string> = {
  customer: "/platform/customers",
  lead: "/platform/leads",
  quote: "/platform/quotes",
  job: "/platform/jobs",
  invoice: "/platform/invoices",
};

export function recordPath(
  type: SearchEntityType,
  id: string,
  source: RecordSource = "platform",
  opts: { ownerId?: string | null } = {},
): string {
  if (type === "crew") {
    return `/platform/settings?${CREW_PARAM}=${encodeURIComponent(id)}#crew-members`;
  }
  if (type === "property") {
    const owner = opts.ownerId;
    if (!owner) return "";
    const p = new URLSearchParams({ [OPEN_PARAM]: owner, [SOURCE_PARAM]: source, [PROPERTY_PARAM]: id });
    return `${BASE.customer}?${p.toString()}`;
  }
  const p = new URLSearchParams({ [OPEN_PARAM]: id });
  if (type === "customer" || type === "job") p.set(SOURCE_PARAM, source);
  return `${BASE[type]}?${p.toString()}`;
}

export function parseRecordParams(search: string): { id: string; source: RecordSource; propertyId: string | null } | null {
  const p = new URLSearchParams(search);
  const id = p.get(OPEN_PARAM);
  if (!id || !/^[0-9a-f-]{8,64}$/i.test(id)) return null;
  const source: RecordSource = p.get(SOURCE_PARAM) === "jobber" ? "jobber" : "platform";
  return { id, source, propertyId: p.get(PROPERTY_PARAM) };
}

// ── Role permissions (mirror PlatformRoutes RoleRoute allow-lists) ─────────

export type SearchRole = "owner" | "office_manager" | "manager" | "crew" | null;

const ROUTE_ROLES: Record<SearchEntityType, ReadonlyArray<Exclude<SearchRole, null>>> = {
  customer: ["owner", "office_manager", "manager"],
  property: ["owner", "office_manager", "manager"], // opens on the customers page
  lead: ["owner", "office_manager", "manager"],
  quote: ["owner", "office_manager", "manager"],
  job: ["owner", "office_manager", "manager"],
  invoice: ["owner", "office_manager"],
  crew: ["owner", "office_manager"], // opens on the settings page
};

/** Record types whose destination page this role may open. Unknown role → nothing. */
export function allowedSearchTypes(role: SearchRole): Set<SearchEntityType> {
  const out = new Set<SearchEntityType>();
  if (!role) return out;
  (Object.keys(ROUTE_ROLES) as SearchEntityType[]).forEach((t) => { if (ROUTE_ROLES[t].includes(role)) out.add(t); });
  return out;
}

const SPEC_TYPE: Record<string, SearchEntityType> = {
  jobber_clients: "customer", platform_customers: "customer", jobber_jobs: "job", platform_jobs: "job",
  platform_invoices: "invoice", platform_quotes: "quote", platform_leads: "lead",
  jobber_properties: "property", platform_properties: "property", platform_crew_members: "crew",
};

// ── Runner ──────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;
interface QueryResult { data: Row[] | null; error: unknown }
// Minimal surface of the Supabase query builder used here (thenable).
interface Builder extends PromiseLike<QueryResult> {
  select: (s: string) => Builder;
  eq: (c: string, v: string) => Builder;
  or: (f: string) => Builder;
  is: (c: string, v: null) => Builder;
  limit: (n: number) => Builder;
}
export interface SearchClient { from: (t: string) => unknown }

export interface SearchOutcome {
  results: SearchResult[];
  failedSources: string[];
  /** Number of sources actually queried for this role. */
  attempted: number;
}

const s = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const n = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));

export async function runUniversalSearch(
  client: SearchClient,
  businessId: string,
  input: string,
  opts: { isOwner: boolean; allowedTypes: Set<SearchEntityType> },
): Promise<SearchOutcome> {
  const q = normalizeQuery(input);
  const like = containsPattern(q);
  const num = numberPattern(q);
  const phone = q.phonePattern;
  const from = (t: string) => (client.from(t) as Builder);

  const specs: Array<{ key: string; run: () => PromiseLike<QueryResult> }> = [
    { key: "jobber_clients", run: () => from("jobber_clients").select("id, display_name, company_name, phone, email")
      .eq("business_id", businessId)
      .or(ilikeOr([["display_name", like], ["company_name", like], ["email", like], ["phone", like], ["phone", phone]])).limit(8) },
    { key: "platform_customers", run: () => from("platform_customers").select("id, display_name, company_name, phone, email")
      .eq("business_id", businessId)
      .or(ilikeOr([["display_name", like], ["company_name", like], ["email", like], ["phone", like], ["phone", phone], ["secondary_phone", phone]])).limit(8) },
    { key: "jobber_jobs", run: () => from("jobber_jobs").select("id, title, job_number, status, client_name, property_address, total_amount")
      .eq("business_id", businessId)
      .or(ilikeOr([["title", like], ["job_number", like], ["job_number", num], ["client_name", like], ["property_address", like], ["client_phone", phone]])).limit(8) },
    { key: "platform_jobs", run: () => from("platform_jobs").select("id, title, job_number, status, total")
      .eq("business_id", businessId).is("deleted_at", null)
      .or(ilikeOr([["title", like], ["job_number", like], ["job_number", num]])).limit(8) },
    { key: "platform_invoices", run: () => from("platform_invoices").select("id, invoice_number, total, status, billing_name")
      .eq("business_id", businessId).is("deleted_at", null)
      .or(ilikeOr([["invoice_number", like], ["invoice_number", num], ["billing_name", like]])).limit(8) },
    { key: "platform_quotes", run: () => from("platform_quotes").select("id, quote_number, total, status, billing_name")
      .eq("business_id", businessId).is("deleted_at", null)
      .or(ilikeOr([["quote_number", like], ["quote_number", num], ["billing_name", like]])).limit(8) },
    { key: "platform_leads", run: () => from("platform_leads").select("id, inquiry_name, inquiry_phone, inquiry_email, requested_service, lead_status")
      .eq("business_id", businessId)
      .or(ilikeOr([["inquiry_name", like], ["inquiry_email", like], ["inquiry_phone", like], ["inquiry_phone", phone]])).limit(6) },
    { key: "jobber_properties", run: () => from("jobber_properties").select("id, client_id, street1, city, zip")
      .eq("business_id", businessId)
      .or(ilikeOr([["street1", like], ["city", like], ["zip", like], ["formatted_address", like]])).limit(6) },
    { key: "platform_properties", run: () => from("platform_properties").select("id, customer_id, address_1, city, zip")
      .eq("business_id", businessId)
      .or(ilikeOr([["address_1", like], ["city", like], ["zip", like], ["formatted_address", like]])).limit(6) },
    { key: "platform_crew_members", run: () => from("platform_crew_members").select("id, display_name, phone, email, role")
      .eq("business_id", businessId)
      .or(ilikeOr([["display_name", like], ["email", like], ["phone", like], ["phone", phone]])).limit(5) },
  ];

  const permitted = specs.filter((sp) => opts.allowedTypes.has(SPEC_TYPE[sp.key]));
  const settled = await Promise.all(permitted.map(async (sp) => {
    try { return { key: sp.key, res: await sp.run() }; }
    catch (error) { return { key: sp.key, res: { data: null, error } as QueryResult }; }
  }));

  const failedSources: string[] = [];
  const rows: Record<string, Row[]> = Object.fromEntries(specs.map((sp) => [sp.key, [] as Row[]]));
  for (const { key, res } of settled) {
    if (res.error) failedSources.push(key);
    rows[key] = res.data ?? [];
  }

  const out: SearchResult[] = [];
  const push = (r: Omit<SearchResult, "path"> & { path?: string }) => {
    const path = r.path ?? recordPath(r.type, r.id, r.source);
    if (path && opts.allowedTypes.has(r.type)) out.push({ ...r, path });
  };

  for (const [key, source] of [["platform_customers", "platform"], ["jobber_clients", "jobber"]] as const) {
    rows[key].forEach((c) => push({
      type: "customer", id: String(c.id), source,
      title: s(c.display_name) ?? s(c.company_name) ?? "Customer",
      subtitle: [s(c.phone), s(c.email), source === "jobber" ? "Jobber" : null].filter(Boolean).join(" · "),
      rank: rankFor(q, [s(c.display_name), s(c.company_name), s(c.phone), s(c.email)]),
    }));
  }
  rows.platform_jobs.forEach((j) => push({
    type: "job", id: String(j.id), source: "platform",
    title: s(j.title) ?? s(j.job_number) ?? "Job",
    subtitle: [s(j.job_number) ? `#${s(j.job_number)}` : null, s(j.status)].filter(Boolean).join(" · "),
    rank: rankFor(q, [s(j.job_number), s(j.title)]),
    meta: { status: s(j.status), amount: opts.isOwner ? n(j.total) : null },
  }));
  rows.jobber_jobs.forEach((j) => push({
    type: "job", id: String(j.id), source: "jobber",
    title: s(j.client_name) ?? s(j.title) ?? s(j.job_number) ?? "Job",
    subtitle: [s(j.job_number) ? `#${s(j.job_number)}` : null, s(j.property_address), "Jobber"].filter(Boolean).join(" · "),
    rank: rankFor(q, [s(j.job_number), s(j.client_name), s(j.title), s(j.property_address)]),
    meta: { status: s(j.status), amount: opts.isOwner ? n(j.total_amount) : null },
  }));
  rows.platform_invoices.forEach((i) => push({
    type: "invoice", id: String(i.id), source: "platform",
    title: s(i.invoice_number) ?? "Invoice",
    subtitle: [s(i.billing_name), s(i.status)].filter(Boolean).join(" · "),
    rank: rankFor(q, [s(i.invoice_number), s(i.billing_name)]),
    meta: { status: s(i.status), amount: opts.isOwner ? n(i.total) : null },
  }));
  rows.platform_quotes.forEach((x) => push({
    type: "quote", id: String(x.id), source: "platform",
    title: s(x.quote_number) ?? "Quote",
    subtitle: [s(x.billing_name), s(x.status)].filter(Boolean).join(" · "),
    rank: rankFor(q, [s(x.quote_number), s(x.billing_name)]),
    meta: { status: s(x.status), amount: opts.isOwner ? n(x.total) : null },
  }));
  rows.platform_leads.forEach((l) => push({
    type: "lead", id: String(l.id), source: "platform",
    title: s(l.inquiry_name) ?? "Lead",
    subtitle: [s(l.inquiry_phone), s(l.requested_service), s(l.lead_status)].filter(Boolean).join(" · "),
    rank: rankFor(q, [s(l.inquiry_name), s(l.inquiry_phone), s(l.inquiry_email)]),
  }));
  // Properties link to their owning customer; skip orphans rather than show a dead result.
  rows.platform_properties.forEach((p) => push({
    type: "property", id: String(p.id), source: "platform",
    title: [s(p.address_1), s(p.city)].filter(Boolean).join(", ") || "Property",
    subtitle: [s(p.zip)].filter(Boolean).join(" · "),
    rank: rankFor(q, [s(p.address_1), s(p.zip)]),
    path: recordPath("property", String(p.id), "platform", { ownerId: s(p.customer_id) }),
  }));
  rows.jobber_properties.forEach((p) => push({
    type: "property", id: String(p.id), source: "jobber",
    title: [s(p.street1), s(p.city)].filter(Boolean).join(", ") || "Property",
    subtitle: [s(p.zip), "Jobber"].filter(Boolean).join(" · "),
    rank: rankFor(q, [s(p.street1), s(p.zip)]),
    path: recordPath("property", String(p.id), "jobber", { ownerId: s(p.client_id) }),
  }));
  rows.platform_crew_members.forEach((c) => push({
    type: "crew", id: String(c.id), source: "platform",
    title: s(c.display_name) ?? "Crew member",
    subtitle: [s(c.role), s(c.phone)].filter(Boolean).join(" · "),
    rank: rankFor(q, [s(c.display_name), s(c.phone), s(c.email)]),
  }));

  // Dedup by type + source + id (never by name), then exact → prefix → partial.
  const seen = new Set<string>();
  const results = out
    .filter((r) => {
      const k = `${r.type}:${r.source}:${r.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.rank - b.r.rank || a.i - b.i)
    .map(({ r }) => r);

  return { results, failedSources, attempted: permitted.length };
}
