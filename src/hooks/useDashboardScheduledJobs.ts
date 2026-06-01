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

const EXCLUDED_STATUSES = new Set(["archived", "canceled", "cancelled", "deleted"]);

type PlatformCustomerRow = {
  display_name: string | null;
  phone: string | null;
  email: string | null;
};

type PlatformPropertyRow = {
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

type PlatformJobShape = {
  id: string;
  business_id: string | null;
  customer_id: string | null;
  property_id: string | null;
  job_number: string | null;
  title: string | null;
  total: number | string | null;
  status: string | null;
  source: string | null;
  source_system: string | null;
  source_record_id: string | null;
  internal_notes: string | null;
  deleted_at: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  customer: PlatformCustomerRow | null;
  property: PlatformPropertyRow | null;
};

type PlatformVisitRow = {
  id: string;
  business_id: string | null;
  property_id: string | null;
  title: string | null;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  status: string | null;
  internal_notes: string | null;
  job: PlatformJobShape | null;
};

type JobberJobRow = {
  id: string;
  jobber_id: string | null;
  title: string | null;
  status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  client_id: string | null;
  property_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  property_address: string | null;
  assigned_employee_names: string[] | null;
  service_items: unknown;
  internal_notes: string | null;
  job_number: string | null;
  total_amount: number | string | null;
  visit_status: string | null;
  business_id: string | null;
};

type JobberClientRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
};

type JobberPropertyRow = {
  id: string;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

function combineDateTime(date: string, time: string | null): string {
  const t = time ?? "00:00:00";
  return new Date(`${date}T${t}`).toISOString();
}

function toAmount(value: number | string | null): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function cleanStatus(value: string | null): string {
  return (value ?? "scheduled").toLowerCase();
}

function isExcludedStatus(value: string | null): boolean {
  return EXCLUDED_STATUSES.has(cleanStatus(value));
}

function platformAddress(property: PlatformPropertyRow | null): string | null {
  if (!property) return null;
  const cityStateZip = [property.city, property.state, property.zip].filter(Boolean).join(" ");
  return [property.address_1, property.address_2, cityStateZip].filter(Boolean).join(", ") || null;
}

function jobberAddress(property: JobberPropertyRow | null): string | null {
  if (!property) return null;
  const cityStateZip = [property.city, property.state, property.zip].filter(Boolean).join(" ");
  return [property.street1, property.street2, cityStateZip].filter(Boolean).join(", ") || null;
}

function isJobberImport(job: PlatformJobShape): boolean {
  return job.source_system === "jobber" || job.source === "jobber" || Boolean(job.source_record_id);
}

function jobberImportId(job: PlatformJobShape): string | null {
  return isJobberImport(job) ? job.source_record_id : null;
}

function buildPlatformItem(
  job: PlatformJobShape,
  visit: PlatformVisitRow | null,
  importedJobberIds: Set<string>,
  jobberFallback?: JobberJobRow | null,
  jobberClient?: JobberClientRow | null,
  jobberProperty?: JobberPropertyRow | null,
): DashboardScheduledJob | null {
  if (job.deleted_at || isExcludedStatus(job.status) || isExcludedStatus(visit?.status ?? null)) return null;

  const scheduledDate = visit?.scheduled_date ?? job.scheduled_start;
  if (!scheduledDate) return null;

  const localDate = scheduledDate.slice(0, 10);
  const scheduledStart = visit
    ? combineDateTime(localDate, visit.scheduled_start_time)
    : combineDateTime(localDate, null);
  const scheduledEnd = visit?.scheduled_end_time
    ? combineDateTime(localDate, visit.scheduled_end_time)
    : job.scheduled_end
      ? combineDateTime(job.scheduled_end.slice(0, 10), null)
      : null;

  const externalId = jobberImportId(job);
  if (externalId) importedJobberIds.add(externalId);

  const source: NormalizedScheduleSource = externalId ? "jobber_import" : "platform";
  const address =
    platformAddress(job.property) ??
    jobberFallback?.property_address ??
    jobberAddress(jobberProperty ?? null);
  const amount = toAmount(job.total);
  const visitStatus = cleanStatus(visit?.status ?? null);
  const customerName =
    job.customer?.display_name ?? jobberFallback?.client_name ?? jobberClient?.display_name ?? null;
  const customerPhone =
    job.customer?.phone ?? jobberFallback?.client_phone ?? jobberClient?.phone ?? null;
  const customerEmail = job.customer?.email ?? jobberClient?.email ?? null;

  return {
    id: visit?.id ?? job.id,
    source,
    job_id: job.id,
    visit_id: visit?.id ?? null,
    jobber_id: externalId,
    dedupe_key: externalId ? `jobber:${externalId}` : `platform:${job.id}:${visit?.id ?? "job"}`,
    job_number: job.job_number,
    title: visit?.title ?? job.title,
    customer_id: job.customer_id,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    address,
    scheduled_start: scheduledStart,
    scheduled_end: scheduledEnd,
    status: cleanStatus(job.status),
    total_amount: amount,
    business_id: visit?.business_id ?? job.business_id,
    client_name: customerName,
    client_phone: customerPhone,
    property_address: address,
    visit_status: visitStatus,
    scheduled_local_date: localDate,
    amount_counted: amount,
    internal_notes: visit?.internal_notes ?? job.internal_notes,
    assigned_employee_names: jobberFallback?.assigned_employee_names ?? null,
    property_id: visit?.property_id ?? job.property_id ?? jobberFallback?.property_id ?? null,
    service_items: jobberFallback?.service_items ?? null,
  };
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
  {
      const startDay = startDate ? format(startDate, "yyyy-MM-dd") : null;
      const endDay = endDate ? format(endDate, "yyyy-MM-dd") : null;
      const startIso = startDate?.toISOString() ?? null;
      const endIso = endDate?.toISOString() ?? null;

      let visitQuery = supabase
        .from("platform_job_visits")
        .select(
          `id, business_id, property_id, title, scheduled_date, scheduled_start_time, scheduled_end_time, status, internal_notes,
           job:platform_jobs!inner(
             id, business_id, customer_id, property_id, job_number, title, total, status, source, source_system, source_record_id, internal_notes, deleted_at, scheduled_start, scheduled_end,
             customer:platform_customers(display_name, phone, email),
             property:platform_properties(address_1, address_2, city, state, zip)
           )`,
        )
        .not("scheduled_date", "is", null)
        .order("scheduled_date", { ascending: true });

      let platformJobQuery = supabase
        .from("platform_jobs")
        .select(
           `id, business_id, customer_id, property_id, job_number, title, total, status, source, source_system, source_record_id, internal_notes, deleted_at, scheduled_start, scheduled_end,
           customer:platform_customers(display_name, phone, email),
           property:platform_properties(address_1, address_2, city, state, zip)`,
        )
        .not("scheduled_start", "is", null)
        .order("scheduled_start", { ascending: true });

      let jobberQuery = supabase
        .from("jobber_jobs")
        .select(
          "id, jobber_id, title, status, scheduled_start, scheduled_end, client_id, property_id, client_name, client_phone, property_address, assigned_employee_names, service_items, internal_notes, job_number, total_amount, visit_status, business_id",
        )
        .not("scheduled_start", "is", null)
        .order("scheduled_start", { ascending: true });

      if (businessId) {
        visitQuery = visitQuery.eq("business_id", businessId);
        platformJobQuery = platformJobQuery.eq("business_id", businessId);
        jobberQuery = jobberQuery.eq("business_id", businessId);
      }
      if (startDay) {
        visitQuery = visitQuery.gte("scheduled_date", startDay);
        platformJobQuery = platformJobQuery.gte("scheduled_start", startDay);
      }
      if (endDay) {
        visitQuery = visitQuery.lte("scheduled_date", endDay);
        platformJobQuery = platformJobQuery.lte("scheduled_start", endDay);
      }
      if (startIso) jobberQuery = jobberQuery.gte("scheduled_start", startIso);
      if (endIso) jobberQuery = jobberQuery.lte("scheduled_start", endIso);

      const [visitResult, platformJobResult, jobberResult] = await Promise.all([
        visitQuery,
        platformJobQuery,
        jobberQuery,
      ]);

      if (visitResult.error) throw visitResult.error;
      if (platformJobResult.error) throw platformJobResult.error;
      if (jobberResult.error) throw jobberResult.error;

      const visitRows = (visitResult.data ?? []) as unknown as PlatformVisitRow[];
      const platformJobRows = (platformJobResult.data ?? []) as unknown as PlatformJobShape[];
      const jobberRows = (jobberResult.data ?? []) as unknown as JobberJobRow[];

      // Collect jobber source_record_ids referenced by platform jobs (imports) so we
      // can backfill missing customer/property info that wasn't migrated.
      const importedSourceIds = new Set<string>();
      const collectImport = (j: PlatformJobShape | null | undefined) => {
        const id = j ? jobberImportId(j) : null;
        if (id) importedSourceIds.add(id);
      };
      for (const v of visitRows) collectImport(v.job);
      for (const j of platformJobRows) collectImport(j);

      const jobberFallbackMap = new Map<string, JobberJobRow>();
      const fallbackClientIds = new Set<string>();
      const fallbackPropertyIds = new Set<string>();
      if (importedSourceIds.size > 0) {
        const { data: fallbackRows, error: fallbackErr } = await supabase
          .from("jobber_jobs")
          .select(
            "id, jobber_id, title, status, scheduled_start, scheduled_end, client_id, property_id, client_name, client_phone, property_address, assigned_employee_names, service_items, internal_notes, job_number, total_amount, visit_status, business_id",
          )
          .in("id", [...importedSourceIds]);
        if (fallbackErr) throw fallbackErr;
        for (const row of (fallbackRows ?? []) as unknown as JobberJobRow[]) {
          jobberFallbackMap.set(row.id, row);
          if (row.client_id) fallbackClientIds.add(row.client_id);
          if (row.property_id) fallbackPropertyIds.add(row.property_id);
        }
      }

      const importedJobberIds = new Set<string>();
      const platformJobIdsWithVisits = new Set<string>();
      const normalized: DashboardScheduledJob[] = [];

      const clientIds = [...new Set(jobberRows.map((j) => j.client_id).filter((id): id is string => Boolean(id)))];
      const propertyIds = [...new Set(jobberRows.map((j) => j.property_id).filter((id): id is string => Boolean(id)))];

      for (const id of fallbackClientIds) clientIds.push(id);
      for (const id of fallbackPropertyIds) propertyIds.push(id);
      const uniqueClientIds = [...new Set(clientIds)];
      const uniquePropertyIds = [...new Set(propertyIds)];

      const [clientResult, propertyResult] = await Promise.all([
        uniqueClientIds.length > 0
          ? supabase.from("jobber_clients").select("id, display_name, email, phone").in("id", uniqueClientIds)
          : Promise.resolve({ data: [], error: null }),
        uniquePropertyIds.length > 0
          ? supabase.from("jobber_properties").select("id, street1, street2, city, state, zip").in("id", uniquePropertyIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (clientResult.error) throw clientResult.error;
      if (propertyResult.error) throw propertyResult.error;

      const clientMap = new Map<string, JobberClientRow>();
      for (const client of (clientResult.data ?? []) as unknown as JobberClientRow[]) {
        clientMap.set(client.id, client);
      }

      const propertyMap = new Map<string, JobberPropertyRow>();
      for (const property of (propertyResult.data ?? []) as unknown as JobberPropertyRow[]) {
        propertyMap.set(property.id, property);
      }

      const enrichArgs = (job: PlatformJobShape) => {
        const sid = jobberImportId(job);
        const fb = sid ? jobberFallbackMap.get(sid) ?? null : null;
        const fbClient = fb?.client_id ? clientMap.get(fb.client_id) ?? null : null;
        const fbProperty = fb?.property_id ? propertyMap.get(fb.property_id) ?? null : null;
        return { fb, fbClient, fbProperty };
      };

      for (const visit of visitRows) {
        if (!visit.job) continue;
        platformJobIdsWithVisits.add(visit.job.id);
        const { fb, fbClient, fbProperty } = enrichArgs(visit.job);
        const item = buildPlatformItem(visit.job, visit, importedJobberIds, fb, fbClient, fbProperty);
        if (item) normalized.push(item);
      }

      for (const job of platformJobRows) {
        if (platformJobIdsWithVisits.has(job.id)) continue;
        const { fb, fbClient, fbProperty } = enrichArgs(job);
        const item = buildPlatformItem(job, null, importedJobberIds, fb, fbClient, fbProperty);
        if (item) normalized.push(item);
      }

      for (const job of jobberRows) {
        if (!job.scheduled_start || isExcludedStatus(job.status) || isExcludedStatus(job.visit_status)) continue;
        if (importedJobberIds.has(job.id) || (job.jobber_id && importedJobberIds.has(job.jobber_id))) continue;

        const client = job.client_id ? clientMap.get(job.client_id) ?? null : null;
        const property = job.property_id ? propertyMap.get(job.property_id) ?? null : null;
        const address = job.property_address ?? jobberAddress(property);
        const amount = toAmount(job.total_amount);
        const customerName = job.client_name ?? client?.display_name ?? null;
        const customerPhone = job.client_phone ?? client?.phone ?? null;

        normalized.push({
          id: job.id,
          source: "jobber_synced",
          job_id: job.id,
          visit_id: null,
          jobber_id: job.jobber_id ?? job.id,
          dedupe_key: `jobber:${job.id}`,
          job_number: job.job_number,
          title: job.title,
          customer_id: null,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: client?.email ?? null,
          address,
          scheduled_start: job.scheduled_start,
          scheduled_end: job.scheduled_end,
          status: cleanStatus(job.status),
          total_amount: amount,
          business_id: job.business_id,
          client_name: customerName,
          client_phone: customerPhone,
          property_address: address,
          visit_status: cleanStatus(job.visit_status),
          scheduled_local_date: format(new Date(job.scheduled_start), "yyyy-MM-dd"),
          amount_counted: amount,
          internal_notes: job.internal_notes,
          assigned_employee_names: job.assigned_employee_names,
          property_id: job.property_id,
          service_items: job.service_items,
        });
      }

      return normalized.sort(
        (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime(),
      );
  }
}
