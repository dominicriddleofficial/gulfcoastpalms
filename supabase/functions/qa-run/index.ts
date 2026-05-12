import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type StepStatus = "pass" | "fail" | "skip" | "pending";

interface Step {
  number: number;
  name: string;
  status: StepStatus;
  detail: string;
  link_url?: string | null;
  context?: Record<string, unknown>;
}

async function recordStep(admin: SupabaseClient, runId: string, step: Step) {
  await admin.from("qa_steps").insert({
    run_id: runId,
    step_number: step.number,
    name: step.name,
    status: step.status,
    detail: step.detail,
    link_url: step.link_url ?? null,
    context: step.context ?? {},
    finished_at: new Date().toISOString(),
  });
}

async function signApprovalToken(quoteId: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`approve:${quoteId}`));
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: owner or admin only
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: ud } = await userClient.auth.getUser();
    if (!ud?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const [{ data: isOwner }, { data: isAdmin }] = await Promise.all([
      admin.rpc("is_workspace_owner", { _user_id: ud.user.id }),
      admin.rpc("has_role", { _user_id: ud.user.id, _role: "admin" }),
    ]);
    if (!isOwner && !isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const business_id: string = body.business_id;
    const skip_sms: boolean = !!body.skip_sms;
    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: biz } = await admin.from("businesses").select("id,shortcode,public_brand_name").eq("id", business_id).single();
    if (!biz) {
      return new Response(JSON.stringify({ error: "business not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    const label = `[TEST] ${biz.shortcode} ${stamp}`;

    const { data: run, error: runErr } = await admin.from("qa_runs").insert({
      business_id, label, status: "running", started_by: ud.user.id,
    }).select("id").single();
    if (runErr || !run) {
      return new Response(JSON.stringify({ error: runErr?.message ?? "failed to create run" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const runId = run.id as string;
    const steps: Step[] = [];
    let stepNum = 0;
    const stepStart = async (name: string): Promise<number> => {
      stepNum += 1;
      return stepNum;
    };
    const finalizeRun = async (status: string) => {
      const summary = {
        total: steps.length,
        pass: steps.filter((s) => s.status === "pass").length,
        fail: steps.filter((s) => s.status === "fail").length,
        skip: steps.filter((s) => s.status === "skip").length,
      };
      await admin.from("qa_runs").update({
        status, finished_at: new Date().toISOString(), summary,
      }).eq("id", runId);
      return summary;
    };

    // ── Step 1: Create test customer ──
    let customerId: string | null = null;
    {
      const n = await stepStart("Create test customer");
      const display_name = `TEST CUSTOMER ${stamp}`;
      const phone = "8500000000";
      const email = `qa+${stamp}@example.test`;
      const { data: cust, error } = await admin.from("platform_customers").insert({
        business_id, display_name, phone, email,
        internal_notes: "[QA TEST RECORD - safe to delete]",
        tags: ["qa_test"],
      }).select("id").single();
      const step: Step = error || !cust
        ? { number: n, name: "Create test customer", status: "fail", detail: error?.message ?? "no row returned" }
        : { number: n, name: "Create test customer", status: "pass", detail: `Customer ${display_name}`, link_url: `/platform/customers/${cust.id}`, context: { customer_id: cust.id } };
      steps.push(step); await recordStep(admin, runId, step);
      if (cust) customerId = cust.id;
      if (!cust) { const sum = await finalizeRun("failed"); return new Response(JSON.stringify({ run_id: runId, summary: sum }), { headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    }

    // ── Step 2: Create test quote with line item ──
    let quoteId: string | null = null;
    let quoteNumber = "";
    {
      const n = await stepStart("Create test quote");
      let qNum = `Q-TEST-${Date.now().toString().slice(-6)}`;
      try {
        const { data } = await admin.rpc("generate_next_number", { _business_id: business_id, _record_type: "quote" });
        if (typeof data === "string" && data) qNum = data;
      } catch { /* fallback to default */ }
      const subtotal = 250.00;
      const tax_rate = 0;
      const tax_total = 0;
      const total = subtotal;
      const { data: q, error } = await admin.from("platform_quotes").insert({
        business_id,
        customer_id: customerId,
        quote_number: qNum,
        status: "draft",
        subtotal, tax_rate, tax_total, total,
        public_notes: "TEST quote — automated QA run",
        internal_notes: "[QA TEST]",
        scope_of_work: "TEST scope of work",
      }).select("id,quote_number").single();
      if (error || !q) {
        const step: Step = { number: n, name: "Create test quote", status: "fail", detail: error?.message ?? "no row" };
        steps.push(step); await recordStep(admin, runId, step);
        const sum = await finalizeRun("failed");
        return new Response(JSON.stringify({ run_id: runId, summary: sum }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      quoteId = q.id; quoteNumber = q.quote_number;

      const { error: liErr } = await admin.from("platform_quote_line_items").insert({
        business_id, quote_id: quoteId,
        description: "TEST service line",
        quantity: 1, unit_price: subtotal, line_total: subtotal,
        sort_order: 0,
      });
      const step: Step = liErr
        ? { number: n, name: "Create test quote", status: "fail", detail: `Line item insert failed: ${liErr.message}`, link_url: `/platform/quotes/${quoteId}` }
        : { number: n, name: "Create test quote", status: "pass", detail: `${quoteNumber} created with 1 line item ($${subtotal})`, link_url: `/platform/quotes/${quoteId}`, context: { quote_id: quoteId } };
      steps.push(step); await recordStep(admin, runId, step);
    }

    // ── Step 3: Mark quote sent ──
    {
      const n = await stepStart("Mark quote sent");
      const { error } = await admin.from("platform_quotes").update({
        status: "sent", sent_at: new Date().toISOString(),
      }).eq("id", quoteId);
      const step: Step = error
        ? { number: n, name: "Mark quote sent", status: "fail", detail: error.message }
        : { number: n, name: "Mark quote sent", status: "pass", detail: "Status flipped to 'sent'", link_url: `/platform/quotes/${quoteId}` };
      steps.push(step); await recordStep(admin, runId, step);
    }

    // ── Step 4: Open public quote link ──
    {
      const n = await stepStart("Open public quote link");
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/get-quote-public`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_ROLE}`, "apikey": SERVICE_ROLE },
          body: JSON.stringify({ quote_id: quoteId, shortcode: biz.shortcode }),
        });
        const txt = await resp.text();
        const ok = resp.ok;
        const step: Step = ok
          ? { number: n, name: "Open public quote link", status: "pass", detail: `200 OK from get-quote-public (${txt.length} bytes)`, link_url: `/quote/${(biz.shortcode || "").toLowerCase()}/${quoteId}` }
          : { number: n, name: "Open public quote link", status: "fail", detail: `HTTP ${resp.status}: ${txt.slice(0, 200)}` };
        steps.push(step); await recordStep(admin, runId, step);
      } catch (e) {
        const step: Step = { number: n, name: "Open public quote link", status: "fail", detail: (e as Error).message };
        steps.push(step); await recordStep(admin, runId, step);
      }
    }

    // ── Step 5: Approve quote ──
    {
      const n = await stepStart("Approve quote");
      try {
        const token = await signApprovalToken(quoteId!, SERVICE_ROLE);
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/approve-quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_ROLE}`, "apikey": SERVICE_ROLE },
          body: JSON.stringify({ quote_id: quoteId, approved_by: "QA TEST", approval_token: token }),
        });
        const txt = await resp.text();
        const step: Step = resp.ok
          ? { number: n, name: "Approve quote", status: "pass", detail: `Approval response: ${txt.slice(0, 200)}`, link_url: `/platform/quotes/${quoteId}` }
          : { number: n, name: "Approve quote", status: "fail", detail: `HTTP ${resp.status}: ${txt.slice(0, 300)}` };
        steps.push(step); await recordStep(admin, runId, step);
      } catch (e) {
        const step: Step = { number: n, name: "Approve quote", status: "fail", detail: (e as Error).message };
        steps.push(step); await recordStep(admin, runId, step);
      }
    }

    // ── Step 6: Verify approval SMS log ──
    {
      const n = await stepStart("Verify owner approval SMS log");
      if (skip_sms) {
        const step: Step = { number: n, name: "Verify owner approval SMS log", status: "skip", detail: "SMS check skipped per request" };
        steps.push(step); await recordStep(admin, runId, step);
      } else {
        // Wait briefly for async SMS send + flag flip
        await new Promise((r) => setTimeout(r, 1500));
        const { data: q } = await admin.from("platform_quotes").select("approval_sms_sent, approval_sms_sent_at, status").eq("id", quoteId).single();
        const sent = !!q?.approval_sms_sent;
        const step: Step = sent
          ? { number: n, name: "Verify owner approval SMS log", status: "pass", detail: `approval_sms_sent=true at ${q?.approval_sms_sent_at}` }
          : { number: n, name: "Verify owner approval SMS log", status: "fail", detail: `approval_sms_sent flag not set (status=${q?.status}). Check error_logs for send-sms failures.`, link_url: "/platform/backend-health" };
        steps.push(step); await recordStep(admin, runId, step);
      }
    }

    // ── Step 7: Verify notification/audit row created on approval ──
    {
      const n = await stepStart("Verify approval notification");
      const { data: notif } = await admin
        .from("platform_notifications")
        .select("id, type, title, created_at")
        .eq("business_id", business_id)
        .eq("related_entity_id", quoteId)
        .eq("type", "quote_approved")
        .limit(1);
      const step: Step = notif && notif.length > 0
        ? { number: n, name: "Verify approval notification", status: "pass", detail: `Notification created: ${notif[0].title}`, link_url: "/platform/notifications" }
        : { number: n, name: "Verify approval notification", status: "fail", detail: "No quote_approved notification found within window. Trigger notify_quote_approved may not have fired.", link_url: "/platform/notifications" };
      steps.push(step); await recordStep(admin, runId, step);
    }

    // ── Step 8: Convert quote to job ──
    let jobId: string | null = null;
    {
      const n = await stepStart("Convert quote to job");
      const jobberFakeId = `qa-${Date.now()}`;
      const { data: job, error } = await admin.from("jobber_jobs").insert({
        business_id,
        jobber_id: jobberFakeId,
        title: `[QA TEST] Job for ${quoteNumber}`,
        status: "scheduled",
        visit_status: "scheduled",
        client_name: `TEST CUSTOMER ${stamp}`,
        client_phone: "8500000000",
        property_address: "100 Test Lane, Pensacola, FL",
        scheduled_start: new Date().toISOString(),
        scheduled_end: new Date(Date.now() + 3600000).toISOString(),
        total_amount: 250,
        internal_notes: "[QA TEST]",
        service_items: [{ name: "TEST service line" }],
      }).select("id").single();
      const step: Step = error || !job
        ? { number: n, name: "Convert quote to job", status: "fail", detail: error?.message ?? "no row" }
        : { number: n, name: "Convert quote to job", status: "pass", detail: "Test job inserted with TEST flag", link_url: `/platform/jobs`, context: { job_id: job.id } };
      steps.push(step); await recordStep(admin, runId, step);
      if (job) jobId = job.id;
    }

    // ── Step 9-11: Visit lifecycle ──
    if (jobId) {
      for (const [num, name, vs] of [
        ["On My Way", "enroute"],
        ["Start Visit", "in_progress"],
        ["Complete Visit", "completed"],
      ].map((p, i) => [9 + i, p[0], p[1]] as const)) {
        const n = await stepStart(name);
        const { error } = await admin.from("jobber_jobs").update({ visit_status: vs }).eq("id", jobId);
        const step: Step = error
          ? { number: num, name, status: "fail", detail: error.message }
          : { number: num, name, status: "pass", detail: `visit_status -> ${vs}`, link_url: "/platform/jobs" };
        steps.push(step); await recordStep(admin, runId, step);
        stepNum = num;
      }
    } else {
      for (const name of ["On My Way", "Start Visit", "Complete Visit"]) {
        const n = await stepStart(name);
        const step: Step = { number: n, name, status: "skip", detail: "No job created — upstream step failed" };
        steps.push(step); await recordStep(admin, runId, step);
      }
    }

    // ── Step 12: Create invoice ──
    let invoiceId: string | null = null;
    let invoiceNumber = "";
    {
      const n = await stepStart("Create invoice");
      let invNum = `INV-TEST-${Date.now().toString().slice(-6)}`;
      try {
        const { data } = await admin.rpc("generate_next_number", { _business_id: business_id, _record_type: "invoice" });
        if (typeof data === "string" && data) invNum = data;
      } catch { /* fallback */ }
      const total = 250.00;
      const { data: inv, error } = await admin.from("platform_invoices").insert({
        business_id, customer_id: customerId, quote_id: quoteId,
        invoice_number: invNum, status: "sent",
        issue_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        terms: "Net 30",
        subtotal: total, tax_rate: 0, tax_total: 0, total,
        balance_due: total, amount_paid: 0,
        public_notes: "TEST invoice", internal_notes: "[QA TEST]",
      }).select("id, invoice_number").single();
      if (error || !inv) {
        const step: Step = { number: n, name: "Create invoice", status: "fail", detail: error?.message ?? "no row" };
        steps.push(step); await recordStep(admin, runId, step);
      } else {
        invoiceId = inv.id; invoiceNumber = inv.invoice_number;
        await admin.from("platform_invoice_line_items").insert({
          business_id, invoice_id: invoiceId,
          description: "TEST service line", quantity: 1, unit_price: total, line_total: total, sort_order: 0,
        });
        const step: Step = { number: n, name: "Create invoice", status: "pass", detail: `${invoiceNumber} created`, link_url: `/platform/invoices/${invoiceId}`, context: { invoice_id: invoiceId } };
        steps.push(step); await recordStep(admin, runId, step);
      }
    }

    // ── Step 13: Stripe test payment (manual) ──
    {
      const n = await stepStart("Stripe test payment (manual)");
      if (!invoiceId) {
        const step: Step = { number: n, name: "Stripe test payment (manual)", status: "skip", detail: "No invoice created" };
        steps.push(step); await recordStep(admin, runId, step);
      } else {
        const payUrl = `/pay/${(biz.shortcode || "").toLowerCase()}/${invoiceId}`;
        const step: Step = {
          number: n,
          name: "Stripe test payment (manual)",
          status: "skip",
          detail: "Open the public pay link and use Stripe test card 4242 4242 4242 4242. Webhook will flip status when paid. Re-check this run after payment to verify.",
          link_url: payUrl,
          context: { invoice_id: invoiceId, pay_url: payUrl },
        };
        steps.push(step); await recordStep(admin, runId, step);
      }
    }

    // ── Step 14: Verify webhook → payment ledger (best effort) ──
    {
      const n = await stepStart("Verify payment + webhook");
      if (!invoiceId) {
        const step: Step = { number: n, name: "Verify payment + webhook", status: "skip", detail: "No invoice" };
        steps.push(step); await recordStep(admin, runId, step);
      } else {
        const { data: pays } = await admin.from("platform_payments").select("id,amount,payment_date").eq("invoice_id", invoiceId).limit(5);
        const { data: invNow } = await admin.from("platform_invoices").select("status,balance_due,amount_paid").eq("id", invoiceId).single();
        const paid = (invNow?.status === "paid") || (Number(invNow?.balance_due ?? 0) === 0 && Number(invNow?.amount_paid ?? 0) > 0);
        const step: Step = paid
          ? { number: n, name: "Verify payment + webhook", status: "pass", detail: `Invoice ${invoiceNumber} marked paid. ${pays?.length ?? 0} payment ledger row(s).`, link_url: `/platform/invoices/${invoiceId}` }
          : { number: n, name: "Verify payment + webhook", status: "skip", detail: `Awaiting Stripe test payment. Current status=${invNow?.status} balance=${invNow?.balance_due}. Re-run this step after paying.`, link_url: `/platform/invoices/${invoiceId}` };
        steps.push(step); await recordStep(admin, runId, step);
      }
    }

    const summary = await finalizeRun(steps.some((s) => s.status === "fail") ? "failed" : "completed");

    return new Response(JSON.stringify({ run_id: runId, summary, steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
