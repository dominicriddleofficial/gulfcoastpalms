import { useMemo } from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type NormalizedScheduleSource = "platform" | "jobber_import" | "jobber_synced";

export type DashboardScheduledJob = {
  id: string;
  source: NormalizedScheduleSource;
  job_id: string;
  visit_id: string | null;
  jobber_id: string | null;
  dedupe_key: string;
  job_number: string | null;
  title: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  address: string | null;
  scheduled_start: string;
  scheduled_end: string | null;
  status: string;
  total_amount: number;
  business_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  property_address: string | null;
  visit_status: string | null;
  scheduled_local_date: string;
  amount_counted: number;
  internal_notes: string | null;
  assigned_employee_names: string[] | null;
  property_id: string | null;
  service_items: unknown;
};

export type DashboardScheduledJobsSummary = {
  jobCount: number;
  revenueTotal: number;
};

export type UseDashboardScheduledJobsOptions = {
  businessId: string | null;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
};

type ScheduleJobsRpcRow = {
  id: string;
  source: string | null;
  jobber_id: string | null;
  visit_id: string | null;
  job_id: string | null;
  customer_email: string | null;
  address: string | null;
  title: string | null;
  customer_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  property_address: string | null;
  status: string | null;
  visit_status: string | null;
  scheduled_start: string;
  scheduled_end: string | null;
  total_amount: number | string | null;
  job_number: string | null;
  internal_notes: string | null;
  assigned_employee_names: string[] | null;
  business_id: string | null;
  property_id: string | null;
  service_items: unknown;
};

function toAmount(value: number | string | null): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function cleanStatus(value: string | null): string {
  return (value ?? "scheduled").toLowerCase();
}

export function summarizeDashboardScheduledJobs(
  jobs: DashboardScheduledJob[],
): DashboardScheduledJobsSummary {
  return {
    jobCount: jobs.length,
    revenueTotal: jobs.reduce((s, j) => s + j.amount_counted, 0),
  };
}

export function useDashboardScheduledJobs(opts: UseDashboardScheduledJobsOptions) {
  const { businessId, startDate, endDate, enabled = true } = opts;
  const startKey = startDate ? format(startDate, "yyyy-MM-dd") : "all";
  const endKey = endDate ? format(endDate, "yyyy-MM-dd") : "all";

  const query = useQuery({
    queryKey: ["dashboard-scheduled-jobs", businessId, startKey, endKey],
    enabled: enabled && !!businessId,
    queryFn: () => fetchDashboardScheduledJobs({ businessId, startDate, endDate }),
  });

  const summary = useMemo(
    () => summarizeDashboardScheduledJobs(query.data ?? []),
    [query.data],
  );

  return { ...query, jobs: query.data ?? [], summary };
}

export function dashboardScheduledJobsKey(
  businessId: string | null,
  startDate?: Date,
  endDate?: Date,
) {
  const startKey = startDate ? format(startDate, "yyyy-MM-dd") : "all";
  const endKey = endDate ? format(endDate, "yyyy-MM-dd") : "all";
  return ["dashboard-scheduled-jobs", businessId, startKey, endKey] as const;
}

export function prefetchDashboardScheduledJobs(
  qc: QueryClient,
  opts: { businessId: string | null; startDate?: Date; endDate?: Date },
) {
  if (!opts.businessId) return Promise.resolve();
  return qc.prefetchQuery({
    queryKey: dashboardScheduledJobsKey(opts.businessId, opts.startDate, opts.endDate),
    queryFn: () => fetchDashboardScheduledJobs(opts),
  });
}

export async function fetchDashboardScheduledJobs(
  opts: { businessId: string | null; startDate?: Date; endDate?: Date },
): Promise<DashboardScheduledJob[]> {
  const { businessId, startDate, endDate } = opts;
  if (!businessId || !startDate || !endDate) return [];

  const { data, error } = await supabase.rpc("get_schedule_jobs", {
    p_business_id: businessId,
    p_start: startDate.toISOString(),
    p_end: endDate.toISOString(),
  });
  if (error) throw error;
  const rows = (data ?? []) as unknown as ScheduleJobsRpcRow[];

  return rows
    .filter((r): r is ScheduleJobsRpcRow & { scheduled_start: string } => !!r.scheduled_start)
    .map((r) => {
      const amount = toAmount(r.total_amount);
      const rawSource = r.source ?? "platform";
      const source: NormalizedScheduleSource =
        rawSource === "jobber_synced" || rawSource === "jobber_import" || rawSource === "platform"
          ? rawSource
          : "platform";
      const dedupeKey = r.jobber_id
        ? `jobber:${r.jobber_id}`
        : `platform:${r.job_id ?? r.id}:${r.visit_id ?? "job"}`;
      return {
        id: r.id,
        source,
        job_id: r.job_id ?? r.id,
        visit_id: r.visit_id,
        jobber_id: r.jobber_id,
        dedupe_key: dedupeKey,
        job_number: r.job_number,
        title: r.title,
        customer_id: r.customer_id,
        customer_name: r.client_name,
        customer_phone: r.client_phone,
        customer_email: r.customer_email,
        address: r.address ?? r.property_address ?? null,
        scheduled_start: r.scheduled_start,
        scheduled_end: r.scheduled_end,
        status: cleanStatus(r.status),
        total_amount: amount,
        business_id: r.business_id,
        client_name: r.client_name,
        client_phone: r.client_phone,
        property_address: r.property_address ?? r.address ?? null,
        visit_status: cleanStatus(r.visit_status),
        scheduled_local_date: format(new Date(r.scheduled_start), "yyyy-MM-dd"),
        amount_counted: amount,
        internal_notes: r.internal_notes,
        assigned_employee_names: r.assigned_employee_names,
        property_id: r.property_id,
        service_items: r.service_items,
      };
    });
}
