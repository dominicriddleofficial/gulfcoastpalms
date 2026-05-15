import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface CustomerInput {
  id?: string | null;
  display_name?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface PropertyInput {
  id?: string | null;
  address_1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

interface VerifiedAddressInput {
  formatted_address?: string | null;
  street_number?: string | null;
  route?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  county?: string | null;
  place_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geocode_source?: string | null;
}

interface Payload {
  business_id: string;
  customer: CustomerInput;
  property?: PropertyInput | null;
  address_freeform?: string | null;
  verified_address?: VerifiedAddressInput | null;
  title: string;
  description?: string | null;
  internal_notes?: string | null;
  scheduled_date?: string | null; // YYYY-MM-DD
  scheduled_start_time?: string | null; // HH:MM
  duration_minutes?: number | null;
  total?: number | null;
  quote_id?: string | null;
}

// Very loose freeform "1234 Main St, Pensacola, FL 32501" parser.
function parseAddress(s: string): { address_1: string; city: string; state: string; zip: string } | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  const address_1 = parts[0] || trimmed;
  let city = parts[1] || "";
  let state = "FL";
  let zip = "";
  const tail = parts[2] || parts[1] || "";
  const m = tail.match(/([A-Z]{2})\s*(\d{5})?/i);
  if (m) {
    state = (m[1] || "FL").toUpperCase();
    zip = m[2] || "";
    if (parts[2]) city = parts[1] || "";
  }
  if (!city) city = "Pensacola";
  return { address_1, city, state, zip };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Not authenticated" }, 401);

  // Validate user via the user's JWT
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);
  const user = userData.user;

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!payload?.business_id) return json({ error: "business_id required" }, 400);
  if (!payload.title?.trim()) return json({ error: "title required" }, 400);
  if (!payload.customer || (!payload.customer.id && !payload.customer.display_name?.trim())) {
    return json({ error: "customer (id or display_name) required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Authorize: user must have business access AND role owner/manager/office_manager.
  const { data: hasAccess, error: accessErr } = await admin.rpc("has_business_access", {
    _user_id: user.id,
    _business_id: payload.business_id,
  });
  if (accessErr) return json({ error: accessErr.message }, 500);
  if (!hasAccess) return json({ error: "You do not have access to this workspace" }, 403);

  const { data: roleName } = await admin.rpc("get_user_role", {
    _user_id: user.id,
    _business_id: payload.business_id,
  });
  const allowedRoles = new Set(["owner", "manager", "office_manager", "admin"]);
  if (roleName && !allowedRoles.has(String(roleName))) {
    return json({ error: `Role "${roleName}" cannot create jobs` }, 403);
  }

  try {
    // 1. Customer: use existing or create.
    let customerId = payload.customer.id || null;
    if (!customerId) {
      const { data: cust, error: cErr } = await admin
        .from("platform_customers")
        .insert({
          business_id: payload.business_id,
          display_name: payload.customer.display_name!.trim(),
          phone: payload.customer.phone || null,
          email: payload.customer.email || null,
          customer_status: "active",
          source: "platform",
        })
        .select("id")
        .single();
      if (cErr) return json({ error: `Customer create failed: ${cErr.message}` }, 400);
      customerId = cust.id;
    }

    // 2. Property: optional. Use provided id, or parse freeform, or use property fields.
    let propertyId: string | null = payload.property?.id || null;
    if (!propertyId) {
      let propFields: { address_1: string; city: string; state: string; zip: string } | null = null;
      const v = payload.verified_address || null;
      if (v && (v.formatted_address || v.street_address)) {
        propFields = {
          address_1: v.street_address || v.formatted_address || "",
          city: v.city || "Pensacola",
          state: v.state || "FL",
          zip: v.postal_code || "",
        };
      } else if (payload.property?.address_1) {
        propFields = {
          address_1: payload.property.address_1,
          city: payload.property.city || "Pensacola",
          state: payload.property.state || "FL",
          zip: payload.property.zip || "",
        };
      } else if (payload.address_freeform) {
        propFields = parseAddress(payload.address_freeform);
      }
      if (propFields) {
        // Reuse existing property with same address_1 for this customer
        const { data: existing } = await admin
          .from("platform_properties")
          .select("id")
          .eq("business_id", payload.business_id)
          .eq("customer_id", customerId!)
          .ilike("address_1", propFields.address_1)
          .maybeSingle();
        if (existing?.id) {
          propertyId = existing.id;
          if (v) {
            await admin
              .from("platform_properties")
              .update({
                formatted_address: v.formatted_address ?? null,
                street_number: v.street_number ?? null,
                route: v.route ?? null,
                county: v.county ?? null,
                latitude: v.latitude ?? null,
                longitude: v.longitude ?? null,
                map_place_id: v.place_id ?? null,
                address_verified: true,
                address_verified_at: new Date().toISOString(),
                geocode_source: "google_places",
                geocode_status: "success",
              })
              .eq("id", existing.id);
          }
        } else {
          const { data: prop, error: pErr } = await admin
            .from("platform_properties")
            .insert({
              business_id: payload.business_id,
              customer_id: customerId!,
              address_1: propFields.address_1,
              city: propFields.city,
              state: propFields.state,
              zip: propFields.zip,
              property_type: "residential",
              geocode_status: v ? "success" : "pending",
              ...(v
                ? {
                    formatted_address: v.formatted_address ?? null,
                    street_number: v.street_number ?? null,
                    route: v.route ?? null,
                    county: v.county ?? null,
                    latitude: v.latitude ?? null,
                    longitude: v.longitude ?? null,
                    map_place_id: v.place_id ?? null,
                    address_verified: true,
                    address_verified_at: new Date().toISOString(),
                    geocode_source: "google_places",
                  }
                : {}),
            })
            .select("id")
            .single();
          if (pErr) {
            // Property creation is non-fatal; log and continue.
            console.warn("[create-platform-job] property insert failed:", pErr.message);
          } else {
            propertyId = prop.id;
          }
        }
      }
    }

    // 3. Generate job number.
    const { data: jobNumber, error: numErr } = await admin.rpc("generate_next_number", {
      _business_id: payload.business_id,
      _record_type: "job",
    });
    if (numErr || !jobNumber) {
      return json({ error: `Could not generate job number: ${numErr?.message || "unknown"}` }, 500);
    }

    // 4. Insert job.
    const totalNum =
      payload.total != null && Number.isFinite(Number(payload.total)) ? Number(payload.total) : 0;
    const { data: job, error: jErr } = await admin
      .from("platform_jobs")
      .insert({
        business_id: payload.business_id,
        job_number: String(jobNumber),
        customer_id: customerId,
        property_id: propertyId,
        quote_id: payload.quote_id || null,
        title: payload.title.trim(),
        description: payload.description || null,
        status: payload.scheduled_date ? "scheduled" : "draft",
        source: "platform",
        is_read_only: false,
        scheduled_start: payload.scheduled_date || null,
        scheduled_end: payload.scheduled_date || null,
        estimated_duration_minutes: payload.duration_minutes || 60,
        subtotal: totalNum,
        total: totalNum,
        internal_notes: payload.internal_notes || null,
        created_by_user_id: user.id,
      })
      .select("id, job_number, scheduled_start")
      .single();
    if (jErr) return json({ error: `Job create failed: ${jErr.message}` }, 400);

    // 5. Insert visit if a date was provided.
    let visitId: string | null = null;
    if (payload.scheduled_date) {
      const startTime = payload.scheduled_start_time || "09:00";
      const dur = payload.duration_minutes || 60;
      // Compute end time
      const [hh, mm] = startTime.split(":").map((n) => parseInt(n, 10));
      const startMinutes = (hh || 9) * 60 + (mm || 0);
      const endMinutes = startMinutes + dur;
      const eh = Math.floor(endMinutes / 60) % 24;
      const em = endMinutes % 60;
      const endTime = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

      const { data: visit, error: vErr } = await admin
        .from("platform_job_visits")
        .insert({
          business_id: payload.business_id,
          job_id: job.id,
          visit_number: 1,
          title: payload.title.trim(),
          status: "scheduled",
          scheduled_date: payload.scheduled_date,
          scheduled_start_time: startTime,
          scheduled_end_time: endTime,
          duration_minutes: dur,
          property_id: propertyId,
        })
        .select("id")
        .single();
      if (vErr) {
        console.warn("[create-platform-job] visit insert failed:", vErr.message);
      } else {
        visitId = visit.id;
      }
    }

    // 6. Mark quote as converted if applicable.
    if (payload.quote_id) {
      await admin.from("platform_quotes").update({ status: "converted" }).eq("id", payload.quote_id);
    }

    // 7. Audit log (best-effort).
    try {
      await admin.from("audit_logs").insert({
        business_id: payload.business_id,
        user_id: user.id,
        event_name: "job.created",
        entity_type: "platform_job",
        entity_id: job.id,
        metadata: { job_number: job.job_number, source: "platform" },
      });
    } catch (e) {
      console.warn("[create-platform-job] audit log skipped:", (e as Error).message);
    }

    return json({
      ok: true,
      job: { id: job.id, job_number: job.job_number, scheduled_start: job.scheduled_start },
      visit_id: visitId,
      customer_id: customerId,
      property_id: propertyId,
    });
  } catch (e) {
    console.error("[create-platform-job] unexpected:", e);
    return json({ error: (e as Error).message || "Unexpected error" }, 500);
  }
});