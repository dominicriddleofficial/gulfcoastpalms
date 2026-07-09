import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGINS = [
  "https://gulfcoastpalmservices.com",
  "https://www.gulfcoastpalmservices.com",
  "https://gulfcoastpalms.lovable.app",
  "https://id-preview--2e9a44f0-ac4c-4ebd-ad4f-dd591d732484.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const GCP_BUSINESS_ID = "b0000000-0000-0000-0000-000000000001";

interface LeadInput {
  name?: string;
  phone?: string;
  email?: string;
  source?: string;
  service?: string;
  location?: string;
  message?: string;
  sqft?: number;
  website?: string;
  formRenderTime?: number;
  lead_source?: string;
  page_context?: {
    website_origin?: string | null;
    landing_page_url?: string | null;
    referrer_url?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
  };
}

function json(status: number, body: unknown, headers: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...(headers as Record<string, string>), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" }, cors);

  let body: LeadInput;
  try {
    body = (await req.json()) as LeadInput;
  } catch {
    return json(400, { success: false, error: "Invalid JSON" }, cors);
  }

  // Honeypot: silently succeed
  if (body.website && String(body.website).trim().length > 0) {
    return json(200, { success: true, honeypot: true }, cors);
  }
  // Render-time anti-spam
  if (body.formRenderTime && Date.now() - Number(body.formRenderTime) < 2000) {
    return json(200, { success: true, too_fast: true }, cors);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const source = (typeof body.source === "string" && body.source.trim()) || "website";

  if (!name || name.length > 200) {
    return json(400, { success: false, error: "Please enter your name." }, cors);
  }
  if (!phone && !email) {
    return json(400, { success: false, error: "Please enter a phone or email so we can reach you." }, cors);
  }
  if (phone && (phone.length < 7 || phone.length > 30)) {
    return json(400, { success: false, error: "That phone number doesn't look right." }, cors);
  }
  if (email && (email.length > 255 || !email.includes("@"))) {
    return json(400, { success: false, error: "That email address doesn't look right." }, cors);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const service = typeof body.service === "string" ? body.service.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const leadSource = typeof body.lead_source === "string" && body.lead_source.trim() ? body.lead_source.trim() : "Direct / Unknown";
  const ctx = body.page_context || {};

  // Dedupe: same business + phone + source in last 10 min → success, no writes.
  if (phone) {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("platform_leads")
      .select("id")
      .eq("business_id", GCP_BUSINESS_ID)
      .eq("inquiry_phone", phone)
      .eq("source_name", source)
      .gte("created_at", tenMinAgo)
      .limit(1);
    if (recent && recent.length > 0) {
      return json(200, { success: true, duplicate: true, id: recent[0].id }, cors);
    }
  }

  // Insert platform_leads
  const { data: platformLead, error: platformErr } = await supabase
    .from("platform_leads")
    .insert({
      business_id: GCP_BUSINESS_ID,
      inquiry_name: name,
      inquiry_phone: phone || null,
      inquiry_email: email || null,
      requested_service: service || null,
      requested_service_category: service || null,
      message: message || null,
      source_name: source,
      urgency_level: "normal",
      lead_status: "new",
      lead_source: leadSource,
      raw_payload_json: {
        location: location || null,
        sqft: body.sqft ?? null,
        source,
      },
      website_origin: ctx.website_origin ?? null,
      landing_page_url: ctx.landing_page_url ?? null,
      referrer_url: ctx.referrer_url ?? null,
      utm_source: ctx.utm_source ?? null,
      utm_medium: ctx.utm_medium ?? null,
      utm_campaign: ctx.utm_campaign ?? null,
      utm_content: ctx.utm_content ?? null,
      utm_term: ctx.utm_term ?? null,
    })
    .select("id")
    .single();

  if (platformErr) {
    console.error("submit-lead: platform_leads insert failed", platformErr);
    return json(500, { success: false, error: "Could not save your request. Please call us." }, cors);
  }

  // Insert legacy leads (best-effort — do not fail the submission on error)
  const { data: legacyLead, error: legacyErr } = await supabase
    .from("leads")
    .insert({
      name,
      phone: phone || null,
      email: email || null,
      source,
      service: service || null,
      location: location || null,
      message: message || null,
      sqft: body.sqft ?? null,
      lead_source: leadSource,
    })
    .select("id")
    .single();

  if (legacyErr) {
    console.error("submit-lead: legacy leads insert failed (non-fatal)", legacyErr);
  }

  // Enroll in post-lead drip if we captured a legacy id (email drip processor keys off leads table)
  if (legacyLead?.id) {
    const nextSend = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: dripErr } = await supabase.from("email_drip_enrollments").insert({
      lead_id: legacyLead.id,
      sequence_type: "post_lead",
      current_step: 0,
      next_send_at: nextSend,
      status: "active",
    });
    if (dripErr) console.error("submit-lead: drip enrollment failed (non-fatal)", dripErr);
  }

  // Fire owner SMS via notify-lead — non-blocking; failures never surface.
  try {
    await supabase.functions.invoke("notify-lead", {
      body: {
        name,
        phone,
        email,
        service,
        location,
        message,
      },
    });
  } catch (err) {
    console.error("submit-lead: notify-lead invoke failed (non-fatal)", err);
  }

  return json(200, {
    success: true,
    id: platformLead?.id,
    legacy_id: legacyLead?.id ?? null,
  }, cors);
});