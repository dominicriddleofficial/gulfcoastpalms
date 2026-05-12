import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Severity = "critical" | "high" | "medium" | "low";
type Category =
  | "quote_approved_no_timestamp"
  | "quote_approved_no_timeline"
  | "quote_approved_sms_failed"
  | "quote_converted_no_job"
  | "job_from_quote_missing_ref"
  | "job_completed_no_timestamp"
  | "job_completed_no_invoice"
  | "invoice_paid_no_payment"
  | "payment_no_invoice"
  | "stripe_webhook_no_payment"
  | "invoice_overdue_no_reminder"
  | "duplicate_customer"
  | "job_missing_customer"
  | "job_missing_address"
  | "job_missing_business"
  | "sms_failed"
  | "email_failed";

interface RepairAction {
  type:
    | "retry_approval_sms"
    | "retry_invoice_email"
    | "relink_quote_job"
    | "relink_invoice_job"
    | "mark_resolved";
  label: string;
  payload: Record<string, unknown>;
}

interface Finding {
  finding_key: string;
  category: Category;
  severity: Severity;
  business_id: string | null;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  message: string;
  detected_at: string;
  context: Record<string, unknown>;
  actions: RepairAction[];
}

function key(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join("|");
}

async function isOwnerOrAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: ownerFlag } = await supabase.rpc("is_workspace_owner", { _user_id: userId });
  if (ownerFlag === true) return true;
  const { data: adminFlag } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return adminFlag === true;
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

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const businessId: string | null = body.business_id ?? null;
    const fromIso: string | null = body.from ?? null;
    const toIso: string | null = body.to ?? null;
    const includeDismissed: boolean = body.include_dismissed === true;

    const findings: Finding[] = [];
    const now = new Date().toISOString();

    const applyBiz = <T extends { eq: (col: string, val: string) => T; gte: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(q: T): T => {
      let r = q;
      if (businessId) r = r.eq("business_id", businessId);
      if (fromIso) r = r.gte("created_at", fromIso);
      if (toIso) r = r.lte("created_at", toIso);
      return r;
    };

    // 1. Approved quotes with no approval timestamp
    {
      let q = supabase.from("platform_quotes")
        .select("id, business_id, quote_number, status, approved_at, approval_sms_sent, approval_sms_sent_at, customer_id, created_at")
        .in("status", ["approved", "won", "accepted"])
        .is("approved_at", null);
      q = applyBiz(q as never) as typeof q;
      const { data } = await q.limit(500);
      for (const r of data || []) {
        findings.push({
          finding_key: key(["quote_approved_no_timestamp", r.id]),
          category: "quote_approved_no_timestamp",
          severity: "medium",
          business_id: r.business_id,
          entity_type: "quote", entity_id: r.id,
          entity_label: r.quote_number,
          message: `Quote ${r.quote_number} is ${r.status} but has no approved_at timestamp`,
          detected_at: now,
          context: { status: r.status },
          actions: [{ type: "mark_resolved", label: "Mark resolved", payload: {} }],
        });
      }
    }

    // 2 & 3. Approved quotes with no timeline event AND/OR SMS failed
    {
      let q = supabase.from("platform_quotes")
        .select("id, business_id, quote_number, status, approved_at, approval_sms_sent, approval_sms_sent_at, customer_id")
        .in("status", ["approved", "won", "accepted"]);
      if (businessId) q = q.eq("business_id", businessId);
      if (fromIso) q = q.gte("approved_at", fromIso);
      if (toIso) q = q.lte("approved_at", toIso);
      const { data: quotes } = await q.limit(500);
      for (const r of quotes || []) {
        // timeline check
        const { count: tlCount } = await supabase
          .from("timeline_events")
          .select("id", { count: "exact", head: true })
          .eq("related_entity_type", "quote")
          .eq("related_entity_id", r.id)
          .in("event_type", ["quote_approved", "approved", "quote_accepted"]);
        if ((tlCount ?? 0) === 0) {
          findings.push({
            finding_key: key(["quote_approved_no_timeline", r.id]),
            category: "quote_approved_no_timeline",
            severity: "low",
            business_id: r.business_id,
            entity_type: "quote", entity_id: r.id,
            entity_label: r.quote_number,
            message: `Approved quote ${r.quote_number} has no timeline/audit event`,
            detected_at: now,
            context: {},
            actions: [{ type: "mark_resolved", label: "Mark resolved", payload: {} }],
          });
        }
        // SMS check
        if (!r.approval_sms_sent) {
          findings.push({
            finding_key: key(["quote_approved_sms_failed", r.id]),
            category: "quote_approved_sms_failed",
            severity: "high",
            business_id: r.business_id,
            entity_type: "quote", entity_id: r.id,
            entity_label: r.quote_number,
            message: `Approval SMS not sent for quote ${r.quote_number}`,
            detected_at: now,
            context: { approved_at: r.approved_at },
            actions: [
              { type: "retry_approval_sms", label: "Retry approval SMS", payload: { quote_id: r.id } },
              { type: "mark_resolved", label: "Mark resolved", payload: {} },
            ],
          });
        }
      }
    }

    // 4. Quotes converted but no linked job
    {
      let q = supabase.from("platform_quotes")
        .select("id, business_id, quote_number, status, customer_id")
        .in("status", ["converted", "won", "accepted", "approved"]);
      if (businessId) q = q.eq("business_id", businessId);
      const { data: quotes } = await q.limit(500);
      for (const r of quotes || []) {
        const { count } = await supabase
          .from("platform_jobs")
          .select("id", { count: "exact", head: true })
          .eq("quote_id", r.id);
        if ((count ?? 0) === 0) {
          findings.push({
            finding_key: key(["quote_converted_no_job", r.id]),
            category: "quote_converted_no_job",
            severity: "high",
            business_id: r.business_id,
            entity_type: "quote", entity_id: r.id,
            entity_label: r.quote_number,
            message: `Quote ${r.quote_number} (${r.status}) has no linked job`,
            detected_at: now,
            context: { status: r.status, customer_id: r.customer_id },
            actions: [
              { type: "relink_quote_job", label: "Auto-link job", payload: { quote_id: r.id } },
              { type: "mark_resolved", label: "Mark resolved", payload: {} },
            ],
          });
        }
      }
    }

    // 5. Jobs missing business / customer / address
    {
      let q = supabase.from("platform_jobs")
        .select("id, business_id, job_number, customer_id, property_id, status, completed_at, quote_id, created_at, source")
        .is("deleted_at", null);
      if (businessId) q = q.eq("business_id", businessId);
      if (fromIso) q = q.gte("created_at", fromIso);
      if (toIso) q = q.lte("created_at", toIso);
      const { data: jobs } = await q.limit(1000);
      for (const j of jobs || []) {
        if (!j.business_id) {
          findings.push({
            finding_key: key(["job_missing_business", j.id]),
            category: "job_missing_business", severity: "critical",
            business_id: null, entity_type: "job", entity_id: j.id,
            entity_label: j.job_number || j.id,
            message: `Job ${j.job_number} has no business_id`,
            detected_at: now, context: {},
            actions: [{ type: "mark_resolved", label: "Mark resolved", payload: {} }],
          });
        }
        if (!j.customer_id) {
          findings.push({
            finding_key: key(["job_missing_customer", j.id]),
            category: "job_missing_customer", severity: "high",
            business_id: j.business_id, entity_type: "job", entity_id: j.id,
            entity_label: j.job_number || j.id,
            message: `Job ${j.job_number} has no customer`,
            detected_at: now, context: {},
            actions: [{ type: "mark_resolved", label: "Mark resolved", payload: {} }],
          });
        }
        if (!j.property_id) {
          findings.push({
            finding_key: key(["job_missing_address", j.id]),
            category: "job_missing_address", severity: "medium",
            business_id: j.business_id, entity_type: "job", entity_id: j.id,
            entity_label: j.job_number || j.id,
            message: `Job ${j.job_number} has no address/property`,
            detected_at: now, context: {},
            actions: [{ type: "mark_resolved", label: "Mark resolved", payload: {} }],
          });
        }
        // 6. Jobs completed but no completed_at
        if (j.status === "completed" && !j.completed_at) {
          findings.push({
            finding_key: key(["job_completed_no_timestamp", j.id]),
            category: "job_completed_no_timestamp", severity: "medium",
            business_id: j.business_id, entity_type: "job", entity_id: j.id,
            entity_label: j.job_number || j.id,
            message: `Job ${j.job_number} marked completed but missing completed_at`,
            detected_at: now, context: {},
            actions: [{ type: "mark_resolved", label: "Mark resolved", payload: {} }],
          });
        }
        // 7. Job from quote missing ref — covered by source='converted_from_quote' but no quote_id; we approximate: if title/notes mention quote but no quote_id, hard to detect. Skip unless source flag exists.
        // 8. Jobs completed but no invoice
        if (j.status === "completed") {
          const { count: invCount } = await supabase
            .from("platform_invoices")
            .select("id", { count: "exact", head: true })
            .eq("job_id", j.id);
          if ((invCount ?? 0) === 0) {
            findings.push({
              finding_key: key(["job_completed_no_invoice", j.id]),
              category: "job_completed_no_invoice", severity: "high",
              business_id: j.business_id, entity_type: "job", entity_id: j.id,
              entity_label: j.job_number || j.id,
              message: `Completed job ${j.job_number} has no invoice`,
              detected_at: now, context: {},
              actions: [
                { type: "relink_invoice_job", label: "Auto-link invoice", payload: { job_id: j.id } },
                { type: "mark_resolved", label: "Mark resolved", payload: {} },
              ],
            });
          }
        }
      }
    }

    // 9. Invoices marked paid but no payment ledger row
    {
      let q = supabase.from("platform_invoices")
        .select("id, business_id, invoice_number, status, total, paid_at, due_date, overdue_notified_at, job_id, customer_id")
        .eq("status", "paid");
      if (businessId) q = q.eq("business_id", businessId);
      const { data: invs } = await q.limit(1000);
      for (const inv of invs || []) {
        const { count } = await supabase
          .from("platform_payments")
          .select("id", { count: "exact", head: true })
          .eq("invoice_id", inv.id);
        if ((count ?? 0) === 0) {
          findings.push({
            finding_key: key(["invoice_paid_no_payment", inv.id]),
            category: "invoice_paid_no_payment", severity: "critical",
            business_id: inv.business_id, entity_type: "invoice", entity_id: inv.id,
            entity_label: inv.invoice_number,
            message: `Invoice ${inv.invoice_number} marked paid but no payment ledger row`,
            detected_at: now, context: { total: inv.total },
            actions: [{ type: "mark_resolved", label: "Mark resolved", payload: {} }],
          });
        }
      }
    }

    // 10. Payment ledger rows without invoice
    {
      let q = supabase.from("platform_payments")
        .select("id, business_id, payment_number, invoice_id, amount, created_at")
        .is("invoice_id", null);
      if (businessId) q = q.eq("business_id", businessId);
      const { data: pays } = await q.limit(500);
      for (const p of pays || []) {
        findings.push({
          finding_key: key(["payment_no_invoice", p.id]),
          category: "payment_no_invoice", severity: "high",
          business_id: p.business_id, entity_type: "payment", entity_id: p.id,
          entity_label: p.payment_number,
          message: `Payment ${p.payment_number} ($${p.amount}) has no invoice link`,
          detected_at: now, context: { amount: p.amount },
          actions: [{ type: "mark_resolved", label: "Mark resolved", payload: {} }],
        });
      }
    }

    // 11. Stripe webhook payment without platform payment row
    {
      let q = supabase.from("payment_webhook_events")
        .select("id, business_id, event_id, event_type, processed, payload_json, created_at")
        .eq("processed", true)
        .in("event_type", ["payment_intent.succeeded", "checkout.session.completed", "charge.succeeded"]);
      if (businessId) q = q.eq("business_id", businessId);
      if (fromIso) q = q.gte("created_at", fromIso);
      if (toIso) q = q.lte("created_at", toIso);
      const { data: events } = await q.order("created_at", { ascending: false }).limit(200);
      for (const e of events || []) {
        const payload = (e.payload_json || {}) as Record<string, unknown>;
        const obj = ((payload.data as Record<string, unknown>)?.object || {}) as Record<string, unknown>;
        const piId = (obj.payment_intent as string) || (obj.id as string) || null;
        if (!piId) continue;
        const { count } = await supabase
          .from("platform_payments")
          .select("id", { count: "exact", head: true })
          .eq("reference_number", piId);
        if ((count ?? 0) === 0) {
          findings.push({
            finding_key: key(["stripe_webhook_no_payment", e.event_id]),
            category: "stripe_webhook_no_payment", severity: "critical",
            business_id: e.business_id, entity_type: "webhook_event", entity_id: e.id,
            entity_label: e.event_id,
            message: `Stripe ${e.event_type} processed but no platform payment row (ref ${piId})`,
            detected_at: now, context: { piId, event_type: e.event_type },
            actions: [{ type: "mark_resolved", label: "Mark resolved", payload: {} }],
          });
        }
      }
    }

    // 12. Invoices overdue but no reminder
    {
      const today = new Date().toISOString().slice(0, 10);
      let q = supabase.from("platform_invoices")
        .select("id, business_id, invoice_number, status, due_date, overdue_notified_at, balance_due, customer_id")
        .lt("due_date", today)
        .gt("balance_due", 0)
        .not("status", "in", "(paid,void,draft)")
        .is("overdue_notified_at", null);
      if (businessId) q = q.eq("business_id", businessId);
      const { data: invs } = await q.limit(500);
      for (const inv of invs || []) {
        findings.push({
          finding_key: key(["invoice_overdue_no_reminder", inv.id]),
          category: "invoice_overdue_no_reminder", severity: "medium",
          business_id: inv.business_id, entity_type: "invoice", entity_id: inv.id,
          entity_label: inv.invoice_number,
          message: `Invoice ${inv.invoice_number} overdue (${inv.due_date}), no reminder sent`,
          detected_at: now, context: { due_date: inv.due_date, balance_due: inv.balance_due },
          actions: [
            { type: "retry_invoice_email", label: "Send reminder email", payload: { invoice_id: inv.id } },
            { type: "mark_resolved", label: "Mark resolved", payload: {} },
          ],
        });
      }
    }

    // 13. Duplicate customers (phone or email)
    {
      const { data: dupes } = await supabase.rpc("exec_dup_customers" as never, {} as never).then(() => ({ data: null })).catch(() => ({ data: null }));
      // Fallback: query directly
      let q = supabase.from("platform_customers").select("id, business_id, display_name, phone, email, created_at");
      if (businessId) q = q.eq("business_id", businessId);
      const { data: customers } = await q.limit(5000);
      const byPhone = new Map<string, typeof customers>();
      const byEmail = new Map<string, typeof customers>();
      for (const c of customers || []) {
        const ph = c.phone?.replace(/\D/g, "");
        const em = c.email?.toLowerCase().trim();
        if (ph && ph.length >= 10) {
          const k = `${c.business_id}|${ph}`;
          if (!byPhone.has(k)) byPhone.set(k, []);
          byPhone.get(k)!.push(c);
        }
        if (em) {
          const k = `${c.business_id}|${em}`;
          if (!byEmail.has(k)) byEmail.set(k, []);
          byEmail.get(k)!.push(c);
        }
      }
      const seen = new Set<string>();
      const pushDup = (group: NonNullable<typeof customers>, kind: string) => {
        if (group.length < 2) return;
        const ids = group.map((g) => g.id).sort().join(",");
        if (seen.has(ids)) return;
        seen.add(ids);
        findings.push({
          finding_key: key(["duplicate_customer", kind, ids]),
          category: "duplicate_customer", severity: "low",
          business_id: group[0].business_id, entity_type: "customer", entity_id: group[0].id,
          entity_label: group.map((g) => g.display_name).join(" / "),
          message: `${group.length} customers share same ${kind}`,
          detected_at: now,
          context: { kind, ids: group.map((g) => g.id) },
          actions: [{ type: "mark_resolved", label: "Mark resolved", payload: {} }],
        });
      };
      for (const g of byPhone.values()) pushDup(g!, "phone");
      for (const g of byEmail.values()) pushDup(g!, "email");
      void dupes;
    }

    // 14. SMS failures
    {
      let q = supabase.from("sms_queue")
        .select("id, business_id, phone, reason, status, last_error, created_at, related_type, related_id")
        .in("status", ["failed", "dlq"]);
      if (businessId) q = q.eq("business_id", businessId);
      if (fromIso) q = q.gte("created_at", fromIso);
      if (toIso) q = q.lte("created_at", toIso);
      const { data } = await q.order("created_at", { ascending: false }).limit(200);
      for (const m of data || []) {
        findings.push({
          finding_key: key(["sms_failed", m.id]),
          category: "sms_failed", severity: "high",
          business_id: m.business_id, entity_type: "sms", entity_id: m.id,
          entity_label: `${m.reason} → ${m.phone}`,
          message: `SMS failed: ${m.last_error || "(no error)"}`,
          detected_at: now,
          context: { related_type: m.related_type, related_id: m.related_id },
          actions: [{ type: "mark_resolved", label: "Mark resolved", payload: {} }],
        });
      }
    }

    // 15. Email failures
    {
      let q = supabase.from("email_send_log")
        .select("id, recipient_email, template_name, status, error_message, created_at")
        .in("status", ["dlq", "failed", "bounced"]);
      if (fromIso) q = q.gte("created_at", fromIso);
      if (toIso) q = q.lte("created_at", toIso);
      const { data } = await q.order("created_at", { ascending: false }).limit(200);
      for (const m of data || []) {
        findings.push({
          finding_key: key(["email_failed", m.id]),
          category: "email_failed", severity: "high",
          business_id: null, entity_type: "email", entity_id: m.id,
          entity_label: `${m.template_name} → ${m.recipient_email}`,
          message: `Email failed: ${m.error_message || m.status}`,
          detected_at: now, context: { status: m.status },
          actions: [{ type: "mark_resolved", label: "Mark resolved", payload: {} }],
        });
      }
    }

    // Apply dismissals
    const { data: dismissals } = await supabase
      .from("reconciliation_dismissals")
      .select("finding_key, note, created_at, dismissed_by_user_id");
    const dismissedSet = new Set((dismissals || []).map((d) => d.finding_key));
    const filtered = includeDismissed
      ? findings
      : findings.filter((f) => !dismissedSet.has(f.finding_key));

    return new Response(
      JSON.stringify({
        generated_at: now,
        total: filtered.length,
        dismissed_count: dismissedSet.size,
        findings: filtered,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: m }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});