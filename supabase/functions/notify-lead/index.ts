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
// Owner + office manager cells for lead alerts.
// Overridable via LEAD_ALERT_PHONES (comma-separated) or legacy LEAD_ALERT_PHONE.
const LEAD_ALERT_PHONE_FALLBACKS = ["+18508897255", "+18507127850"];

/**
 * SimpleTexting REST — preferred path when SIMPLETEXTING_API_KEY is set.
 * Same pattern as supabase/functions/send-sms/index.ts: upsert the contact
 * then send the message in AUTO mode. Fail-silent; never throws.
 */
async function sendViaSimpleTexting(to: string, body: string): Promise<{ ok: boolean; id?: string; reason?: string }> {
  const key = Deno.env.get("SIMPLETEXTING_API_KEY");
  if (!key) return { ok: false, reason: "no_simpletexting_key" };
  const cleanPhone = to.replace(/[^\d+]/g, "");
  try {
    // Best-effort contact upsert. 201/204/409 are all fine.
    await fetch("https://api-app2.simpletexting.com/v2/api/contacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone }),
    }).catch(() => null);

    const res = await fetch("https://api-app2.simpletexting.com/v2/api/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ contactPhone: cleanPhone, mode: "AUTO", text: body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("notify-lead: SimpleTexting failed", res.status, data);
      return { ok: false, reason: `simpletexting_${res.status}` };
    }
    return { ok: true, id: (data as { id?: string })?.id };
  } catch (err) {
    console.error("notify-lead: SimpleTexting threw", err);
    return { ok: false, reason: "simpletexting_exception" };
  }
}

/**
 * Fail-silent SMS delivery. Order:
 *   1. SimpleTexting REST (SIMPLETEXTING_API_KEY) — owner's primary SMS platform.
 *   2. Direct Twilio REST (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER).
 *   3. Lovable connector gateway (LOVABLE_API_KEY + TWILIO_API_KEY).
 * If nothing is configured or every provider errors we log and return
 * { ok:false } — the lead still saves and the visitor still sees success.
 */
async function sendLeadSms(to: string, body: string): Promise<{ ok: boolean; sid?: string; reason?: string }> {
  // Path A — SimpleTexting (preferred)
  const stResult = await sendViaSimpleTexting(to, body);
  if (stResult.ok) return { ok: true, sid: stResult.id };
  // Only fall through if SimpleTexting is unconfigured; a real API error
  // still tries Twilio as a redundant backup path.

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const directFrom = Deno.env.get("TWILIO_FROM_NUMBER");

  // Path B — direct Twilio REST
  if (accountSid && authToken && directFrom) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
      const auth = btoa(`${accountSid}:${authToken}`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: directFrom, Body: body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("notify-lead: direct Twilio REST failed", res.status, data);
        return { ok: false, reason: `twilio_${res.status}` };
      }
      return { ok: true, sid: data?.sid };
    } catch (err) {
      console.error("notify-lead: direct Twilio REST threw", err);
      return { ok: false, reason: "twilio_exception" };
    }
  }

  // Path C — Lovable connector gateway (existing setup)
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const gatewayKey = Deno.env.get("TWILIO_API_KEY");
  if (lovableKey && gatewayKey) {
    try {
      const numbersRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json`, {
        headers: {
          "Authorization": `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gatewayKey,
        },
      });
      const numbersData = await numbersRes.json().catch(() => ({}));
      const fromNumber = numbersData?.incoming_phone_numbers?.[0]?.phone_number;
      if (!numbersRes.ok || !fromNumber) {
        console.error("notify-lead: gateway lookup failed", numbersRes.status);
        return { ok: false, reason: "gateway_no_number" };
      }
      const smsRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gatewayKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: fromNumber, Body: body }),
      });
      const smsData = await smsRes.json().catch(() => ({}));
      if (!smsRes.ok) {
        console.error("notify-lead: gateway send failed", smsRes.status, smsData);
        return { ok: false, reason: `gateway_${smsRes.status}` };
      }
      return { ok: true, sid: smsData?.sid };
    } catch (err) {
      console.error("notify-lead: gateway threw", err);
      return { ok: false, reason: "gateway_exception" };
    }
  }

  console.warn("notify-lead: no SMS credentials configured; lead saved without alert");
  return { ok: false, reason: stResult.reason || "no_credentials" };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    // Sanitize inputs for SMS body
    const safeName = String(name).substring(0, 100);
    const safePhone = String(phone || "N/A").substring(0, 20);
    const safeService = String(service || "N/A").substring(0, 100);
    const safeLocation = String(location || "N/A").substring(0, 200);
    const rawMessage = String(message || "").trim();
    const safeMessage = rawMessage.length > 200 ? rawMessage.slice(0, 197) + "..." : rawMessage;
    const safeUrgency = String(body.urgency || "normal").substring(0, 20);

    const parts = [
      `NEW GCP LEAD 🌴 ${safeName}`,
      safePhone,
      safeService,
      location ? safeLocation : null,
      `Urgency: ${safeUrgency}`,
    ].filter(Boolean).join(" · ");
    const smsBody = safeMessage
      ? `${parts}. Msg: ${safeMessage}. Reply fast!`
      : `${parts}. Reply fast!`;

    // Resolve recipients: LEAD_ALERT_PHONES (comma-separated) overrides,
    // then legacy single LEAD_ALERT_PHONE, then the built-in owner + manager list.
    const configured = Deno.env.get("LEAD_ALERT_PHONES");
    const legacySingle = Deno.env.get("LEAD_ALERT_PHONE");
    const destinations = configured
      ? configured.split(",").map(s => s.trim()).filter(Boolean)
      : legacySingle
        ? [legacySingle]
        : LEAD_ALERT_PHONE_FALLBACKS;

    // Sequential per-recipient sends, each in its own try/catch, with a small
    // gap between recipients (SimpleTexting rate-limits rapid back-to-back
    // calls) and one retry on failure. If a recipient still fails, log to
    // error_logs and fire a fallback SMS to the owner so a silent miss can
    // never happen again.
    const OWNER_FALLBACK = "+18508897255";
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const results: Array<{ recipient: string; ok: boolean; sid?: string; reason?: string; attempts: number }> = [];
    for (let i = 0; i < destinations.length; i++) {
      const dest = destinations[i];
      if (i > 0) await sleep(500); // gap between recipients
      let attempt = 0;
      let r: { ok: boolean; sid?: string; reason?: string } = { ok: false };
      try {
        r = await sendLeadSms(dest, smsBody);
        attempt = 1;
        if (!r.ok) {
          await sleep(2000);
          r = await sendLeadSms(dest, smsBody);
          attempt = 2;
        }
      } catch (err) {
        console.error(`notify-lead: sendLeadSms threw for ${dest}`, err);
        r = { ok: false, reason: err instanceof Error ? err.message : "throw" };
      }
      results.push({ recipient: dest, ok: r.ok, sid: r.sid, reason: r.reason, attempts: attempt });

      if (!r.ok) {
        // Log the miss
        try {
          await supabaseAdmin.from("error_logs").insert({
            error_type: "lead_alert_sms_failed",
            error_message: `Lead alert SMS to ${dest} failed after ${attempt} attempt(s): ${r.reason ?? "unknown"}`,
            context: {
              recipient: dest,
              reason: r.reason,
              attempts: attempt,
              lead_name: safeName,
              lead_phone: safePhone,
              lead_service: safeService,
            },
          });
        } catch (logErr) {
          console.error("notify-lead: error_logs insert failed", logErr);
        }
        // Fallback alert to owner (skip if the failing recipient IS the owner)
        if (dest !== OWNER_FALLBACK) {
          try {
            await sendLeadSms(
              OWNER_FALLBACK,
              `⚠️ Lead alert to ${dest} FAILED — ${safeName} ${safePhone}`,
            );
          } catch (fbErr) {
            console.error("notify-lead: fallback owner SMS threw", fbErr);
          }
        }
      }
    }
    const anyOk = results.some(r => r.ok);
    const sids = results.filter(r => r.ok).map(r => r.sid).filter(Boolean);
    const reasons = results.filter(r => !r.ok).map(r => `${r.recipient}:${r.reason}`);

    // Fail-silent: always return success so the client-side lead flow never
    // shows an error to the visitor when Twilio is misconfigured/down.
    return new Response(
      JSON.stringify(
        anyOk
          ? { success: true, sids, sent_to: destinations.length, failed_reasons: reasons }
          : { success: true, sids: [], sms_skipped: true, reasons }
      ),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    // Fail-silent even for unexpected errors — the lead has already saved
    // client-side; a broken SMS alert must never surface to the visitor.
    console.error("notify-lead unhandled error:", error);
    return new Response(
      JSON.stringify({ success: true, sms_skipped: true, reason: "server_error" }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
