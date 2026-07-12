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

// Dominic ONLY per product requirement — do not add Ryan / office manager here.
const APPLICANT_ALERT_PHONE = "+18508897255";

interface ApplicationInput {
  full_name?: string;
  age?: string | number | null;
  phone?: string;
  email?: string | null;
  city?: string | null;
  position?: string;
  has_transportation?: boolean | string | null;
  has_experience?: string | null;
  work_experience?: string | null;
  comfortable_outdoors?: boolean | string | null;
  why_good_fit?: string | null;
  resume_url?: string | null;
  voice_note_url?: string | null;
  best_contact_time?: string | null;
  acknowledged?: boolean;
  // New-page fields (stored in why_good_fit / work_experience or notes)
  own_truck?: boolean | string | null;
  years_experience?: string | null;
  // Anti-spam
  website?: string;
  formRenderTime?: number;
}

function json(status: number, body: unknown, headers: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...(headers as Record<string, string>), "Content-Type": "application/json" },
  });
}

function truthy(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "yes" || v.toLowerCase() === "true";
  return false;
}

async function sendViaSimpleTexting(to: string, body: string): Promise<{ ok: boolean; id?: string; reason?: string }> {
  const key = Deno.env.get("SIMPLETEXTING_API_KEY");
  if (!key) return { ok: false, reason: "no_simpletexting_key" };
  const cleanPhone = to.replace(/[^\d+]/g, "");
  try {
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
      console.error("submit-application: SimpleTexting failed", res.status, data);
      return { ok: false, reason: `simpletexting_${res.status}` };
    }
    return { ok: true, id: (data as { id?: string })?.id };
  } catch (err) {
    console.error("submit-application: SimpleTexting threw", err);
    return { ok: false, reason: "simpletexting_exception" };
  }
}

async function sendSms(to: string, body: string): Promise<{ ok: boolean; sid?: string; reason?: string }> {
  const st = await sendViaSimpleTexting(to, body);
  if (st.ok) return { ok: true, sid: st.id };

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const directFrom = Deno.env.get("TWILIO_FROM_NUMBER");
  if (accountSid && authToken && directFrom) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
      const auth = btoa(`${accountSid}:${authToken}`);
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: to, From: directFrom, Body: body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, reason: `twilio_${res.status}` };
      return { ok: true, sid: (data as { sid?: string })?.sid };
    } catch (err) {
      console.error("submit-application: Twilio threw", err);
      return { ok: false, reason: "twilio_exception" };
    }
  }
  return { ok: false, reason: st.reason || "no_credentials" };
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" }, cors);

  let body: ApplicationInput;
  try {
    body = (await req.json()) as ApplicationInput;
  } catch {
    return json(400, { success: false, error: "Invalid JSON" }, cors);
  }

  // Honeypot — silently succeed
  if (body.website && String(body.website).trim().length > 0) {
    return json(200, { success: true, honeypot: true }, cors);
  }
  if (body.formRenderTime && Date.now() - Number(body.formRenderTime) < 1500) {
    return json(200, { success: true, too_fast: true }, cors);
  }

  const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const position = (typeof body.position === "string" && body.position.trim()) || "Applicant";

  if (!full_name || full_name.length < 2 || full_name.length > 100) {
    return json(400, { success: false, error: "Name is required" }, cors);
  }
  if (!phone || phone.length < 7 || phone.length > 20) {
    return json(400, { success: false, error: "Valid phone is required" }, cors);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const ageNum = body.age != null && body.age !== ""
    ? Number.parseInt(String(body.age), 10)
    : null;

  // Include Trimmer-form extras in why_good_fit / notes so they persist without a schema change.
  const yearsExp = typeof body.years_experience === "string" ? body.years_experience.trim() : "";
  const hasTruck = truthy(body.own_truck ?? body.has_transportation);
  const whyFit = typeof body.why_good_fit === "string" ? body.why_good_fit.trim() : "";
  const composedWhy = [
    yearsExp ? `Years experience: ${yearsExp}` : null,
    body.own_truck != null ? `Own truck: ${hasTruck ? "Yes" : "No"}` : null,
    whyFit || null,
  ].filter(Boolean).join("\n\n");

  const insertRow = {
    full_name,
    age: Number.isFinite(ageNum) ? ageNum : null,
    phone,
    email: (typeof body.email === "string" && body.email.trim()) || null,
    city: (typeof body.city === "string" && body.city.trim()) || null,
    position,
    has_transportation: body.has_transportation != null || body.own_truck != null
      ? hasTruck
      : null,
    has_experience: (typeof body.has_experience === "string" && body.has_experience) || (yearsExp || null),
    work_experience: (typeof body.work_experience === "string" && body.work_experience) || null,
    comfortable_outdoors: body.comfortable_outdoors != null ? truthy(body.comfortable_outdoors) : null,
    why_good_fit: composedWhy || null,
    resume_url: (typeof body.resume_url === "string" && body.resume_url) || null,
    voice_note_url: (typeof body.voice_note_url === "string" && body.voice_note_url) || null,
    best_contact_time: (typeof body.best_contact_time === "string" && body.best_contact_time) || null,
    acknowledged: !!body.acknowledged,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("job_applications")
    .insert(insertRow)
    .select("id")
    .single();

  if (insertErr) {
    console.error("submit-application: insert failed", insertErr);
    return json(500, { success: false, error: "Could not save application. Please try again." }, cors);
  }

  // Fire SMS — never blocks / never fails the response.
  const safeName = full_name.substring(0, 60);
  const safePhone = phone.substring(0, 20);
  const safePosition = position.substring(0, 40);
  const truckLabel = body.own_truck != null || body.has_transportation != null
    ? (hasTruck ? "Yes" : "No")
    : "?";
  const yearsLabel = yearsExp || (typeof body.has_experience === "string" ? body.has_experience : "") || "n/a";
  const smsBody = `👷 NEW JOB APPLICANT: ${safeName} · ${safePhone} · ${safePosition} · Truck: ${truckLabel} · ${yearsLabel}. Call while they're hot.`;

  try {
    await sendSms(APPLICANT_ALERT_PHONE, smsBody);
  } catch (err) {
    console.error("submit-application: SMS threw", err);
  }

  return json(200, { success: true, id: inserted?.id ?? null }, cors);
});