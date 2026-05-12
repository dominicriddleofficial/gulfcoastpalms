import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncomingEvent {
  event_name: string;
  page_path?: string;
  page_url?: string;
  referrer?: string;
  business_type?: string;
  source_component?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  device_type?: string;
  visitor_id?: string;
  session_id?: string;
  customer_id?: string;
  lead_id?: string;
  quote_id?: string;
  invoice_id?: string;
  properties?: Record<string, unknown>;
}

const KNOWN_EVENTS = new Set([
  "page_view", "hero_cta_click",
  "quote_request_started", "quote_request_step_completed", "quote_request_photo_added",
  "quote_request_submitted", "quote_request_abandoned",
  "call_now_click", "text_us_click",
  "sticky_bar_call_click", "sticky_bar_text_click",
  "chat_opened", "chat_message_sent", "chat_lead_captured",
  "mobile_menu_opened", "mobile_menu_link_clicked",
  "service_page_cta_click", "location_page_cta_click",
  "quote_viewed", "quote_approved",
  "invoice_viewed", "invoice_paid", "payment_failed",
  // legacy compatibility
  "cta_click", "phone_click", "lead_form_submit", "lead_form_start",
  "chat_widget_open", "job_application_submit", "sop_signed",
  "maintenance_plan_inquiry", "emergency_page_view", "lead_conversion",
  "drip_optin", "referral_submit", "quote_request_completed",
]);

function clamp(s: unknown, max: number): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

async function hashIp(ip: string): Promise<string | null> {
  try {
    const data = new TextEncoder().encode(ip + "|" + (Deno.env.get("SUPABASE_URL") || ""));
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

function normalize(e: IncomingEvent, ipHash: string | null, ua: string | null) {
  const event = clamp(e.event_name, 80);
  if (!event || !KNOWN_EVENTS.has(event)) return null;
  return {
    event_name: event,
    page_path: clamp(e.page_path, 500),
    page_url: clamp(e.page_url, 1000),
    referrer: clamp(e.referrer, 1000),
    business_type: clamp(e.business_type, 32),
    source_component: clamp(e.source_component, 80),
    utm_source: clamp(e.utm_source, 120),
    utm_medium: clamp(e.utm_medium, 120),
    utm_campaign: clamp(e.utm_campaign, 120),
    utm_term: clamp(e.utm_term, 120),
    utm_content: clamp(e.utm_content, 120),
    device_type: clamp(e.device_type, 16),
    user_agent: ua ? ua.slice(0, 500) : null,
    visitor_id: clamp(e.visitor_id, 64),
    session_id: clamp(e.session_id, 64),
    customer_id: clamp(e.customer_id, 36),
    lead_id: clamp(e.lead_id, 36),
    quote_id: clamp(e.quote_id, 36),
    invoice_id: clamp(e.invoice_id, 36),
    properties: (e.properties && typeof e.properties === "object" && !Array.isArray(e.properties))
      ? e.properties
      : {},
    ip_hash: ipHash,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const events: IncomingEvent[] = Array.isArray(body?.events)
      ? body.events
      : body?.event_name ? [body] : [];
    if (!events.length) {
      return new Response(JSON.stringify({ ok: true, accepted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const capped = events.slice(0, 25);

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0.0.0.0";
    const ipHash = await hashIp(ip);
    const ua = req.headers.get("user-agent");

    const rows = capped
      .map((e) => normalize(e, ipHash, ua))
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (!rows.length) {
      return new Response(JSON.stringify({ ok: true, accepted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase.from("analytics_events").insert(rows);
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, accepted: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: m }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});