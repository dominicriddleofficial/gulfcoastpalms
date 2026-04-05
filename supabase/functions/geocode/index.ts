import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

  try {
    const { addresses } = await req.json();
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return new Response(JSON.stringify({ error: "addresses array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit batch size
    const batch = addresses.slice(0, 25);
    const results: Record<string, { lat: number; lng: number; status: string } | { status: string; error: string }> = {};

    // Check cache first
    const { data: cached } = await supabase
      .from("geocode_cache")
      .select("address, lat, lng, status")
      .in("address", batch);

    const cachedMap = new Map((cached || []).map(c => [c.address, c]));
    const toGeocode: string[] = [];

    for (const addr of batch) {
      const c = cachedMap.get(addr);
      if (c && c.status === "success" && c.lat && c.lng) {
        results[addr] = { lat: c.lat, lng: c.lng, status: "success" };
      } else if (c && c.status === "failed") {
        results[addr] = { status: "failed", error: "Previously failed geocoding" };
      } else {
        toGeocode.push(addr);
      }
    }

    // Geocode missing addresses with rate limiting
    for (const addr of toGeocode) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${mapsKey}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.status === "OK" && data.results?.[0]) {
          const loc = data.results[0].geometry.location;
          results[addr] = { lat: loc.lat, lng: loc.lng, status: "success" };

          await supabase.from("geocode_cache").upsert({
            address: addr, lat: loc.lat, lng: loc.lng, status: "success",
          }, { onConflict: "address" });
        } else {
          results[addr] = { status: "failed", error: data.status || "Unknown error" };
          await supabase.from("geocode_cache").upsert({
            address: addr, status: "failed", error_message: data.status,
          }, { onConflict: "address" });
        }

        // Small delay between requests
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
