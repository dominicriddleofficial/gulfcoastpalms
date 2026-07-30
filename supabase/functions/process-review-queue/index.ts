// AUTOMATIC SENDING IS INTENTIONALLY DISABLED: the pg_cron job 'process-review-queue'
// is inactive and no code path enqueues rows into review_requests. Review requests are
// sent MANUALLY from the job screen. This function is kept only so automation can be
// switched back on later if the owner wants it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Kept in sync with src/lib/review-sms.ts (Deno functions can't import src/).
const DEFAULT_REVIEW_TEMPLATE =
  "Hi {first_name}! Hope everything looks great — thanks again for having Gulf Coast Palms out. We're trying to reach 200 Google reviews by the end of the season, and every single one gets us a little closer. Here's the link to make it easy: {review_link} Thanks again and see you next time 👍";
// Verified working Google review form redirect (search.google.com/local/writereview).
const FALLBACK_REVIEW_LINK = "https://g.page/r/CVI5xmZYC-NAEBM/review";

/**
 * LEGAL / CARRIER REQUIREMENT: the opt-out sentence is NOT editable by the
 * owner. TCPA + carrier 10DLC rules require an opt-out instruction on every
 * automated marketing SMS, so it is always appended when the rendered
 * template does not already contain it.
 */
const OPT_OUT_SUFFIX = " Reply STOP to opt out.";

function buildReviewMessage(input: {
  customerName?: string | null;
  businessName?: string | null;
  template?: string | null;
  reviewLink?: string | null;
}): string {
  const template = (input.template ?? "").trim() || DEFAULT_REVIEW_TEMPLATE;
  const link = (input.reviewLink ?? "").trim() || FALLBACK_REVIEW_LINK;
  const raw = (input.customerName ?? "").trim();
  const isBlank = !raw || raw.toLowerCase() === "na";
  const fullName = isBlank ? "there" : raw;
  const firstName = isBlank ? "there" : (raw.split(/\s+/)[0] || "there");

  let msg = template
    .split("{first_name}").join(firstName)
    .split("{full_name}").join(fullName)
    .split("{business_name}").join((input.businessName ?? "").trim() || "Gulf Coast Palms")
    .split("{review_link}").join(link);

  if (!msg.includes("Reply STOP to opt out.")) msg = `${msg.trimEnd()}${OPT_OUT_SUFFIX}`;
  return msg;
}

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
