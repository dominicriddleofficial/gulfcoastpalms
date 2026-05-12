import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Status = "ok" | "warn" | "fail";

async function record(supabase: ReturnType<typeof createClient>, name: string, status: Status, message: string, details: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { check_name: name, status, message, details };
  if (status === "ok") patch.last_ok_at = now; else patch.last_failure_at = now;
  await supabase.from("system_health_checks").upsert(patch, { onConflict: "check_name" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const checks: Array<{ name: string; run: () => Promise<{ status: Status; message: string; details?: Record<string, unknown> }> }> = [
    { name: "pg_cron", run: async () => {
        const { count, error } = await supabase.from("audit_logs").select("id", { count: "exact", head: true }).limit(1);
        if (error) return { status: "warn", message: "audit_logs read failed" };
        return { status: "ok", message: "DB reachable", details: { audit_rows_sample: count ?? 0 } };
      } },
    { name: "sms_queue", run: async () => {
        const { count: pending } = await supabase.from("sms_queue").select("id", { count: "exact", head: true }).eq("status", "pending");
        const { count: failed } = await supabase.from("sms_queue").select("id", { count: "exact", head: true }).eq("status", "failed");
        const status: Status = (failed ?? 0) > 5 ? "warn" : "ok";
        return { status, message: `pending=${pending ?? 0} failed=${failed ?? 0}` };
      } },
    { name: "review_queue", run: async () => {
        const since = new Date(Date.now() - 24 * 3600_000).toISOString();
        const { count: stale } = await supabase
          .from("review_requests").select("id", { count: "exact", head: true })
          .eq("status", "pending").lte("scheduled_for", since);
        const status: Status = (stale ?? 0) > 0 ? "warn" : "ok";
        return { status, message: `stale_pending=${stale ?? 0}` };
      } },
    { name: "jobber_sync", run: async () => {
        const { data } = await supabase.from("sync_schedules").select("last_run_at, business_id").eq("schedule_type", "jobber").order("last_run_at", { ascending: false }).limit(1).maybeSingle();
        if (!data?.last_run_at) return { status: "warn", message: "no jobber sync recorded" };
        const ageMin = (Date.now() - new Date(data.last_run_at).getTime()) / 60000;
        const status: Status = ageMin > 120 ? "fail" : ageMin > 60 ? "warn" : "ok";
        return { status, message: `last_run=${Math.round(ageMin)}m ago` };
      } },
    { name: "simpletexting", run: async () => {
        const has = !!Deno.env.get("SIMPLETEXTING_API_KEY");
        return has ? { status: "ok", message: "API key set" } : { status: "fail", message: "API key missing" };
      } },
    { name: "stripe_webhook", run: async () => {
        const has = !!Deno.env.get("STRIPE_WEBHOOK_SECRET");
        return has ? { status: "ok", message: "secret configured" } : { status: "warn", message: "no webhook secret" };
      } },
    { name: "resend_email", run: async () => {
        const has = !!Deno.env.get("RESEND_API_KEY");
        return has ? { status: "ok", message: "API key set" } : { status: "warn", message: "no Resend key" };
      } },
    { name: "email_queue", run: async () => {
        try {
          const { data, error } = await supabase.rpc("read_email_batch", { queue_name: "email-queue", batch_size: 1, vt: 0 });
          if (error) return { status: "warn", message: error.message };
          return { status: "ok", message: `peek_ok rows=${(data || []).length}` };
        } catch (e) {
          const m = e instanceof Error ? e.message : String(e);
          return { status: "warn", message: m };
        }
      } },
    { name: "recurring_processor", run: async () => {
        const { data } = await supabase.from("sync_schedules").select("last_run_at").eq("schedule_type", "recurring").order("last_run_at", { ascending: false }).limit(1).maybeSingle();
        if (!data?.last_run_at) return { status: "warn", message: "no recurring run recorded" };
        const ageH = (Date.now() - new Date(data.last_run_at).getTime()) / 3600_000;
        const status: Status = ageH > 36 ? "fail" : ageH > 24 ? "warn" : "ok";
        return { status, message: `last_run=${Math.round(ageH)}h ago` };
      } },
  ];

  const results: Record<string, { status: Status; message: string }> = {};
  for (const c of checks) {
    try {
      const r = await c.run();
      await record(supabase, c.name, r.status, r.message, r.details ?? {});
      results[c.name] = { status: r.status, message: r.message };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await record(supabase, c.name, "fail", msg);
      results[c.name] = { status: "fail", message: msg };
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});