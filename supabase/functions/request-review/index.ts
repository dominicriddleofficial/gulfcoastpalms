import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth gate — require a valid user JWT (or the service-role key for
    // internal calls). Without this, anyone could spam review-request SMS.
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!bearer) {
      return new Response(JSON.stringify({ error: true, message: "Unauthorized", code: "AUTH_REQUIRED" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (bearer !== serviceRoleKey) {
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: `Bearer ${bearer}` } } },
      );
      const { data: userData, error: userErr } = await authClient.auth.getUser(bearer);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: true, message: "Unauthorized", code: "AUTH_REQUIRED" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    // GOOGLE_REVIEW_URL must be a real URL, not a search fallback
    const GOOGLE_REVIEW_URL = Deno.env.get("GOOGLE_REVIEW_URL");
    if (!GOOGLE_REVIEW_URL || GOOGLE_REVIEW_URL.includes("google.com/search")) {
      return new Response(JSON.stringify({
        error: true,
        message: "GOOGLE_REVIEW_URL must be configured in secrets before sending review requests. Set it to your Google Business Profile review link (format: https://g.page/r/YOUR_ID/review).",
        code: "CONFIG_ERROR",
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { phone, customer_name, service_type } = body;

    if (!phone || typeof phone !== "string" || phone.trim().length < 7) {
      return new Response(JSON.stringify({ error: true, message: "Valid phone number required", code: "VALIDATION_ERROR" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!customer_name || typeof customer_name !== "string") {
      return new Response(JSON.stringify({ error: true, message: "Customer name required", code: "VALIDATION_ERROR" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if review request already sent to this number in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentRequests } = await supabaseAdmin
      .from("rate_limit_counters")
      .select("request_count")
      .eq("identifier", phone.trim())
      .eq("endpoint", "request-review")
      .gte("window_start", thirtyDaysAgo)
      .maybeSingle();

    if (recentRequests && recentRequests.request_count >= 1) {
      return new Response(JSON.stringify({
        error: true,
        message: "A review request was already sent to this number in the last 30 days.",
        code: "DUPLICATE",
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get Twilio phone number
    const numbersRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json`, {
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
      },
    });
    const numbersData = await numbersRes.json();
    if (!numbersRes.ok) throw new Error(`Failed to get phone numbers: ${JSON.stringify(numbersData)}`);

    const fromNumber = numbersData?.incoming_phone_numbers?.[0]?.phone_number;
    if (!fromNumber) throw new Error("No Twilio phone number found");

    const serviceName = service_type || "palm tree service";
    const smsBody = `Hi ${customer_name}, thanks for choosing Gulf Coast Palms! If you're happy with your ${serviceName}, we'd love a quick Google review — it really helps our small business: ${GOOGLE_REVIEW_URL}\nReply STOP to opt out.`;

    const smsRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone.trim(), From: fromNumber, Body: smsBody }),
    });

    const smsData = await smsRes.json();
    if (!smsRes.ok) throw new Error(`Twilio SMS error [${smsRes.status}]: ${JSON.stringify(smsData)}`);

    // Log this request to prevent duplicates
    await supabaseAdmin.from("rate_limit_counters").upsert({
      identifier: phone.trim(),
      endpoint: "request-review",
      request_count: 1,
      window_start: new Date().toISOString(),
    }, { onConflict: "identifier,endpoint" });

    return new Response(JSON.stringify({ success: true, sid: smsData.sid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("request-review error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: true, message: msg, code: "SERVER_ERROR" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
