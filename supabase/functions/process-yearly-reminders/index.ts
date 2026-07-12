import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function chicagoDateKey(d: Date): string {
  // en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function friendly(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const todayCT = chicagoDateKey(new Date());
    const targets: Array<{ kind: "30d" | "14d"; date: string }> = [
      { kind: "30d", date: addDaysToKey(todayCT, 30) },
      { kind: "14d", date: addDaysToKey(todayCT, 14) },
    ];

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const t of targets) {
      const { data: jobs, error } = await supabase
        .from("platform_jobs")
        .select("id, customer_id, scheduled_start, platform_customers!inner(display_name, phone)")
        .eq("origin", "yearly_auto")
        .eq("status", "scheduled")
        .eq("scheduled_start", t.date)
        .is("deleted_at", null);

      if (error) {
        console.error(`[yearly-reminders] fetch ${t.kind} error:`, error.message);
        continue;
      }

      for (const j of jobs ?? []) {
        const cust = (j as { platform_customers: { display_name: string | null; phone: string | null } }).platform_customers;
        const phone = (cust?.phone ?? "").replace(/\D/g, "");
        if (!phone || phone.length < 10) { skipped++; continue; }

        // Idempotency
        const { data: existing } = await supabase
          .from("yearly_reminder_log")
          .select("id")
          .eq("job_id", j.id)
          .eq("kind", t.kind)
          .maybeSingle();
        if (existing) { skipped++; continue; }

        const first = (cust?.display_name ?? "there").split(" ")[0];
        const when = friendly(t.date);
        const message = t.kind === "30d"
          ? `Hi ${first}, it's Gulf Coast Palms 🌴 Quick heads up — you're on our schedule for your yearly palm trimming around ${when}. We'll text again closer to the date. Need to change it? Call or text (850) 910-1290.`
          : `Hi ${first}, Gulf Coast Palms here 🌴 Your yearly palm trimming is coming up around ${when}. If that still works, you're all set! To reschedule: (850) 910-1290.`;

        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ to: phone, message }),
          });
          const ok = res.ok;
          const bodyText = await res.text();
          await supabase.from("yearly_reminder_log").insert({
            job_id: j.id,
            kind: t.kind,
            phone,
            error: ok ? null : bodyText.slice(0, 500),
          });
          if (ok) sent++; else failed++;
        } catch (e) {
          failed++;
          console.error(`[yearly-reminders] send failed for job ${j.id}:`, (e as Error).message);
          try {
            await supabase.from("yearly_reminder_log").insert({
              job_id: j.id, kind: t.kind, phone, error: (e as Error).message.slice(0, 500),
            });
          } catch { /* ignore */ }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, skipped, failed }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[yearly-reminders] fatal:", (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});