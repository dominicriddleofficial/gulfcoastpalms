import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Process Review Queue — runs on a schedule (every 15 minutes via pg_cron).
// Finds pending review_requests that are due and sends SMS via SimpleTexting.
// Set up cron: SELECT cron.schedule('process-review-queue', '*/15 * * * *', ...);
// See README or migration notes for full cron SQL.
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

    let processed = 0;

    // Cache business_settings lookups per business_id for this run.
    const settingsCache = new Map<string, { template: string | null; link: string | null; name: string | null }>();
    async function loadSettings(businessId: string | null) {
      const key = businessId ?? "__none__";
      const cached = settingsCache.get(key);
      if (cached) return cached;
      let entry = { template: null as string | null, link: null as string | null, name: null as string | null };
      if (businessId) {
        const [{ data: bs }, { data: biz }] = await Promise.all([
          supabase
            .from("business_settings")
            .select("review_request_template, review_request_link")
            .eq("business_id", businessId)
            .maybeSingle(),
          supabase.from("businesses").select("public_brand_name").eq("id", businessId).maybeSingle(),
        ]);
        entry = {
          template: bs?.review_request_template ?? null,
          link: bs?.review_request_link ?? null,
          name: biz?.public_brand_name ?? null,
        };
      }
      settingsCache.set(key, entry);
      return entry;
    }

    for (const request of dueRequests || []) {
      const s = await loadSettings(request.business_id ?? null);
      const message = buildReviewMessage({
        customerName: request.customer_name,
        businessName: s.name,
        template: s.template,
        reviewLink: s.link,
      });

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
