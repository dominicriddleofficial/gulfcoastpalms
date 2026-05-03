import { supabase } from "@/integrations/supabase/client";

/**
 * Enroll a completed job's customer in the post_job email drip sequence.
 * Sequence (defined in process-email-drip edge function):
 *   - Day 1: Thank-you email
 *   - Day 3: Review request
 *   - Day 7: Referral ask
 *   - Day 90: Maintenance reminder
 *
 * Idempotent — silently skips if:
 *   - already enrolled for this job_id, or
 *   - the customer has do_not_contact_flag = true, or
 *   - no customer_id is provided.
 */
export async function enrollCompletedJobInDrip(params: {
  businessId: string;
  customerId: string | null;
  jobId: string;
}): Promise<void> {
  if (!params.customerId) return;

  // Respect Do Not Contact
  const { data: customer } = await supabase
    .from("platform_customers")
    .select("do_not_contact_flag")
    .eq("id", params.customerId)
    .maybeSingle();
  if (customer?.do_not_contact_flag) return;

  // Avoid double-enrolling on retries / repeated completes
  const { data: existing } = await supabase
    .from("email_drip_enrollments")
    .select("id")
    .eq("job_id", params.jobId)
    .eq("sequence_type", "post_job")
    .maybeSingle();
  if (existing) return;

  await supabase.from("email_drip_enrollments").insert({
    business_id: params.businessId,
    customer_id: params.customerId,
    job_id: params.jobId,
    sequence_type: "post_job",
    current_step: 0,
    next_send_at: new Date().toISOString(),
    status: "active",
  });
}
