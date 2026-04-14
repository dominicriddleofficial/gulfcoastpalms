import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "https://gulfcoastpalmservices.com",
  "https://www.gulfcoastpalmservices.com",
  "https://gulfcoastpalms.lovable.app",
  "https://id-preview--2e9a44f0-ac4c-4ebd-ad4f-dd591d732484.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SIMPLETEXTING_API_KEY = Deno.env.get("SIMPLETEXTING_API_KEY");
    if (!SIMPLETEXTING_API_KEY) {
      console.error("SIMPLETEXTING_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "SMS service not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, message } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "to and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof message !== "string" || message.length > 1600) {
      return new Response(
        JSON.stringify({ error: "Message too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = to.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: 10 per business per hour
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await supabase.from("rate_limit_counters").delete().lt("window_start", cutoff).eq("endpoint", "send-sms");

    const { data: rlData } = await supabase
      .from("rate_limit_counters")
      .select("request_count, id")
      .eq("identifier", ip)
      .eq("endpoint", "send-sms")
      .gte("window_start", cutoff)
      .maybeSingle();

    if (rlData && rlData.request_count >= 20) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rlData) {
      await supabase.from("rate_limit_counters").update({ request_count: rlData.request_count + 1 }).eq("id", rlData.id);
    } else {
      await supabase.from("rate_limit_counters").insert({ identifier: ip, endpoint: "send-sms", request_count: 1, window_start: new Date().toISOString() });
    }

    console.log(`[send-sms] Sending SMS to ${cleanPhone.substring(0, 6)}***`);

    // Step 1: Ensure contact exists in SimpleTexting (upsert)
    const contactResponse = await fetch(`https://api-app2.simpletexting.com/v2/api/contacts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SIMPLETEXTING_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: cleanPhone,
      }),
    });

    // 201 = created, 204 = already exists (updated), both are fine
    if (!contactResponse.ok && contactResponse.status !== 201 && contactResponse.status !== 204) {
      const contactErr = await contactResponse.text();
      console.warn(`[send-sms] Contact upsert returned ${contactResponse.status}: ${contactErr}`);
      // Continue anyway — the contact may already exist
    }

    // Step 2: Send the message
    const response = await fetch("https://api-app2.simpletexting.com/v2/api/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SIMPLETEXTING_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contactPhone: cleanPhone,
        mode: "AUTO",
        text: message,
      }),
    });

    const resultText = await response.text();
    let result: Record<string, unknown> = {};
    try { result = JSON.parse(resultText); } catch { result = { raw: resultText }; }

    if (!response.ok) {
      console.error(`[send-sms] SimpleTexting error (${response.status}): ${resultText}`);

      try {
        await supabase.from("error_logs").insert({
          error_message: `SMS send failed (${response.status}): ${resultText.substring(0, 500)}`,
          page_url: "/edge/send-sms",
        });
      } catch {}

      return new Response(
        JSON.stringify({ success: false, error: `SMS delivery failed (${response.status}). Please try again.`, detail: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-sms] SMS sent successfully`);
    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-sms] Exception:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
