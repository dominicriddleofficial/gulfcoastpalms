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
  source: "platform_jobs" | "jobber_import";
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

const EXCLUDED_STATUSES = new Set(["archived", "canceled", "cancelled", "deleted"]);

type VisitRow = {
  id: string;
  business_id: string | null;
  property_id: string | null;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  status: string | null;
  internal_notes: string | null;
  job: {
    id: string;
    job_number: string | null;
    title: string | null;
    total: number | string | null;
    status: string | null;
    source: string | null;
    source_record_id: string | null;
    internal_notes: string | null;
    customer: { display_name: string | null; phone: string | null } | null;
    property: { address_1: string | null; city: string | null; state: string | null } | null;
  } | null;
};

type JobberEnrichRow = {
  id: string;
  client_name: string | null;
  client_phone: string | null;
  property_address: string | null;
  assigned_employee_names: string[] | null;
  service_items: unknown;
  visit_status: string | null;
  total_amount: number | string | null;
};

function combineDateTime(date: string, time: string | null): string {
  // Build a local timestamp string; Date will interpret as local timezone.
  const t = time ?? "00:00:00";
  return new Date(`${date}T${t}`).toISOString();
}

function toAmount(value: number | string | null): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
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
    queryFn: async (): Promise<DashboardScheduledJob[]> => {
      let q = supabase
        .from("platform_job_visits")
        .select(
          `id, business_id, property_id, scheduled_date, scheduled_start_time, scheduled_end_time, status, internal_notes,
           job:platform_jobs!inner(
             id, job_number, title, total, status, source, source_record_id, internal_notes,
             customer:platform_customers(display_name, phone),
             property:platform_properties(address_1, city, state)
           )`,
        )
        .not("scheduled_date", "is", null)
        .order("scheduled_date", { ascending: true });

      if (businessId) q = q.eq("business_id", businessId);
      if (startDate) q = q.gte("scheduled_date", format(startDate, "yyyy-MM-dd"));
      if (endDate) q = q.lte("scheduled_date", format(endDate, "yyyy-MM-dd"));

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as unknown as VisitRow[];

      // Collect jobber source ids to enrich client/property/items info.
      const jobberIds = rows
        .map((r) => r.job?.source_record_id)
        .filter((v): v is string => !!v);

      let enrichMap = new Map<string, JobberEnrichRow>();
      if (jobberIds.length > 0) {
        const { data: jdata } = await supabase
          .from("jobber_jobs")
          .select(
            "id, client_name, client_phone, property_address, assigned_employee_names, service_items, visit_status, total_amount",
          )
          .in("id", jobberIds);
        for (const j of (jdata ?? []) as JobberEnrichRow[]) {
          enrichMap.set(j.id, j);
        }
      }

      const out: DashboardScheduledJob[] = [];
      for (const r of rows) {
        if (!r.job || !r.scheduled_date) continue;
        const jobStatus = (r.job.status ?? "").toLowerCase();
        const visitStatus = (r.status ?? "").toLowerCase();
        if (EXCLUDED_STATUSES.has(jobStatus) || EXCLUDED_STATUSES.has(visitStatus)) continue;

        const jobber = r.job.source_record_id ? enrichMap.get(r.job.source_record_id) ?? null : null;
        const scheduledStart = combineDateTime(r.scheduled_date, r.scheduled_start_time);
        const scheduledEnd =
          r.scheduled_end_time != null ? combineDateTime(r.scheduled_date, r.scheduled_end_time) : null;

        const customerName = r.job.customer?.display_name ?? jobber?.client_name ?? null;
        const customerPhone = r.job.customer?.phone ?? jobber?.client_phone ?? null;
        const propAddress = r.job.property
          ? [r.job.property.address_1, r.job.property.city].filter(Boolean).join(", ") || null
          : jobber?.property_address ?? null;

        const amount = toAmount(r.job.total ?? jobber?.total_amount ?? 0);

        out.push({
          id: r.id,
          job_id: r.job.id,
          jobber_id: r.job.source_record_id,
          visit_id: r.id,
          dedupe_key: r.id,
          title: r.job.title,
          client_name: customerName,
          client_phone: customerPhone,
          property_address: propAddress,
          status: jobStatus || "scheduled",
          visit_status: visitStatus || jobber?.visit_status || null,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          scheduled_local_date: r.scheduled_date,
          total_amount: amount,
          amount_counted: amount,
          job_number: r.job.job_number,
          internal_notes: r.internal_notes ?? r.job.internal_notes,
          assigned_employee_names: jobber?.assigned_employee_names ?? null,
          business_id: r.business_id,
          property_id: r.property_id,
          service_items: jobber?.service_items ?? null,
          source: r.job.source === "jobber" ? "jobber_import" : "platform_jobs",
        });
      }

      return out.sort(
        (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime(),
      );
    },
  });

  const summary = useMemo(
    () => summarizeDashboardScheduledJobs(query.data ?? []),
    [query.data],
  );

  return { ...query, jobs: query.data ?? [], summary };
}
