import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type DashboardScheduledJob = {
  id: string;
  job_id: string;
  jobber_id: string | null;
  visit_id: string | null;
  dedupe_key: string;
  title: string | null;
  client_name: string | null;
  client_phone: string | null;
  property_address: string | null;
  status: string;
  visit_status: string | null;
  scheduled_start: string;
  scheduled_end: string | null;
  scheduled_local_date: string;
  total_amount: number;
  amount_counted: number;
  job_number: string | null;
  internal_notes: string | null;
  assigned_employee_names: string[] | null;
  business_id: string | null;
  property_id: string | null;
  service_items: unknown;
  source: "jobber_jobs";
};

type RawScheduledJob = {
  id: string;
  jobber_id: string | null;
  title: string | null;
  client_name: string | null;
  client_phone: string | null;
  property_address: string | null;
  status: string | null;
  visit_status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  total_amount: number | string | null;
  job_number: string | null;
  internal_notes: string | null;
  assigned_employee_names: string[] | null;
  business_id: string | null;
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

const EXCLUDED_STATUSES = new Set([
  "archived",
  "canceled",
  "cancelled",
  "deleted",
]);

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isExcluded(row: RawScheduledJob): boolean {
  return (
    EXCLUDED_STATUSES.has(normalizeStatus(row.status)) ||
    EXCLUDED_STATUSES.has(normalizeStatus(row.visit_status))
  );
}

function localDateKey(value: string): string {
  return format(new Date(value), "yyyy-MM-dd");
}

function toAmount(value: number | string | null): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeScheduledJobs(rows: RawScheduledJob[]): DashboardScheduledJob[] {
  const byKey = new Map<string, DashboardScheduledJob>();

  for (const row of rows) {
    if (!row.scheduled_start) continue;
    if (isExcluded(row)) continue;

    const jobId = row.jobber_id ?? row.id;
    const visitId = null;
    const dedupeKey = visitId ?? jobId;
    const amount = toAmount(row.total_amount);
    const normalized: DashboardScheduledJob = {
      id: row.id,
      job_id: jobId,
      jobber_id: row.jobber_id,
      visit_id: visitId,
      dedupe_key: dedupeKey,
      title: row.title,
      client_name: row.client_name,
      client_phone: row.client_phone,
      property_address: row.property_address,
      status: normalizeStatus(row.status) || "scheduled",
      visit_status: row.visit_status ? normalizeStatus(row.visit_status) : null,
      scheduled_start: row.scheduled_start,
      scheduled_end: row.scheduled_end,
      scheduled_local_date: localDateKey(row.scheduled_start),
      total_amount: amount,
      amount_counted: amount,
      job_number: row.job_number,
      internal_notes: row.internal_notes,
      assigned_employee_names: row.assigned_employee_names,
      business_id: row.business_id,
      property_id: row.property_id,
      service_items: row.service_items,
      source: "jobber_jobs",
    };

    const existing = byKey.get(dedupeKey);
    if (!existing) {
      byKey.set(dedupeKey, normalized);
      continue;
    }

    const existingUpdatedAt = new Date(existing.scheduled_start).getTime();
    const nextUpdatedAt = new Date(normalized.scheduled_start).getTime();
    if (nextUpdatedAt < existingUpdatedAt) byKey.set(dedupeKey, normalized);
  }

  return Array.from(byKey.values()).sort(
    (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime(),
  );
}

export function summarizeDashboardScheduledJobs(
  jobs: DashboardScheduledJob[],
): DashboardScheduledJobsSummary {
  return {
    jobCount: jobs.length,
    revenueTotal: jobs.reduce((sum, job) => sum + job.amount_counted, 0),
  };
}

export function useDashboardScheduledJobs(opts: UseDashboardScheduledJobsOptions) {
  const { businessId, startDate, endDate, enabled = true } = opts;
  const startKey = startDate ? startDate.toISOString() : "all";
  const endKey = endDate ? endDate.toISOString() : "all";

  const query = useQuery({
    queryKey: ["dashboard-scheduled-jobs", businessId, startKey, endKey],
    enabled: enabled && !!businessId,
    queryFn: async (): Promise<DashboardScheduledJob[]> => {
      let q = supabase
        .from("jobber_jobs")
        .select(
          "id, jobber_id, title, client_name, client_phone, property_address, status, visit_status, scheduled_start, scheduled_end, total_amount, job_number, internal_notes, assigned_employee_names, business_id, property_id, service_items",
        )
        .not("scheduled_start", "is", null)
        .order("scheduled_start", { ascending: true, nullsFirst: false });

      if (businessId) q = q.eq("business_id", businessId);
      if (startDate) q = q.gte("scheduled_start", startDate.toISOString());
      if (endDate) q = q.lte("scheduled_start", endDate.toISOString());

      const { data, error } = await q;
      if (error) throw error;

      return normalizeScheduledJobs((data ?? []) as RawScheduledJob[]);
    },
  });

  const summary = useMemo(
    () => summarizeDashboardScheduledJobs(query.data ?? []),
    [query.data],
  );

  return { ...query, jobs: query.data ?? [], summary };
}
