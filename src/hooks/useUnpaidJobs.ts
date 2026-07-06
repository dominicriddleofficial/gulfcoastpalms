import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Unpaid Jobs — presentation-layer aggregation over existing tables.
 *
 * HARD RULES (owner request):
 *   1. Only platform-originated jobs count. Anything with source='jobber'
 *      (or any non-platform source) is permanently excluded.
 *   2. Only jobs completed on/after UNPAID_TRACKING_START count. Older
 *      completed jobs (legacy May/June work) are ignored forever.
 *   3. Owners can dismiss individual jobs via platform_jobs.excluded_from_unpaid.
 *
 * Definition of "unpaid":
 *   platform_jobs.status = 'completed'
 *   AND source = 'platform'
 *   AND completed_at >= UNPAID_TRACKING_START
 *   AND excluded_from_unpaid = false
 *   AND job_total > 0  (jobs with total = 0/null are surfaced separately
 *                       as "no price set" — they are NOT counted as owed)
 *   AND owed = job_total - SUM(platform_invoices.amount_paid WHERE invoice.job_id = job.id) > 0
 */

/** Cutoff — nothing completed before this date is ever counted. */
export const UNPAID_TRACKING_START = "2026-07-03";

export type UnpaidJob = {
  id: string;
  job_number: string;
  title: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  paid: number;
  owed: number;
  completed_at: string | null;
  days_since_completed: number | null;
};

export type NoPriceJob = {
  id: string;
  job_number: string;
  title: string | null;
  customer_name: string | null;
  completed_at: string | null;
};

export type UnpaidJobsResult = {
  unpaid: UnpaidJob[];
  noPrice: NoPriceJob[];
  totalOwed: number;
  unpaidCount: number;
  overdueCount: number; // >= 14 days
};

export const unpaidJobsKey = (businessId: string | null) =>
  ["platform-unpaid-jobs", businessId] as const;

function daysBetween(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

export async function fetchUnpaidJobs(businessId: string | null): Promise<UnpaidJobsResult> {
  if (!businessId) {
    return { unpaid: [], noPrice: [], totalOwed: 0, unpaidCount: 0, overdueCount: 0 };
  }

  const [jobsRes, invRes] = await Promise.all([
    supabase
      .from("platform_jobs")
      .select(
        "id, job_number, title, customer_id, total, completed_at, platform_customers(display_name, phone)",
      )
      .eq("business_id", businessId)
      .eq("status", "completed")
      .eq("source", "platform")
      .eq("excluded_from_unpaid", false)
      .gte("completed_at", UNPAID_TRACKING_START),
    supabase
      .from("platform_invoices")
      .select("id, job_id, amount_paid")
      .eq("business_id", businessId)
      .not("job_id", "is", null),
  ]);

  if (jobsRes.error) throw jobsRes.error;
  if (invRes.error) throw invRes.error;

  const paidByJob = new Map<string, number>();
  for (const inv of invRes.data ?? []) {
    const jobId = (inv as { job_id: string | null }).job_id;
    if (!jobId) continue;
    const amt = Number((inv as { amount_paid: number | null }).amount_paid ?? 0);
    paidByJob.set(jobId, (paidByJob.get(jobId) ?? 0) + amt);
  }

  const unpaid: UnpaidJob[] = [];
  const noPrice: NoPriceJob[] = [];

  for (const row of jobsRes.data ?? []) {
    const j = row as {
      id: string;
      job_number: string;
      title: string | null;
      customer_id: string | null;
      total: number | null;
      completed_at: string | null;
      platform_customers: { display_name: string | null; phone: string | null } | null;
    };
    const total = Number(j.total ?? 0);
    const customer_name = j.platform_customers?.display_name ?? null;

    if (!(total > 0)) {
      noPrice.push({
        id: j.id,
        job_number: j.job_number,
        title: j.title,
        customer_name,
        completed_at: j.completed_at,
      });
      continue;
    }

    const paid = paidByJob.get(j.id) ?? 0;
    const owed = Math.round((total - paid) * 100) / 100;
    if (owed <= 0.005) continue;

    unpaid.push({
      id: j.id,
      job_number: j.job_number,
      title: j.title,
      customer_id: j.customer_id,
      customer_name,
      customer_phone: j.platform_customers?.phone ?? null,
      total,
      paid,
      owed,
      completed_at: j.completed_at,
      days_since_completed: daysBetween(j.completed_at),
    });
  }

  // Oldest first: nulls (unknown completion date) go last.
  unpaid.sort((a, b) => {
    const da = a.days_since_completed;
    const db = b.days_since_completed;
    if (da == null && db == null) return 0;
    if (da == null) return 1;
    if (db == null) return -1;
    return db - da;
  });

  const totalOwed = unpaid.reduce((s, j) => s + j.owed, 0);
  const overdueCount = unpaid.filter(j => (j.days_since_completed ?? 0) >= 14).length;

  return {
    unpaid,
    noPrice,
    totalOwed,
    unpaidCount: unpaid.length,
    overdueCount,
  };
}

export function useUnpaidJobs(businessId: string | null) {
  return useQuery({
    queryKey: unpaidJobsKey(businessId),
    queryFn: () => fetchUnpaidJobs(businessId),
    enabled: !!businessId,
    staleTime: 60_000,
  });
}

/** Call after payment recorded or job status changed. */
export function useInvalidateUnpaidJobs() {
  const qc = useQueryClient();
  return (businessId: string | null) =>
    qc.invalidateQueries({ queryKey: unpaidJobsKey(businessId) });
}

/** Owner-only: permanently dismiss a job from the Unpaid Jobs tracker. */
export async function dismissUnpaidJob(jobId: string): Promise<void> {
  const { error } = await supabase
    .from("platform_jobs")
    .update({ excluded_from_unpaid: true })
    .eq("id", jobId);
  if (error) throw error;
}