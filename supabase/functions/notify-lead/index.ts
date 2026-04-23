import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const OWNER_PHONE = "+18509101290";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const body = await req.json();

    // Server-side validation
    const { name, phone, email, service, location, message, website } = body;
    // Honeypot: silently succeed if filled
    if (website && typeof website === "string" && website.trim().length > 0) {
      return new Response(JSON.stringify({ success: true, sid: "honeypot_blocked" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!name || typeof name !== "string" || name.trim().length === 0 || name.trim().length > 100) {
      return new Response(JSON.stringify({ error: true, message: "Name is required", code: "VALIDATION_ERROR" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!phone && !email) {
      return new Response(JSON.stringify({ error: true, message: "Phone or email is required", code: "VALIDATION_ERROR" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (phone && (typeof phone !== "string" || phone.trim().length < 7 || phone.trim().length > 20)) {
      return new Response(JSON.stringify({ error: true, message: "Invalid phone number", code: "VALIDATION_ERROR" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (email && (typeof email !== "string" || !email.includes("@") || email.length > 255)) {
      return new Response(JSON.stringify({ error: true, message: "Invalid email address", code: "VALIDATION_ERROR" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 5 submissions per phone per 24h window
    let skipSms = false;
    if (phone) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      await supabaseAdmin.from("rate_limit_counters").delete().lt("window_start", new Date(Date.now() - 86400000).toISOString());

      const { data: existing } = await supabaseAdmin
        .from("rate_limit_counters")
        .select("request_count, window_start")
        .eq("identifier", phone.trim())
        .eq("endpoint", "notify-lead")
        .single();

      if (existing) {
        const windowAge = Date.now() - new Date(existing.window_start).getTime();
        if (windowAge < 86400000 && existing.request_count >= 5) {
          skipSms = true;
        } else if (windowAge >= 86400000) {
          await supabaseAdmin.from("rate_limit_counters").upsert({
            identifier: phone.trim(), endpoint: "notify-lead", request_count: 1, window_start: new Date().toISOString(),
          }, { onConflict: "identifier,endpoint" });
        } else {
          await supabaseAdmin.from("rate_limit_counters").upsert({
            identifier: phone.trim(), endpoint: "notify-lead", request_count: existing.request_count + 1, window_start: existing.window_start,
          }, { onConflict: "identifier,endpoint" });
        }
      } else {
        await supabaseAdmin.from("rate_limit_counters").upsert({
          identifier: phone.trim(), endpoint: "notify-lead", request_count: 1, window_start: new Date().toISOString(),
        }, { onConflict: "identifier,endpoint" });
      }
    }

    if (skipSms) {
      return new Response(JSON.stringify({ success: true, sid: "rate_limited_sms_skipped" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const numbersRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json`, {
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
      },
    });
    const numbersData = await numbersRes.json();
    if (!numbersRes.ok) {
      throw new Error("Failed to get phone numbers");
    }

    const fromNumber = numbersData?.incoming_phone_numbers?.[0]?.phone_number;
    if (!fromNumber) throw new Error("No Twilio phone number found");

    // Sanitize inputs for SMS body
    const safeName = String(name).substring(0, 100);
    const safePhone = String(phone || "N/A").substring(0, 20);
    const safeEmail = String(email || "N/A").substring(0, 255);
    const safeService = String(service || "N/A").substring(0, 100);
    const safeLocation = String(location || "N/A").substring(0, 200);
    const safeMessage = String(message || "N/A").substring(0, 500);

    const smsBody = `🌴 NEW LEAD\nName: ${safeName}\nPhone: ${safePhone}\nEmail: ${safeEmail}\nService: ${safeService}\nLocation: ${safeLocation}\nMessage: ${safeMessage}`;

    const smsRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: OWNER_PHONE, From: fromNumber, Body: smsBody }),
    });

    const smsData = await smsRes.json();
    if (!smsRes.ok) {
      throw new Error("SMS delivery failed");
    }

    return new Response(JSON.stringify({ success: true, sid: smsData.sid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("notify-lead error:", error);
    return new Response(JSON.stringify({ error: true, message: "An error occurred. Please try again.", code: "SERVER_ERROR" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
