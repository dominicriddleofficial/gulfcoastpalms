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
  visitId?: string | null;
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
      // Map client-side intent to server action. The server records audit_logs +
      // timeline_events + job_visit_events transactionally.
      const action =
        params.nextStatus === "on_my_way" ? "on_my_way" :
        params.nextStatus === "in_progress" ? "start_visit" :
        params.nextStatus === "on_site" ? "start_visit" :
        params.nextStatus === "complete" ? "complete_visit" :
        null;

      if (action) {
        const { data, error } = await supabase.functions.invoke("update-visit-status", {
          body: {
            jobber_job_id: params.jobberJobId,
            visit_id: params.visitId ?? null,
            action,
            sms_sent: !!params.smsSent,
          },
        });
        if (error) {
          // Try to extract the real error message from the function response body.
          let detail = "";
          try {
            const ctx = (error as { context?: Response }).context;
            if (ctx && typeof ctx.text === "function") {
              const txt = await ctx.text();
              try {
                const json = JSON.parse(txt);
                detail = json?.error || json?.message || txt;
              } catch {
                detail = txt;
              }
            }
          } catch { /* noop */ }
          throw new Error(detail || error.message || "Unable to update visit status.");
        }
        if (data && typeof data === "object" && "error" in data && data.error) {
          throw new Error(String(data.error));
        }
      } else {
        // Fallback for "scheduled" or unmapped — direct update
        const { error: jobErr } = await supabase
          .from("jobber_jobs")
          .update({ visit_status: params.nextStatus })
          .eq("id", params.jobberJobId);
        if (jobErr) throw jobErr;
      }

      // Capture on_site timestamp client-side (server uses start_visit for both)
      if (params.nextStatus === "on_site") {
        await upsertEvent(params.jobberJobId, params.businessId, {
          arrived_at: new Date().toISOString(),
        });
      }

      // On complete: enroll drip. Review requests are MANUAL ONLY — nothing is enqueued.
      if (params.nextStatus === "complete") {
        await handleCompletionSideEffects(params);
      }
    },
    onSuccess: (_data, vars) => {
      // Fire-and-forget invalidations — never await refetches.
      void qc.invalidateQueries({ queryKey: ["dashboard-scheduled-jobs"] });
      void qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      void qc.invalidateQueries({ queryKey: ["schedule-jobs"] });
      if (vars.nextStatus === "complete") {
        toast.success("Visit completed");
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
    mutationFn: async (params: { jobberJobId: string; businessId: string; visitId?: string | null }) => {
      const { data, error } = await supabase.functions.invoke("update-visit-status", {
        body: {
          jobber_job_id: params.jobberJobId,
          visit_id: params.visitId ?? null,
          action: "reopen_visit",
        },
      });
      if (error) {
        let detail = "";
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.text === "function") {
            const txt = await ctx.text();
            try {
              const json = JSON.parse(txt);
              detail = json?.error || json?.message || txt;
            } catch {
              detail = txt;
            }
          }
        } catch { /* noop */ }
        throw new Error(detail || error.message || "Unable to reopen visit.");
      }
      if (data && typeof data === "object" && "error" in data && data.error) {
        throw new Error(String(data.error));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["dashboard-scheduled-jobs"] });
      void qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      void qc.invalidateQueries({ queryKey: ["schedule-jobs"] });
      toast.success("Visit reopened");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Unable to reopen visit";
      toast.error(msg);
    },
  });

  return { advance, reopen };
}

async function handleCompletionSideEffects(params: AdvanceParams): Promise<void> {
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