import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function isOwnerOrAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: ownerFlag } = await supabase.rpc("is_workspace_owner", { _user_id: userId });
  if (ownerFlag === true) return true;
  const { data: adminFlag } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return adminFlag === true;
}

async function audit(
  supabase: SupabaseClient,
  userId: string,
  businessId: string | null,
  eventName: string,
  entityType: string,
  entityId: string,
  ctx: Record<string, unknown>,
) {
  await supabase.from("audit_logs").insert({
    business_id: businessId,
    user_id: userId,
    event_name: eventName,
    entity_type: entityType,
    entity_id: entityId,
    action_type: "reconciliation_repair",
    context_json: ctx,
  });
  if (businessId) {
    await supabase.from("timeline_events").insert({
      business_id: businessId,
      related_entity_type: entityType,
      related_entity_id: entityId,
      event_type: eventName,
      event_summary: `Reconciliation repair: ${eventName}`,
      event_payload_json: ctx,
      actor_user_id: userId,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    const allowed = await isOwnerOrAdmin(supabase, userData.user.id);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action: string = body.action;
    const finding_key: string = body.finding_key;
    const category: string = body.category || "";
    const severity: string = body.severity || "low";
    const business_id: string | null = body.business_id ?? null;
    const entity_type: string = body.entity_type || "";
    const entity_id: string = body.entity_id || "";
    const payload: Record<string, unknown> = body.payload || {};
    const note: string = (body.note ?? "").toString().slice(0, 500);

    if (!action || !finding_key) {
      return new Response(JSON.stringify({ error: "action and finding_key required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: Record<string, unknown> = {};

    switch (action) {
      case "mark_resolved": {
        await supabase.from("reconciliation_dismissals").upsert(
          {
            finding_key,
            business_id,
            category,
            severity,
            note,
            dismissed_by_user_id: userData.user.id,
          },
          { onConflict: "finding_key" },
        );
        result = { dismissed: true };
        break;
      }
      case "retry_approval_sms": {
        const quote_id = (payload.quote_id as string) || entity_id;
        const r = await supabase.functions.invoke("resend-approval-sms", {
          body: { quote_id },
          headers: { Authorization: authHeader },
        });
        if (r.error) throw new Error(r.error.message || "SMS retry failed");
        result = { invoked: "resend-approval-sms", quote_id };
        break;
      }
      case "retry_invoice_email": {
        const invoice_id = (payload.invoice_id as string) || entity_id;
        const r = await supabase.functions.invoke("send-invoice-email", {
          body: { invoice_id },
          headers: { Authorization: authHeader },
        });
        if (r.error) throw new Error(r.error.message || "Invoice email retry failed");
        result = { invoked: "send-invoice-email", invoice_id };
        break;
      }
      case "relink_quote_job": {
        const quote_id = (payload.quote_id as string) || entity_id;
        const { data: q } = await supabase.from("platform_quotes")
          .select("id, business_id, customer_id, total, created_at")
          .eq("id", quote_id).maybeSingle();
        if (!q) throw new Error("Quote not found");
        // Find a job on same customer/business with no quote_id within 30 days
        const since = new Date(new Date(q.created_at).getTime() - 7 * 86400000).toISOString();
        const until = new Date(new Date(q.created_at).getTime() + 60 * 86400000).toISOString();
        const { data: candidates } = await supabase.from("platform_jobs")
          .select("id, job_number, customer_id, quote_id, total, created_at")
          .eq("business_id", q.business_id)
          .eq("customer_id", q.customer_id)
          .is("quote_id", null)
          .gte("created_at", since)
          .lte("created_at", until)
          .limit(5);
        if (!candidates || candidates.length === 0) {
          result = { relinked: false, reason: "no candidate job found" };
          break;
        }
        if (candidates.length > 1) {
          result = { relinked: false, reason: "multiple candidates", candidates };
          break;
        }
        const job = candidates[0];
        await supabase.from("platform_jobs").update({ quote_id: q.id }).eq("id", job.id);
        result = { relinked: true, job_id: job.id, job_number: job.job_number };
        break;
      }
      case "relink_invoice_job": {
        const job_id = (payload.job_id as string) || entity_id;
        const { data: j } = await supabase.from("platform_jobs")
          .select("id, business_id, customer_id, total, completed_at, created_at")
          .eq("id", job_id).maybeSingle();
        if (!j) throw new Error("Job not found");
        const { data: candidates } = await supabase.from("platform_invoices")
          .select("id, invoice_number, job_id, customer_id")
          .eq("business_id", j.business_id)
          .eq("customer_id", j.customer_id)
          .is("job_id", null)
          .limit(5);
        if (!candidates || candidates.length === 0) {
          result = { relinked: false, reason: "no candidate invoice found" };
          break;
        }
        if (candidates.length > 1) {
          result = { relinked: false, reason: "multiple candidates", candidates };
          break;
        }
        const inv = candidates[0];
        await supabase.from("platform_invoices").update({ job_id: j.id }).eq("id", inv.id);
        result = { relinked: true, invoice_id: inv.id, invoice_number: inv.invoice_number };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    await audit(
      supabase,
      userData.user.id,
      business_id,
      `reconciliation.${action}`,
      entity_type || "reconciliation",
      entity_id || finding_key,
      { finding_key, category, severity, payload, result, note },
    );

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: m }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});