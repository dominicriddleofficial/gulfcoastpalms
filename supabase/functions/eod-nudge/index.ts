import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gulf Coast Palms business id — nudges are GCP-specific per owner spec.
const GCP_BUSINESS_ID = "b0000000-0000-0000-0000-000000000001";
const RYAN_PHONE = "+18507127850";
const DOMINIC_PHONE = "+18508897255";

async function sendSimpleTexting(to: string, body: string): Promise<{ ok: boolean; id?: string; reason?: string }> {
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
    if (!res.ok) return { ok: false, reason: `simpletexting_${res.status}` };
    return { ok: true, id: (data as { id?: string })?.id };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

function todayCT(): string {
  const now = new Date();
  // Get YYYY-MM-DD in America/Chicago
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey);

  let stage: "ryan" | "dominic" = "ryan";
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.stage === "dominic") stage = "dominic";
  } catch { /* default ryan */ }

  const date = todayCT();

  const { data: existing, error: qErr } = await supabase
    .from("eod_reports")
    .select("id")
    .eq("business_id", GCP_BUSINESS_ID)
    .eq("report_date", date)
    .maybeSingle();

  if (qErr) {
    return new Response(
      JSON.stringify({ error: qErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (existing) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "report_already_submitted", stage, date }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const to = stage === "ryan" ? RYAN_PHONE : DOMINIC_PHONE;
  const msg =
    stage === "ryan"
      ? "EOD report not filed yet — takes 2 min. File it in the platform."
      : "Heads up: Ryan's EOD report was not filed today.";

  const result = await sendSimpleTexting(to, msg);
  return new Response(
    JSON.stringify({ stage, date, to, sent: result.ok, id: result.id ?? null, reason: result.reason ?? null }),
    { status: result.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});