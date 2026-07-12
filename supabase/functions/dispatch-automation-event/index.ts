import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventBody {
  business_id: string;
  event_name: string;            // e.g. quote.approved, job.completed, invoice.sent, lead.created, recurring.due
  payload?: Record<string, unknown>;
}

function renderTemplate(tmpl: string, ctx: Record<string, unknown>): string {
  return tmpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const parts = key.split(".");
    let cur: unknown = ctx;
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else { return ""; }
    }
    return cur == null ? "" : String(cur);
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth gate — accept either the service-role key (server-to-server / cron)
  // or a valid user JWT belonging to the target business. Otherwise anyone
  // on the internet could fire automation rules for any business.
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!bearer) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const isServiceRole = bearer === serviceKey;
  let callerUserId: string | null = null;
  if (!isServiceRole) {
    const authClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${bearer}` } } },
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser(bearer);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    callerUserId = userData.user.id;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: EventBody;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }
  if (!body?.business_id || !body?.event_name) {
    return new Response(JSON.stringify({ error: "business_id and event_name required" }), { status: 400, headers: corsHeaders });
  }

  // Non-service-role callers must have access to the target business.
  if (!isServiceRole && callerUserId) {
    const { data: hasAccess } = await supabase.rpc("has_business_access", {
      _user_id: callerUserId,
      _business_id: body.business_id,
    });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const ctx = { ...(body.payload || {}), business_id: body.business_id, event_name: body.event_name };

  const { data: rules } = await supabase
    .from("automation_rules")
    .select("id, action_type, action_config, conditions")
    .eq("business_id", body.business_id)
    .eq("event_name", body.event_name)
    .eq("enabled", true);

  const fired: string[] = [];
  let ranOk = 0, ranFail = 0;

  for (const r of rules || []) {
    const { data: run } = await supabase.from("automation_runs").insert({
      business_id: body.business_id,
      rule_id: r.id,
      event_name: body.event_name,
      event_payload: body.payload ?? {},
      status: "pending",
    }).select("id").single();

    let ok = false; let err: string | null = null;
    try {
      const cfg = (r.action_config || {}) as Record<string, unknown>;
      switch (r.action_type) {
        case "send_sms": {
          const phone = String(cfg.phone || (ctx as Record<string, unknown>).phone || "");
          const message = renderTemplate(String(cfg.template || ""), ctx);
          if (!phone || !message) throw new Error("send_sms missing phone or template");
          await supabase.from("sms_queue").insert({
            business_id: body.business_id,
            phone,
            message_body: message,
            reason: body.event_name,
            related_type: String(cfg.related_type || "automation"),
            related_id: (ctx as Record<string, unknown>).related_id as string | null ?? null,
          });
          ok = true; break;
        }
        case "create_notification": {
          await supabase.rpc("create_business_notification", {
            _business_id: body.business_id,
            _type: String(cfg.type || body.event_name),
            _title: renderTemplate(String(cfg.title || body.event_name), ctx),
            _body: renderTemplate(String(cfg.body || ""), ctx),
            _link_url: String(cfg.link_url || ""),
            _icon: String(cfg.icon || "Bell"),
            _priority: String(cfg.priority || "normal"),
            _related_entity_type: String(cfg.related_entity_type || ""),
            _related_entity_id: (ctx as Record<string, unknown>).related_id as string | null ?? null,
          });
          ok = true; break;
        }
        case "send_email":
        case "enqueue_job":
        case "noop":
        default:
          ok = true; break; // placeholder for future expansion
      }
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }

    await supabase.from("automation_runs").update({
      status: ok ? "success" : "failed",
      error: err,
      completed_at: new Date().toISOString(),
    }).eq("id", run?.id);

    await supabase.from("automation_rules").update({
      last_triggered_at: new Date().toISOString(),
      trigger_count: undefined, // increment via raw later if needed
    }).eq("id", r.id);

    if (ok) { ranOk++; fired.push(r.id); } else { ranFail++; }
  }

  return new Response(JSON.stringify({ matched: rules?.length ?? 0, ok: ranOk, failed: ranFail, fired }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});