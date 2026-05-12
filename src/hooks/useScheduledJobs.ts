import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ScheduledJobRow = {
  id: string;
  title: string | null;
  client_name: string | null;
  client_phone: string | null;
  property_address: string | null;
  status: string;
  visit_status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  total_amount: number | null;
  job_number: string | null;
  internal_notes: string | null;
  assigned_employee_names: string[] | null;
  business_id: string | null;
  service_items: unknown;
};

const EXCLUDED_STATUSES = new Set([
  "archived",
  "canceled",
  "cancelled",
  "deleted",
]);

export type UseScheduledJobsOptions = {
  businessId: string | null;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
};

/**
 * Single source of truth for scheduled Jobber jobs.
 * Used by PlatformSchedule and the Dashboard "Scheduled Job Value" chart.
 *
 * Filters applied identically on both surfaces:
 *  - business_id scope
 *  - scheduled_start IS NOT NULL
 *  - excludes archived / canceled / deleted (status OR visit_status)
 *  - dedup by job id
 *  - optional [startDate, endDate] window on scheduled_start
 */
export function useScheduledJobs(opts: UseScheduledJobsOptions) {
  const { businessId, startDate, endDate, enabled = true } = opts;

  const startKey = startDate ? startDate.toISOString() : "all";
  const endKey = endDate ? endDate.toISOString() : "all";

  return useQuery({
    queryKey: ["scheduled-jobs", businessId, startKey, endKey],
    enabled: enabled && !!businessId,
    queryFn: async (): Promise<ScheduledJobRow[]> => {
      let q = supabase
        .from("jobber_jobs")
        .select(
          "id, title, client_name, client_phone, property_address, status, visit_status, scheduled_start, scheduled_end, total_amount, job_number, internal_notes, assigned_employee_names, business_id, service_items"
        )
        .not("scheduled_start", "is", null)
        .order("scheduled_start", { ascending: true, nullsFirst: false });
      if (businessId) q = q.eq("business_id", businessId);
      if (startDate) q = q.gte("scheduled_start", startDate.toISOString());
      if (endDate) q = q.lte("scheduled_start", endDate.toISOString());
      const { data, error } = await q;
      if (error) throw error;

      const seen = new Set<string>();
      const out: ScheduledJobRow[] = [];
      for (const row of (data as ScheduledJobRow[]) ?? []) {
        if (seen.has(row.id)) continue;
        const status = (row.status || "").toLowerCase();
        const vstatus = (row.visit_status || "").toLowerCase();
        if (EXCLUDED_STATUSES.has(status) || EXCLUDED_STATUSES.has(vstatus)) continue;
        seen.add(row.id);
        out.push(row);
      }
      return out;
    },
  });
}