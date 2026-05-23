import { supabase } from "@/integrations/supabase/client";

type CrewEvent =
  | "clock_in"
  | "clock_out"
  | "clock_out_confirmed"
  | "clock_session_admin_close"
  | "gps_permission_granted"
  | "gps_permission_denied"
  | "gps_permission_unsupported"
  | "timesheet_approved"
  | "timesheet_edit"
  | "timesheet_export"
  | "job_start_blocked_not_clocked_in";

export async function logCrewAudit(params: {
  businessId: string | null;
  event: CrewEvent;
  entityType?: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({
      business_id: params.businessId,
      user_id: user.id,
      event_name: params.event,
      entity_type: params.entityType ?? "clock_session",
      entity_id: params.entityId ?? null,
      action_type:
        params.event.startsWith("clock_in") ? "create" :
        params.event.startsWith("timesheet_edit") ? "update" :
        params.event.startsWith("timesheet_approved") ? "update" :
        params.event.startsWith("clock_out") || params.event.includes("admin_close") ? "update" :
        "read",
      old_values_json: (params.oldValues ?? null) as never,
      new_values_json: (params.newValues ?? null) as never,
      context_json: {
        ...(params.context ?? {}),
        ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
        ts: new Date().toISOString(),
      } as never,
    });
  } catch {
    // Best-effort: never let audit failures break the user flow.
  }
}
