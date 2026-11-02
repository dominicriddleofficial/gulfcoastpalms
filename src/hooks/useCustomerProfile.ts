import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  jobberJobEvents, platformJobEvents,
  type JobberJobRow, type PlatformJobRow, type PlatformVisitRow, type ServiceEvent,
} from "@/lib/customers/customerDetail";

export type ProfileProperty = {
  id: string;
  /** Which table the address lives in (decides the Edit target). */
  kind: "jobber_property" | "platform_property";
  /** Platform customer that owns a platform property (for EditAddressDialog). */
  ownerCustomerId: string | null;
  label: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  verified: boolean;
  gateCode: string | null;
  accessNotes: string | null;
};

export type ContactPrefs = { doNotContact: boolean; preferredMethod: string | null };

export type CustomerProfile = {
  properties: ProfileProperty[];
  events: ServiceEvent[];
  /** null = no linked record holds preferences (nothing restricts contact). */
  prefs: ContactPrefs | null;
  /** True when more than one record matched; contact stays off rather than guessing. */
  linkAmbiguous: boolean;
};

type Page<T> = { data: T[] | null; error: { message: string } | null };
const PAGE = 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Read every row (not just the default first 1000). */
async function all<T>(fetchPage: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

function chunks<T>(arr: T[], size = 150): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type PlatformCust = { id: string; source_system: string | null; source_record_id: string | null; do_not_contact_flag: boolean | null; preferred_contact_method: string | null };
type JobberClient = { id: string; jobber_id: string };
const PC_COLS = "id, source_system, source_record_id, do_not_contact_flag, preferred_contact_method";

type Identity = { jobber: JobberClient | null; platform: PlatformCust | null; ambiguous: boolean };

/** Resolve both sides of a Jobber↔platform customer link inside one business, by source ids only. */
async function resolveIdentity(source: "jobber" | "platform", id: string, businessId: string): Promise<Identity> {
  if (source === "jobber") {
    const c = await supabase.from("jobber_clients").select("id, jobber_id").eq("id", id).eq("business_id", businessId).maybeSingle();
    if (c.error) throw new Error(c.error.message);
    if (!c.data) throw new Error("Customer not found in this business");
    // Production has both forms: source_record_id = jobber_clients.jobber_id (most) or = jobber_clients.id.
    const keys = [c.data.jobber_id, c.data.id].filter(Boolean);
    const p = await supabase.from("platform_customers").select(PC_COLS)
      .eq("business_id", businessId).eq("source_system", "jobber").in("source_record_id", keys).limit(3);
    if (p.error) throw new Error(p.error.message);
    const rows = (p.data ?? []) as PlatformCust[];
    return { jobber: c.data, platform: rows.length === 1 ? rows[0] : null, ambiguous: rows.length > 1 };
  }
  const p = await supabase.from("platform_customers").select(PC_COLS).eq("id", id).eq("business_id", businessId).maybeSingle();
  if (p.error) throw new Error(p.error.message);
  if (!p.data) throw new Error("Customer not found in this business");
  const pc = p.data as PlatformCust;
  if (pc.source_system !== "jobber" || !pc.source_record_id) return { jobber: null, platform: pc, ambiguous: false };
  const sri = pc.source_record_id;
  const [byExt, byId] = await Promise.all([
    supabase.from("jobber_clients").select("id, jobber_id").eq("business_id", businessId).eq("jobber_id", sri).limit(3),
    UUID_RE.test(sri)
      ? supabase.from("jobber_clients").select("id, jobber_id").eq("business_id", businessId).eq("id", sri).limit(3)
      : Promise.resolve({ data: [] as JobberClient[], error: null }),
  ]);
  if (byExt.error) throw new Error(byExt.error.message);
  if (byId.error) throw new Error(byId.error.message);
  const found = new Map<string, JobberClient>();
  for (const r of [...(byExt.data ?? []), ...(byId.data ?? [])]) found.set(r.id, r);
  const list = [...found.values()];
  return { jobber: list.length === 1 ? list[0] : null, platform: pc, ambiguous: list.length > 1 };
}

const PJ_COLS = "id, job_number, title, status, property_id, scheduled_start, completed_at, deleted_at, source_system, source_record_id";
const PV_COLS = "id, job_id, property_id, status, scheduled_date, actual_start_at, actual_end_at";
type PJ = PlatformJobRow & { source_system: string | null; source_record_id: string | null };
type PP = {
  id: string; property_label: string | null; address_1: string | null; address_2: string | null; city: string | null;
  state: string | null; zip: string | null; country: string | null; latitude: number | null; longitude: number | null;
  address_verified: boolean | null; gate_code: string | null; access_notes: string | null;
  source_system: string | null; source_record_id: string | null;
};
type JP = {
  id: string; jobber_id: string; street1: string | null; street2: string | null; city: string | null; state: string | null;
  zip: string | null; country: string | null; lat: number | null; lng: number | null; address_verified: boolean | null;
};

export async function fetchCustomerProfile(
  source: "jobber" | "platform", customerId: string, businessId: string, now = new Date(),
): Promise<CustomerProfile> {
  const ident = await resolveIdentity(source, customerId, businessId);
  const jc = ident.jobber;
  const pc = ident.platform;

  const [jProps, jJobs, pProps, pJobs] = await Promise.all([
    jc ? all<JP>((f, t) => supabase.from("jobber_properties")
      .select("id, jobber_id, street1, street2, city, state, zip, country, lat, lng, address_verified")
      .eq("business_id", businessId).eq("client_id", jc.id).order("created_at", { ascending: false }).range(f, t)) : Promise.resolve([] as JP[]),
    jc ? all<JobberJobRow>((f, t) => supabase.from("jobber_jobs")
      .select("id, job_number, title, status, visit_status, scheduled_start, property_id")
      .eq("business_id", businessId).eq("client_id", jc.id).order("id").range(f, t)) : Promise.resolve([] as JobberJobRow[]),
    pc ? all<PP>((f, t) => supabase.from("platform_properties")
      .select("id, property_label, address_1, address_2, city, state, zip, country, latitude, longitude, address_verified, gate_code, access_notes, source_system, source_record_id")
      .eq("business_id", businessId).eq("customer_id", pc.id).order("created_at", { ascending: false }).range(f, t)) : Promise.resolve([] as PP[]),
    pc ? all<PJ>((f, t) => supabase.from("platform_jobs").select(PJ_COLS)
      .eq("business_id", businessId).eq("customer_id", pc.id).is("deleted_at", null).order("id").range(f, t)) : Promise.resolve([] as PJ[]),
  ]);

  // Mirrors of Jobber jobs we already read from jobber_jobs are dropped (no double count).
  const jobberJobIds = new Set(jJobs.map((j) => j.id));
  const keptJobs = pJobs.filter((j) => !(j.source_system === "jobber" && j.source_record_id && jobberJobIds.has(j.source_record_id)));

  const visits: PlatformVisitRow[] = [];
  for (const ids of chunks(keptJobs.map((j) => j.id))) {
    visits.push(...await all<PlatformVisitRow>((f, t) => supabase.from("platform_job_visits").select(PV_COLS)
      .eq("business_id", businessId).in("job_id", ids).order("id").range(f, t)));
  }
  const completedAt = new Map<string, string>();
  for (const ids of chunks([...jobberJobIds])) {
    const rows = await all<{ jobber_job_id: string | null; completed_at: string | null }>((f, t) => supabase.from("job_visit_events")
      .select("jobber_job_id, completed_at").eq("business_id", businessId).in("jobber_job_id", ids)
      .not("completed_at", "is", null).order("id").range(f, t));
    for (const r of rows) {
      if (!r.jobber_job_id || !r.completed_at) continue;
      const prev = completedAt.get(r.jobber_job_id);
      if (!prev || r.completed_at > prev) completedAt.set(r.jobber_job_id, r.completed_at);
    }
  }

  // Property identity: mirror platform property.source_record_id = jobber_properties.jobber_id.
  const jByExternal = new Map(jProps.map((p) => [p.jobber_id, p.id]));
  const jById = new Map(jProps.map((p) => [p.id, p.jobber_id]));
  const mirrorToJobber = new Map<string, string>();
  const jobberToMirror = new Map<string, string>();
  for (const p of pProps) {
    if (p.source_system === "jobber" && p.source_record_id && jByExternal.has(p.source_record_id)) {
      const jid = jByExternal.get(p.source_record_id) as string;
      mirrorToJobber.set(p.id, jid);
      jobberToMirror.set(jid, p.id);
    }
  }

  const toPlatformCard = (p: PP): ProfileProperty => ({
    id: p.id, kind: "platform_property", ownerCustomerId: pc?.id ?? null, label: p.property_label,
    street1: p.address_1, street2: p.address_2, city: p.city, state: p.state, zip: p.zip, country: p.country,
    lat: p.latitude, lng: p.longitude, verified: !!p.address_verified, gateCode: p.gate_code, accessNotes: p.access_notes,
  });
  const toJobberCard = (p: JP): ProfileProperty => ({
    id: p.id, kind: "jobber_property", ownerCustomerId: null, label: null,
    street1: p.street1, street2: p.street2, city: p.city, state: p.state, zip: p.zip, country: p.country,
    lat: p.lat, lng: p.lng, verified: !!p.address_verified, gateCode: null, accessNotes: null,
  });

  let properties: ProfileProperty[];
  let mapJobber: (id: string | null) => string | null;
  let mapPlatform: (id: string | null) => string | null;
  const pIds = new Set(pProps.map((p) => p.id));
  if (source === "jobber") {
    // Jobber addresses, plus native-only addresses of the linked app customer as their own cards.
    properties = [...jProps.map(toJobberCard), ...pProps.filter((p) => !mirrorToJobber.has(p.id) && p.source_system !== "jobber").map(toPlatformCard)];
    const shown = new Set(properties.map((p) => p.id));
    mapJobber = (id) => (id && jById.has(id) ? id : null);
    mapPlatform = (id) => (!id ? null : mirrorToJobber.get(id) ?? (shown.has(id) ? id : null));
  } else {
    properties = pProps.map(toPlatformCard);
    mapJobber = (id) => (id ? jobberToMirror.get(id) ?? null : null);
    mapPlatform = (id) => (id && pIds.has(id) ? id : null);
  }

  const events = [
    ...jobberJobEvents(jJobs, completedAt, now, mapJobber),
    ...platformJobEvents(keptJobs, visits, now, mapPlatform),
  ];

  return {
    properties,
    events,
    prefs: pc ? { doNotContact: !!pc.do_not_contact_flag, preferredMethod: pc.preferred_contact_method } : null,
    linkAmbiguous: ident.ambiguous,
  };
}

export const customerProfileKey = (businessId: string | null, source: string, id: string) =>
  ["customer-profile", businessId, source, id] as const;

export function useCustomerProfile(source: "jobber" | "platform", customerId: string, businessId: string | null) {
  return useQuery({
    queryKey: customerProfileKey(businessId, source, customerId),
    queryFn: () => fetchCustomerProfile(source, customerId, businessId as string),
    enabled: !!businessId,
    // Never show another customer's / workspace's profile while loading.
    placeholderData: undefined,
    staleTime: 60_000,
  });
}
