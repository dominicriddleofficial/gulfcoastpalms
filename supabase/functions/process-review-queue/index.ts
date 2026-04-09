import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Process Review Queue — runs on a schedule (every 15 minutes via pg_cron).
 * Finds pending review_requests that are due and sends SMS via SimpleTexting.
 *
 * To set up the cron job, run this SQL in the Supabase dashboard:
 *
 * SELECT cron.schedule(
 *   'process-review-queue',
 *   '*/15 * * * *',
 *   $$
 *   SELECT net.http_post(
 *     url:='https://qczcwyqpnxknqbmwpvna.supabase.co/functions/v1/process-review-queue',
 *     headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
 *     body:='{}'::jsonb
 *   ) as request_id;
 *   $$
 * );
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    // Get all pending review requests that are due
    const { data: dueRequests, error: fetchErr } = await supabase
      .from("review_requests")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(50);

    if (fetchErr) {
      console.error("[process-review-queue] Fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_REVIEW_URL = "https://g.page/r/CWzVK9t91qF_EAE/review";
    let processed = 0;

    for (const request of dueRequests || []) {
      const firstName = request.customer_name?.split(" ")[0] || "there";
      const message = `Hi ${firstName}! The team at Gulf Coast Palms just finished up at your property. If we did a great job today we'd really appreciate a quick Google review — it takes less than 60 seconds and means the world to us 🌴 ${GOOGLE_REVIEW_URL} Reply STOP to opt out.`;

      try {
        const smsRes = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ to: request.customer_phone, message }),
        });

        const smsResult = await smsRes.text();

        if (smsRes.ok) {
          await supabase
            .from("review_requests")
            .update({ status: "sent", sent_at: now })
            .eq("id", request.id);
          processed++;
          console.log(`[process-review-queue] Sent review request to ${request.customer_phone}`);
        } else {
          console.error(`[process-review-queue] SMS failed for ${request.customer_phone}:`, smsResult);
          // Mark as failed so we don't retry indefinitely
          await supabase
            .from("review_requests")
            .update({ status: "failed" })
            .eq("id", request.id);
        }
      } catch (smsErr) {
        console.error(`[process-review-queue] Exception sending to ${request.customer_phone}:`, smsErr);
      }
    }

    console.log(`[process-review-queue] Processed ${processed} of ${dueRequests?.length || 0} requests`);
    return new Response(
      JSON.stringify({ processed, total: dueRequests?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[process-review-queue] Exception:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
