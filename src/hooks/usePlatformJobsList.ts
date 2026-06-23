import { supabase } from "@/integrations/supabase/client";

export type JobsListRow = {
  id: string;
  jobber_id: string;
  title: string | null;
  status: string;
  visit_status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  client_name: string | null;
  client_phone: string | null;
  property_address: string | null;
  assigned_employee_names: string[] | null;
  internal_notes: string | null;
  job_number: string | null;
  total_amount: number | null;
  business_id: string | null;
  source?: "jobber" | "platform";
  missing_address?: boolean;
};

export const platformJobsListKey = (businessId: string | null) =>
  ["platform-jobs-list", businessId] as const;

export async function fetchPlatformJobsList(
  businessId: string | null,
): Promise<JobsListRow[]> {
  let q = supabase
    .from("jobber_jobs")
    .select(
      "id, jobber_id, title, status, visit_status, scheduled_start, scheduled_end, client_name, client_phone, property_address, assigned_employee_names, internal_notes, job_number, total_amount, business_id",
    )
    .order("scheduled_start", { ascending: false, nullsFirst: false });
  if (businessId) q = q.eq("business_id", businessId);
  const { data: jobberData } = await q;
  const jobberRows: JobsListRow[] = (jobberData || []).map((j: Record<string, unknown>) => ({
    ...(j as JobsListRow),
    source: "jobber" as const,
    missing_address:
      !(j as { property_address?: string | null }).property_address ||
      !String((j as { property_address?: string | null }).property_address ?? "").trim(),
  }));

  let pq = supabase
    .from("platform_jobs")
    .select(
      "id, job_number, title, status, scheduled_start, scheduled_end, internal_notes, total, business_id, customer_id, platform_customers(display_name, phone), platform_properties(address_1, city)",
    )
    .is("deleted_at", null)
    .order("scheduled_start", { ascending: false, nullsFirst: false });
  if (businessId) pq = pq.eq("business_id", businessId);
  const { data: platformData } = await pq;
  const platformRows: JobsListRow[] = (platformData || []).map((j: Record<string, unknown>) => {
    const r = j as {
      id: string;
      job_number: string | null;
      title: string | null;
      status: string;
      scheduled_start: string | null;
      scheduled_end: string | null;
      internal_notes: string | null;
      total: number | null;
      business_id: string | null;
      platform_customers?: { display_name?: string | null; phone?: string | null } | null;
      platform_properties?: { address_1?: string | null; city?: string | null } | null;
    };
    const prop = r.platform_properties;
    const addr1 = prop?.address_1?.trim?.() ?? "";
    const city = prop?.city?.trim?.() ?? "";
    const hasAddr = !!(addr1 || city);
    return {
      id: r.id,
      jobber_id: "",
      title: r.title,
      status: r.status,
      visit_status: null,
      scheduled_start: r.scheduled_start,
      scheduled_end: r.scheduled_end,
      client_name: r.platform_customers?.display_name ?? null,
      client_phone: r.platform_customers?.phone ?? null,
      property_address: hasAddr ? [addr1, city].filter(Boolean).join(", ") : null,
      assigned_employee_names: null,
      internal_notes: r.internal_notes,
      job_number: r.job_number,
      total_amount: r.total,
      business_id: r.business_id,
      source: "platform" as const,
      missing_address: !hasAddr,
    };
  });

  return [...platformRows, ...jobberRows].sort((a, b) => {
    const ta = a.scheduled_start ? new Date(a.scheduled_start).getTime() : 0;
    const tb = b.scheduled_start ? new Date(b.scheduled_start).getTime() : 0;
    return tb - ta;
  });
}