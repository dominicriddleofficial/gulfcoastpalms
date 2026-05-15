const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Verified = {
  formatted_address: string;
  street_address: string;
  street_number: string | null;
  route: string | null;
  city: string;
  state: string;
  postal_code: string;
  county: string | null;
  place_id: string;
  latitude: number;
  longitude: number;
};

type Body = {
  target: "platform_property" | "jobber_property";
  property_id: string;
  business_id: string;
  verified?: Verified | null;
  free_text?: { address_1: string; city?: string; state?: string; zip?: string } | null;
};

const ALLOWED_ROLES = new Set(["owner", "office_manager", "manager"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supaUser = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const token = auth.slice(7);
  const { data: claims, error: claimsErr } = await supaUser.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const userId = claims.claims.sub as string;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.property_id || !body.business_id || !body.target) {
    return json({ error: "property_id, business_id and target are required" }, 400);
  }
  if (!body.verified && !body.free_text) {
    return json({ error: "verified or free_text is required" }, 400);
  }

  const svc = createClient(url, service);

  // Authorize: must have business access AND an allowed role
  const { data: hasAccess } = await svc.rpc("has_business_access", {
    _user_id: userId,
    _business_id: body.business_id,
  });
  if (!hasAccess) return json({ error: "You do not have access to this business." }, 403);

  const { data: roleName } = await svc.rpc("get_user_role", {
    _user_id: userId,
    _business_id: body.business_id,
  });
  const role = (roleName as string | null) || "";
  if (!ALLOWED_ROLES.has(role)) {
    return json({ error: "You do not have permission to edit this address." }, 403);
  }

  const v = body.verified;
  const ft = body.free_text;
  const now = new Date().toISOString();

  if (body.target === "platform_property") {
    const { data: existing, error: exErr } = await svc
      .from("platform_properties")
      .select("*")
      .eq("id", body.property_id)
      .maybeSingle();
    if (exErr || !existing) return json({ error: "Property not found" }, 404);
    if (existing.business_id !== body.business_id) return json({ error: "Forbidden" }, 403);

    const patch = v
      ? {
          address_1: v.street_address || v.formatted_address,
          city: v.city || existing.city,
          state: v.state || existing.state,
          zip: v.postal_code || existing.zip,
          formatted_address: v.formatted_address,
          street_number: v.street_number,
          route: v.route,
          county: v.county,
          latitude: v.latitude,
          longitude: v.longitude,
          map_place_id: v.place_id,
          address_verified: true,
          address_verified_at: now,
          geocode_source: "google_places",
          geocode_status: "success",
        }
      : {
          address_1: ft!.address_1,
          ...(ft!.city ? { city: ft!.city } : {}),
          ...(ft!.state ? { state: ft!.state } : {}),
          ...(ft!.zip ? { zip: ft!.zip } : {}),
          latitude: null,
          longitude: null,
          map_place_id: null,
          formatted_address: null,
          address_verified: false,
          address_verified_at: null,
          geocode_source: null,
          geocode_status: "pending",
        };

    const { data: updated, error: upErr } = await svc
      .from("platform_properties")
      .update(patch)
      .eq("id", body.property_id)
      .select("*")
      .single();
    if (upErr) return json({ error: "Unable to update address." }, 500);

    await svc.from("audit_logs").insert({
      business_id: body.business_id,
      user_id: userId,
      event_name: "address.updated",
      entity_type: "platform_property",
      entity_id: body.property_id,
      action_type: "update",
      old_values_json: existing,
      new_values_json: updated,
      context_json: { verified: !!v },
    });

    return json({ ok: true, property: updated });
  }

  if (body.target === "jobber_property") {
    const { data: existing, error: exErr } = await svc
      .from("jobber_properties")
      .select("*")
      .eq("id", body.property_id)
      .maybeSingle();
    if (exErr || !existing) return json({ error: "Property not found" }, 404);
    if (existing.business_id !== body.business_id) return json({ error: "Forbidden" }, 403);

    // Preserve original Jobber address the first time we override locally.
    const original_address =
      existing.original_address ||
      [existing.street1, existing.city, existing.state, existing.zip].filter(Boolean).join(", ");

    const patch = v
      ? {
          street1: v.street_address || v.formatted_address,
          city: v.city || existing.city,
          state: v.state || existing.state,
          zip: v.postal_code || existing.zip,
          country: "US",
          lat: v.latitude,
          lng: v.longitude,
          formatted_address: v.formatted_address,
          place_id: v.place_id,
          county: v.county,
          address_verified: true,
          address_verified_at: now,
          geocode_source: "google_places",
          original_address,
        }
      : {
          street1: ft!.address_1,
          ...(ft!.city ? { city: ft!.city } : {}),
          ...(ft!.state ? { state: ft!.state } : {}),
          ...(ft!.zip ? { zip: ft!.zip } : {}),
          lat: null,
          lng: null,
          formatted_address: null,
          place_id: null,
          address_verified: false,
          address_verified_at: null,
          geocode_source: null,
          original_address,
        };

    const { data: updated, error: upErr } = await svc
      .from("jobber_properties")
      .update(patch)
      .eq("id", body.property_id)
      .select("*")
      .single();
    if (upErr) return json({ error: "Unable to update address." }, 500);

    await svc.from("audit_logs").insert({
      business_id: body.business_id,
      user_id: userId,
      event_name: "address.updated",
      entity_type: "jobber_property",
      entity_id: body.property_id,
      action_type: "update",
      old_values_json: existing,
      new_values_json: updated,
      context_json: { verified: !!v, imported: true },
    });

    return json({ ok: true, property: updated });
  }

  return json({ error: "Unknown target" }, 400);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}