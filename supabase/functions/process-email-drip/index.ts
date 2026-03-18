import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Drip sequence definitions
const SEQUENCES: Record<string, { delay_hours: number; subject: string; type: string }[]> = {
  post_lead: [
    { delay_hours: 0, subject: "Thanks for contacting Gulf Coast Palms!", type: "confirmation" },
    { delay_hours: 24, subject: "Following up on your palm service request", type: "follow_up" },
    { delay_hours: 72, subject: "Special offer: 10% off your first service", type: "discount" },
  ],
  post_job: [
    { delay_hours: 24, subject: "Thank you for choosing Gulf Coast Palms!", type: "thank_you" },
    { delay_hours: 72, subject: "How was your experience? Leave us a review", type: "review_request" },
    { delay_hours: 168, subject: "Know someone who needs palm services? Earn $100", type: "referral_ask" },
    { delay_hours: 2160, subject: "Time for your 90-day palm maintenance check", type: "maintenance_reminder" },
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get active enrollments that are due
    const { data: enrollments, error: fetchError } = await supabase
      .from("email_drip_enrollments")
      .select("*, leads(*)")
      .eq("status", "active")
      .lte("next_send_at", new Date().toISOString())
      .limit(50);

    if (fetchError) throw fetchError;
    if (!enrollments || enrollments.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const enrollment of enrollments) {
      const sequence = SEQUENCES[enrollment.sequence_type];
      if (!sequence) continue;

      const currentStep = enrollment.current_step;
      if (currentStep >= sequence.length) {
        // Sequence complete
        await supabase.from("email_drip_enrollments").update({ status: "completed" }).eq("id", enrollment.id);
        continue;
      }

      const step = sequence[currentStep];
      const lead = enrollment.leads;
      
      if (!lead?.email) {
        // No email, skip but advance step
        const nextStep = currentStep + 1;
        if (nextStep >= sequence.length) {
          await supabase.from("email_drip_enrollments").update({ status: "completed", current_step: nextStep }).eq("id", enrollment.id);
        } else {
          const nextSend = new Date();
          nextSend.setHours(nextSend.getHours() + (sequence[nextStep]?.delay_hours || 24));
          await supabase.from("email_drip_enrollments").update({
            current_step: nextStep,
            next_send_at: nextSend.toISOString(),
          }).eq("id", enrollment.id);
        }
        continue;
      }

      // Log the email that would be sent (actual sending will use Resend/SendGrid later)
      console.log(`[DRIP] Would send "${step.subject}" to ${lead.email} (step ${currentStep}, type: ${step.type})`);

      // Advance to next step
      const nextStep = currentStep + 1;
      if (nextStep >= sequence.length) {
        await supabase.from("email_drip_enrollments").update({ status: "completed", current_step: nextStep }).eq("id", enrollment.id);
      } else {
        const nextSend = new Date();
        nextSend.setHours(nextSend.getHours() + (sequence[nextStep]?.delay_hours || 24));
        await supabase.from("email_drip_enrollments").update({
          current_step: nextStep,
          next_send_at: nextSend.toISOString(),
        }).eq("id", enrollment.id);
      }

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-email-drip error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
