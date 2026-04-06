import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limit by IP — max 10 per hour
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";

  // Cleanup old entries
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await supabase.from("rate_limit_counters").delete().lt("window_start", cutoff).eq("endpoint", "maps-config");

  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: rlData } = await supabase
    .from("rate_limit_counters")
    .select("request_count, id")
    .eq("identifier", ip)
    .eq("endpoint", "maps-config")
    .gte("window_start", windowStart)
    .maybeSingle();

  if (rlData && rlData.request_count >= 10) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (rlData) {
    await supabase.from("rate_limit_counters").update({ request_count: rlData.request_count + 1 }).eq("id", rlData.id);
  } else {
    await supabase.from("rate_limit_counters").insert({ identifier: ip, endpoint: "maps-config", request_count: 1, window_start: new Date().toISOString() });
  }

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Google Maps API key not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ apiKey }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
