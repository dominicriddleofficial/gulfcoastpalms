import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 25;

function normalizePhone(p: string): string {
  return p.replace(/\D/g, "");
}

function inQuietHours(now: Date, startHour: number, endHour: number): boolean {
  // Quiet hours wrap midnight if start > end (e.g. 21..8)
  const h = now.getUTCHours(); // best-effort; real per-business tz handled later
  if (startHour === endHour) return false;
  if (startHour < endHour) return h >= startHour && h < endHour;
  return h >= startHour || h < endHour;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: due, error } = await supabase
    .from("sms_queue")
    .select("id, business_id, customer_id, phone, message_body, reason, related_type, related_id, attempts")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("[process-sms-queue] fetch failed:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  if (!due || due.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let sent = 0, skipped = 0, failed = 0;

  for (const row of due) {
    const phone = normalizePhone(row.phone);
    if (phone.length < 10) {
      await supabase.from("sms_queue").update({
        status: "failed", last_error: "Invalid phone", attempts: (row.attempts || 0) + 1,
      }).eq("id", row.id);
      failed++; continue;
    }

    // Opt-out check (per-business OR global)
    const { data: optOut } = await supabase
      .from("sms_opt_outs").select("id")
      .or(`business_id.is.null,business_id.eq.${row.business_id}`)
      .eq("phone", phone).limit(1).maybeSingle();
    if (optOut) {
      await supabase.from("sms_queue").update({
        status: "skipped_opt_out", last_error: "Recipient opted out",
      }).eq("id", row.id);
      skipped++; continue;
    }

    // Quiet hours (best-effort; UTC compare). Skip non-urgent reasons; defer rather than send.
    const { data: qh } = await supabase
      .from("sms_quiet_hours").select("enabled, start_hour, end_hour")
      .eq("business_id", row.business_id).maybeSingle();
    if (qh?.enabled && inQuietHours(new Date(), qh.start_hour, qh.end_hour)) {
      const defer = new Date();
      defer.setUTCMinutes(defer.getUTCMinutes() + 30);
      await supabase.from("sms_queue").update({ scheduled_for: defer.toISOString() }).eq("id", row.id);
      skipped++; continue;
    }

    // Try mark sending (optimistic)
    await supabase.from("sms_queue").update({ status: "sending", attempts: (row.attempts || 0) + 1 }).eq("id", row.id);

    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({ to: phone, message: row.message_body }),
      });
      const text = await resp.text().catch(() => "");
      if (resp.ok) {
        await supabase.from("sms_queue").update({
          status: "sent", sent_at: new Date().toISOString(), last_error: null,
        }).eq("id", row.id);
        sent++;
      } else {
        const newAttempts = (row.attempts || 0) + 1;
        const finalStatus = newAttempts >= MAX_ATTEMPTS ? "failed" : "pending";
        const nextRun = new Date(Date.now() + Math.min(15 * 60_000, 60_000 * Math.pow(2, newAttempts))).toISOString();
        await supabase.from("sms_queue").update({
          status: finalStatus,
          last_error: `HTTP ${resp.status}: ${text.slice(0, 280)}`,
          scheduled_for: finalStatus === "pending" ? nextRun : new Date().toISOString(),
        }).eq("id", row.id);
        failed++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const newAttempts = (row.attempts || 0) + 1;
      const finalStatus = newAttempts >= MAX_ATTEMPTS ? "failed" : "pending";
      const nextRun = new Date(Date.now() + 60_000 * Math.pow(2, newAttempts)).toISOString();
      await supabase.from("sms_queue").update({
        status: finalStatus,
        last_error: msg.slice(0, 280),
        scheduled_for: finalStatus === "pending" ? nextRun : new Date().toISOString(),
      }).eq("id", row.id);
      failed++;
    }
  }

  console.log(`[process-sms-queue] sent=${sent} skipped=${skipped} failed=${failed}`);
  return new Response(JSON.stringify({ processed: due.length, sent, skipped, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});