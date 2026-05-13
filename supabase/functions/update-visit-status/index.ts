import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "https://gulfcoastpalmservices.com",
  "https://www.gulfcoastpalmservices.com",
  "https://gulfcoastpalms.lovable.app",
  "https://id-preview--2e9a44f0-ac4c-4ebd-ad4f-dd591d732484.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];
function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

type Action =
  | "on_my_way"
  | "start_visit"
  | "complete_visit"
  | "close_invoice_now"
  | "close_invoice_later"
  | "leave_open"
  | "reopen_visit";

const ACTIONS: ReadonlyArray<Action> = [
  "on_my_way",
  "start_visit",
  "complete_visit",
  "close_invoice_now",
  "close_invoice_later",
  "leave_open",
  "reopen_visit",
];

function statusForAction(action: Action): string | null {
  switch (action) {
    case "on_my_way": return "on_my_way";
    case "start_visit": return "in_progress";
    case "complete_visit":
    case "close_invoice_now":
    case "close_invoice_later":
    case "leave_open": return "complete";
    case "reopen_visit": return "in_progress";
  }
}

const ALLOWED_ROLES = ["owner", "office_manager", "manager", "team_leader", "crew", "operations"];

Deno.serve(async (req) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Your session expired. Please sign in again." }), {
        status: 401, headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const jobberJobId = typeof body?.jobber_job_id === "string" ? body.jobber_job_id : "";
    const action = body?.action as Action;
    const note = typeof body?.note === "string" ? body.note.slice(0, 500) : null;
    const smsSent = body?.sms_sent === true;

    if (!jobberJobId || !ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: "jobber_job_id and valid action required" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    let { data: job, error: jobErr } = await supabase
      .from("jobber_jobs")
      .select("id, business_id, visit_status, status, title, client_name, client_phone, property_address, total_amount, scheduled_start, client_id")
      .eq("id", jobberJobId)
      .maybeSingle();

    // Fallback: lookup as platform_jobs row (new platform-created or quote-converted jobs)
    let isPlatformJob = false;
    let platformJobRow: { id: string; business_id: string; status: string | null; title: string | null; total: number | null; customer_id: string | null } | null = null;
    if (!job) {
      const { data: pj } = await supabase
        .from("platform_jobs")
        .select("id, business_id, status, title, total, customer_id, source_system, source_record_id")
        .eq("id", jobberJobId)
        .maybeSingle();
      if (pj) {
        isPlatformJob = true;
        platformJobRow = pj;
        // If the platform job mirrors a jobber_jobs row, also load that row so existing logic keeps working
        if (pj.source_system === "jobber" && pj.source_record_id) {
          const { data: jj } = await supabase
            .from("jobber_jobs")
            .select("id, business_id, visit_status, status, title, client_name, client_phone, property_address, total_amount, scheduled_start, client_id")
            .eq("id", pj.source_record_id)
            .maybeSingle();
          if (jj) job = jj;
        }
        if (!job) {
          // Synthesize a job-like object for downstream code
          job = {
            id: pj.id,
            business_id: pj.business_id,
            visit_status: mapPlatformStatusToVisit(pj.status),
            status: pj.status,
            title: pj.title,
            client_name: null,
            client_phone: null,
            property_address: null,
            total_amount: pj.total,
            scheduled_start: null,
            client_id: pj.customer_id,
          } as typeof job;
        }
      }
    }
    if (jobErr && !job) {
      return new Response(JSON.stringify({ error: "Unable to load job. Please refresh and try again." }), {
        status: 500, headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found. It may have been deleted or not yet synced." }), {
        status: 404, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // Access check
    const { data: hasAccess } = await supabase.rpc("has_business_access", {
      _user_id: userId, _business_id: job.business_id,
    });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "You do not have access to this business." }), {
        status: 403, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // Role check
    const { data: hasRole } = await supabase.rpc("user_has_any_role", {
      _user_id: userId, _business_id: job.business_id, _roles: ALLOWED_ROLES,
    });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "You do not have permission to update this visit." }), {
        status: 403, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const oldStatus = job.visit_status;
    const newStatus = statusForAction(action);

    // Update job visit_status. If the job came from jobber_jobs (or a platform mirror with a
    // jobber source_record_id), update jobber_jobs. Always also mirror status to platform_jobs
    // when one exists.
    if (newStatus && newStatus !== oldStatus) {
      // Update jobber_jobs row when the id matches a real jobber_jobs row
      const { data: jjExists } = await supabase
        .from("jobber_jobs").select("id").eq("id", job.id).maybeSingle();
      if (jjExists?.id) {
        const { error: upErr } = await supabase
          .from("jobber_jobs").update({ visit_status: newStatus }).eq("id", job.id);
        if (upErr) throw upErr;
      }
      // Mirror to platform_jobs
      const platformStatus = mapVisitStatusToPlatform(newStatus);
      if (platformJobRow?.id) {
        await supabase.from("platform_jobs")
          .update({ status: platformStatus, ...(newStatus === "complete" ? { completed_at: now } : {}) })
          .eq("id", platformJobRow.id);
      } else {
        await supabase.from("platform_jobs")
          .update({ status: platformStatus, ...(newStatus === "complete" ? { completed_at: now } : {}) })
          .eq("source_system", "jobber").eq("source_record_id", job.id);
      }
    }

    // Upsert job_visit_events row with timestamps
    const eventPatch: Record<string, string | null> = {};
    if (action === "on_my_way") {
      eventPatch.on_my_way_at = now;
      if (smsSent) eventPatch.on_my_way_sms_sent_at = now;
    } else if (action === "start_visit") {
      eventPatch.started_at = now;
    } else if (action === "complete_visit" || action === "close_invoice_now" || action === "close_invoice_later" || action === "leave_open") {
      eventPatch.completed_at = now;
    } else if (action === "reopen_visit") {
      eventPatch.completed_at = null;
    }
    if (Object.keys(eventPatch).length) {
      const { data: existing } = await supabase
        .from("job_visit_events").select("id")
        .eq("jobber_job_id", job.id).maybeSingle();
      if (existing?.id) {
        await supabase.from("job_visit_events").update(eventPatch).eq("id", existing.id);
      } else {
        await supabase.from("job_visit_events").insert({
          jobber_job_id: job.id,
          business_id: job.business_id,
          created_by_user_id: userId,
          ...eventPatch,
        });
      }
    }

    // Timeline event
    await supabase.from("timeline_events").insert({
      business_id: job.business_id,
      related_entity_type: "jobber_job",
      related_entity_id: job.id,
      event_type: `visit.${action}`,
      event_summary: summaryFor(action, job.title),
      event_payload_json: { from: oldStatus, to: newStatus, note },
      actor_user_id: userId,
    });

    // Audit log
    await supabase.from("audit_logs").insert({
      business_id: job.business_id,
      user_id: userId,
      event_name: `visit.${action}`,
      entity_type: "jobber_job",
      entity_id: job.id,
      action_type: action === "reopen_visit" ? "update" : "transition",
      old_values_json: { visit_status: oldStatus },
      new_values_json: { visit_status: newStatus, note },
      context_json: { source: "update-visit-status" },
    });

    // Optional invoice creation
    let invoiceId: string | null = null;
    let invoiceNumber: string | null = null;
    if (action === "close_invoice_now") {
      try {
        const { data: numRes } = await supabase.rpc("generate_next_number", {
          _business_id: job.business_id, _record_type: "invoice",
        });
        invoiceNumber = (numRes as string) || null;

        // Try to map jobber_jobs.client_id → platform_customers (via shared id, else null)
        let customerId: string | null = null;
        if (job.client_id) {
          const { data: c } = await supabase
            .from("platform_customers").select("id")
            .eq("business_id", job.business_id).eq("id", job.client_id).maybeSingle();
          customerId = c?.id ?? null;
        }

        const total = Number(job.total_amount || 0);
        const { data: inv, error: invErr } = await supabase
          .from("platform_invoices").insert({
            business_id: job.business_id,
            invoice_number: invoiceNumber,
            customer_id: customerId,
            status: "draft",
            issue_date: now.split("T")[0],
            due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
            terms: "Net 30",
            subtotal: total,
            tax_rate: 0,
            tax_total: 0,
            discount_total: 0,
            total,
            balance_due: total,
            amount_paid: 0,
            internal_notes: `Auto-created from visit completion (${job.title || "job"})`,
          })
          .select("id").single();
        if (invErr) throw invErr;
        invoiceId = inv?.id ?? null;

        await supabase.from("audit_logs").insert({
          business_id: job.business_id,
          user_id: userId,
          event_name: "invoice.draft_created_from_visit",
          entity_type: "platform_invoice",
          entity_id: invoiceId,
          action_type: "create",
          context_json: { jobber_job_id: job.id, invoice_number: invoiceNumber },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[update-visit-status] invoice create failed:", msg);
        // do not fail the visit transition
      }
    }

    const { data: updated } = await supabase
      .from("jobber_jobs")
      .select("id, visit_status, status, title, scheduled_start, client_name, property_address, total_amount, business_id")
      .eq("id", job.id).maybeSingle();

    return new Response(JSON.stringify({
      success: true,
      job: updated,
      invoice: invoiceId ? { id: invoiceId, invoice_number: invoiceNumber } : null,
    }), { headers: { ...headers, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[update-visit-status] error:", msg);
    return new Response(JSON.stringify({ error: "Internal error", detail: msg.slice(0, 300) }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});

function summaryFor(action: Action, title: string | null): string {
  const t = title || "Visit";
  switch (action) {
    case "on_my_way": return `${t} — crew on the way`;
    case "start_visit": return `${t} — visit started`;
    case "complete_visit": return `${t} — visit completed`;
    case "close_invoice_now": return `${t} — completed, draft invoice created`;
    case "close_invoice_later": return `${t} — completed, invoice deferred`;
    case "leave_open": return `${t} — completed, left open`;
    case "reopen_visit": return `${t} — visit reopened`;
  }
}