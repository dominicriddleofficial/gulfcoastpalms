import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  jobberJobEvents, platformJobEvents,
  type JobberJobRow, type PlatformJobRow, type PlatformVisitRow, type ServiceEvent,
} from "@/lib/customers/customerDetail";

export type ProfileProperty = {
  id: string;
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

export type ContactPrefs = {
  doNotContact: boolean;
  preferredMethod: string | null;
};

export type CustomerProfile = {
  properties: ProfileProperty[];
  events: ServiceEvent[];
  prefs: ContactPrefs | null;
};

type Page<T> = { data: T[] | null; error: { message: string } | null };
const PAGE = 1000;

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

const PJ_COLS = "id, job_number, title, status, property_id, scheduled_start, completed_at, deleted_at";
const PV_COLS = "id, job_id, property_id, status, scheduled_date, actual_start_at, actual_end_at";

async function platformHistory(businessId: string, customerId: string, nativeOnly: boolean) {
  const jobs = await all<PlatformJobRow & { source_system?: string | null }>((f, t) => {
    const q = supabase.from("platform_jobs").select(`${PJ_COLS}, source_system`)
      .eq("business_id", businessId).eq("customer_id", customerId).is("deleted_at", null)
      .order("id").range(f, t);
    return q;
  });
  // A Jobber-linked customer's mirror jobs duplicate the Jobber originals.
  const kept = nativeOnly ? jobs.filter((j) => j.source_system !== "jobber") : jobs;
  const visits: PlatformVisitRow[] = [];
  for (const ids of chunks(kept.map((j) => j.id))) {
    visits.push(...await all<PlatformVisitRow>((f, t) =>
      supabase.from("platform_job_visits").select(PV_COLS)
        .eq("business_id", businessId).in("job_id", ids).order("id").range(f, t)));
  }
  return { jobs: kept, visits };
}

export async function fetchCustomerProfile(
  source: "jobber" | "platform", customerId: string, businessId: string, now = new Date(),
): Promise<CustomerProfile> {
  if (source === "platform") {
    const [custRes, props, hist] = await Promise.all([
      supabase.from("platform_customers").select("do_not_contact_flag, preferred_contact_method")
        .eq("id", customerId).eq("business_id", businessId).maybeSingle(),
      all((f, t) => supabase.from("platform_properties")
        .select("id, property_label, address_1, address_2, city, state, zip, country, latitude, longitude, address_verified, gate_code, access_notes")
        .eq("business_id", businessId).eq("customer_id", customerId)
        .order("created_at", { ascending: false }).range(f, t)),
      platformHistory(businessId, customerId, false),
    ]);
    if (custRes.error) throw new Error(custRes.error.message);
    return {
      prefs: custRes.data ? { doNotContact: !!custRes.data.do_not_contact_flag, preferredMethod: custRes.data.preferred_contact_method } : null,
      properties: props.map((p) => ({
        id: p.id, label: p.property_label, street1: p.address_1, street2: p.address_2,
        city: p.city, state: p.state, zip: p.zip, country: p.country,
        lat: p.latitude, lng: p.longitude, verified: !!p.address_verified,
        gateCode: p.gate_code, accessNotes: p.access_notes,
      })),
      events: platformJobEvents(hist.jobs, hist.visits, now),
    };
  }

  // Jobber client: jobber_jobs are authoritative; add native (non-mirror) jobs
  // booked against the linked platform customer, mapped by source ids only.
  const clientRes = await supabase.from("jobber_clients").select("jobber_id")
    .eq("id", customerId).eq("business_id", businessId).maybeSingle();
  if (clientRes.error) throw new Error(clientRes.error.message);
  if (!clientRes.data) throw new Error("Customer not found in this business");
  const jobberExternalId = clientRes.data.jobber_id;

  const [props, jobs, linkedRes] = await Promise.all([
    all((f, t) => supabase.from("jobber_properties")
      .select("id, jobber_id, street1, street2, city, state, zip, country, lat, lng, address_verified")
      .eq("business_id", businessId).eq("client_id", customerId)
      .order("created_at", { ascending: false }).range(f, t)),
    all<JobberJobRow>((f, t) => supabase.from("jobber_jobs")
      .select("id, job_number, title, status, visit_status, scheduled_start, property_id")
      .eq("business_id", businessId).eq("client_id", customerId).order("id").range(f, t)),
    supabase.from("platform_customers").select("id, do_not_contact_flag, preferred_contact_method")
      .eq("business_id", businessId).eq("source_system", "jobber").eq("source_record_id", jobberExternalId)
      .limit(2),
  ]);
  if (linkedRes.error) throw new Error(linkedRes.error.message);

  const completedAt = new Map<string, string>();
  for (const ids of chunks(jobs.map((j) => j.id))) {
    const rows = await all((f, t) => supabase.from("job_visit_events").select("jobber_job_id, completed_at")
      .eq("business_id", businessId).in("jobber_job_id", ids).not("completed_at", "is", null).order("id").range(f, t));
    for (const r of rows) {
      if (!r.jobber_job_id || !r.completed_at) continue;
      const prev = completedAt.get(r.jobber_job_id);
      if (!prev || r.completed_at > prev) completedAt.set(r.jobber_job_id, r.completed_at);
    }
  }
  const events = jobberJobEvents(jobs, completedAt, now);

  // Only trust an unambiguous single link.
  const linked = linkedRes.data?.length === 1 ? linkedRes.data[0] : null;
  if (linked) {
    const hist = await platformHistory(businessId, linked.id, true);
    if (hist.jobs.length) {
      const mirrorProps = await all((f, t) => supabase.from("platform_properties").select("id, source_record_id")
        .eq("business_id", businessId).eq("customer_id", linked.id).eq("source_system", "jobber").order("id").range(f, t));
      const byExternal = new Map(props.map((p) => [p.jobber_id, p.id]));
      const toJobber = new Map(mirrorProps.map((m) => [m.id, m.source_record_id ? byExternal.get(m.source_record_id) ?? null : null]));
      events.push(...platformJobEvents(hist.jobs, hist.visits, now, (id) => (id ? toJobber.get(id) ?? null : null)));
    }
  }

  return {
    prefs: linked ? { doNotContact: !!linked.do_not_contact_flag, preferredMethod: linked.preferred_contact_method } : null,
    properties: props.map((p) => ({
      id: p.id, label: null, street1: p.street1, street2: p.street2, city: p.city, state: p.state,
      zip: p.zip, country: p.country, lat: p.lat, lng: p.lng, verified: !!p.address_verified,
      gateCode: null, accessNotes: null,
    })),
    events,
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
