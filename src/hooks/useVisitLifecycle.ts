import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { enrollCompletedJobInDrip } from "@/lib/drip-enrollment";
import { toast } from "sonner";

export type VisitStatus =
  | "scheduled"
  | "on_my_way"
  | "on_site"
  | "in_progress"
  | "complete";

export interface VisitEvents {
  on_my_way_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  on_my_way_sms_sent_at: string | null;
  drip_enrolled_at: string | null;
  review_queued_at: string | null;
}

interface AdvanceParams {
  jobberJobId: string;
  businessId: string;
  nextStatus: VisitStatus;
  customerName?: string | null;
  customerPhone?: string | null;
  smsSent?: boolean;
}

async function upsertEvent(
  jobberJobId: string,
  businessId: string,
  patch: Partial<VisitEvents>,
): Promise<void> {
  const { data: existing } = await supabase
    .from("job_visit_events")
    .select("id")
    .eq("jobber_job_id", jobberJobId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("job_visit_events")
      .update(patch)
      .eq("id", existing.id);
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("job_visit_events").insert({
      jobber_job_id: jobberJobId,
      business_id: businessId,
      created_by_user_id: user?.id ?? null,
      ...patch,
    });
  }
}

export function useVisitLifecycle() {
  const qc = useQueryClient();

  const advance = useMutation({
    mutationFn: async (params: AdvanceParams) => {
      const now = new Date().toISOString();
      const eventPatch: Partial<VisitEvents> = {};

      if (params.nextStatus === "on_my_way") {
        eventPatch.on_my_way_at = now;
        if (params.smsSent) eventPatch.on_my_way_sms_sent_at = now;
      } else if (params.nextStatus === "on_site") {
        eventPatch.arrived_at = now;
      } else if (params.nextStatus === "in_progress") {
        eventPatch.started_at = now;
      } else if (params.nextStatus === "complete") {
        eventPatch.completed_at = now;
      }

      const { error: jobErr } = await supabase
        .from("jobber_jobs")
        .update({ visit_status: params.nextStatus })
        .eq("id", params.jobberJobId);
      if (jobErr) throw jobErr;

      await upsertEvent(params.jobberJobId, params.businessId, eventPatch);

      // On complete: queue review request + enroll drip
      if (params.nextStatus === "complete") {
        await handleCompletionSideEffects(params);
        await upsertEvent(params.jobberJobId, params.businessId, {
          review_queued_at: now,
        });
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["schedule-jobber"] });
      if (vars.nextStatus === "complete") {
        toast.success("Visit completed — review request queued for 2h");
      } else if (vars.nextStatus === "on_my_way") {
        toast.success(vars.smsSent ? "Customer notified — on your way" : "Marked on your way");
      } else if (vars.nextStatus === "in_progress") {
        toast.success("Visit started");
      } else if (vars.nextStatus === "on_site") {
        toast.success("Marked on site");
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    },
  });

  const reopen = useMutation({
    mutationFn: async (params: { jobberJobId: string; businessId: string }) => {
      const { error } = await supabase
        .from("jobber_jobs")
        .update({ visit_status: "in_progress" })
        .eq("id", params.jobberJobId);
      if (error) throw error;
      await upsertEvent(params.jobberJobId, params.businessId, {
        completed_at: null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule-jobber"] });
      toast.success("Visit reopened");
    },
  });

  return { advance, reopen };
}

async function handleCompletionSideEffects(params: AdvanceParams): Promise<void> {
  // Queue 2-hour delayed review request (idempotent: skip if pending exists in last 24h)
  if (params.customerPhone) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("review_requests")
      .select("id")
      .eq("business_id", params.businessId)
      .eq("customer_phone", params.customerPhone)
      .eq("status", "pending")
      .gte("created_at", since)
      .maybeSingle();

    if (!existing) {
      const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      await supabase.from("review_requests").insert({
        business_id: params.businessId,
        customer_name: params.customerName ?? null,
        customer_phone: params.customerPhone,
        scheduled_for: scheduledFor,
        status: "pending",
      });
    }
  }

  // Try to enroll drip if a matching platform_jobs row exists
  const { data: platformJob } = await supabase
    .from("platform_jobs")
    .select("id, customer_id")
    .eq("source_record_id", params.jobberJobId)
    .eq("business_id", params.businessId)
    .maybeSingle();

  if (platformJob?.customer_id) {
    await enrollCompletedJobInDrip({
      businessId: params.businessId,
      customerId: platformJob.customer_id,
      jobId: platformJob.id,
    });
  }
}