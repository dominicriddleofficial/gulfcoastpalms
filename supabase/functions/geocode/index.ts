const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

async function checkRateLimit(supabase: any, identifier: string, endpoint: string, maxRequests: number, windowMinutes: number): Promise<boolean> {
  // Cleanup expired counters
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  await supabase.from("rate_limit_counters").delete().lt("window_start", cutoff).eq("endpoint", endpoint);

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("rate_limit_counters")
    .select("request_count, id")
    .eq("identifier", identifier)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart)
    .maybeSingle();

  if (data && data.request_count >= maxRequests) return false;

  if (data) {
    await supabase.from("rate_limit_counters").update({ request_count: data.request_count + 1 }).eq("id", data.id);
  } else {
    await supabase.from("rate_limit_counters").insert({ identifier, endpoint, request_count: 1, window_start: new Date().toISOString() });
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  const supabase = createClient(supabaseUrl, serviceKey);

  if (!mapsKey) {
    return new Response(JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limit by IP — max 30 per hour
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const allowed = await checkRateLimit(supabase, ip, "geocode", 30, 60);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { addresses } = await req.json();
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return new Response(JSON.stringify({ error: "addresses array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batch = addresses.slice(0, 25);
    const results: Record<string, { lat: number; lng: number; status: string } | { status: string; error: string }> = {};

    const { data: cached } = await supabase
      .from("geocode_cache")
      .select("address, lat, lng, status")
      .in("address", batch);

    const cachedMap = new Map((cached || []).map((c: any) => [c.address, c]));
    const toGeocode: string[] = [];

    for (const addr of batch) {
      const c = cachedMap.get(addr);
      if (c && c.status === "success" && c.lat && c.lng) {
        results[addr] = { lat: c.lat, lng: c.lng, status: "success" };
      } else {
        toGeocode.push(addr);
      }
    }

    for (const addr of toGeocode) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${mapsKey}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.status === "OK" && data.results?.[0]) {
          const loc = data.results[0].geometry.location;
          results[addr] = { lat: loc.lat, lng: loc.lng, status: "success" };
          await supabase.from("geocode_cache").upsert({ address: addr, lat: loc.lat, lng: loc.lng, status: "success" }, { onConflict: "address" });
        } else {
          results[addr] = { status: "failed", error: data.status || "Unknown error" };
          await supabase.from("geocode_cache").upsert({ address: addr, status: "failed", error_message: data.status }, { onConflict: "address" });
        }

        if (toGeocode.indexOf(addr) < toGeocode.length - 1) {
          await new Promise(r => setTimeout(r, 100));
        }
      } catch (e) {
        results[addr] = { status: "failed", error: String(e) };
      }
    }

    return new Response(JSON.stringify({ results, geocoded: toGeocode.length, cached: batch.length - toGeocode.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
