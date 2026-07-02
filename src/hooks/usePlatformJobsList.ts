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
  const { data, error } = await supabase.rpc("get_jobs_list", {
    p_business_id: businessId,
  });
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    id: string;
    jobber_id: string | null;
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
    total_amount: number | string | null;
    business_id: string | null;
    source: string;
    missing_address: boolean | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    jobber_id: r.jobber_id ?? "",
    title: r.title,
    status: r.status,
    visit_status: r.visit_status,
    scheduled_start: r.scheduled_start,
    scheduled_end: r.scheduled_end,
    client_name: r.client_name,
    client_phone: r.client_phone,
    property_address: r.property_address,
    assigned_employee_names: r.assigned_employee_names,
    internal_notes: r.internal_notes,
    job_number: r.job_number,
    total_amount: r.total_amount == null ? null : Number(r.total_amount),
    business_id: r.business_id,
    source: r.source === "jobber" ? "jobber" : "platform",
    missing_address: !!r.missing_address,
  }));
}