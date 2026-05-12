import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate an HMAC approval token issued by get-quote-public.
async function verifyApprovalToken(quoteId: string, token: string, secret: string): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`approve:${quoteId}`));
    const bytes = new Uint8Array(sig);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    const expected = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    // Constant-time comparison
    if (expected.length !== token.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { quote_id, action, approved_by, change_notes, approval_token } = body;
    console.log(`[approve-quote] START quote_id=${quote_id} action=${action || "approve"}`);

    if (!quote_id || typeof quote_id !== "string") {
      return new Response(JSON.stringify({ error: "quote_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Require a valid HMAC approval token tied to this quote_id.
    // Tokens are issued by get-quote-public when the customer loads the quote page.
    const tokenValid = await verifyApprovalToken(quote_id, approval_token, serviceKey);
    if (!tokenValid) {
      return new Response(JSON.stringify({ error: "Invalid or missing approval token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch full quote details
    const { data: quote } = await supabase
      .from("platform_quotes")
      .select("quote_number, total, subtotal, tax_rate, tax_total, discount_total, customer_id, business_id, public_notes, internal_notes, status, approval_sms_sent")
      .eq("id", quote_id)
      .single();

    // Determine brand (GCP vs PPS) from business shortcode
    let shortcode = "gcp";
    if (quote?.business_id) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("shortcode")
        .eq("id", quote.business_id)
        .single();
      if (biz?.shortcode) shortcode = String(biz.shortcode).toLowerCase();
    }
    const isPPS = shortcode === "pps";

    let customerName = "Customer";
    if (quote?.customer_id) {
      const { data: cust } = await supabase
        .from("platform_customers")
        .select("display_name")
        .eq("id", quote.customer_id)
        .single();
      if (cust) customerName = cust.display_name;
    }

    const ownerPhone = "8509101290";

    // Public origin used to build the dashboard link in the SMS
    const adminOrigin = req.headers.get("origin") || "https://gulfcoastpalmservices.com";
    const adminQuoteUrl = `${adminOrigin}/platform/quotes`;

    // ── Change Request Flow ──
    if (action === "request_changes") {
      if (!change_notes || typeof change_notes !== "string" || change_notes.trim().length === 0) {
        return new Response(JSON.stringify({ error: "change_notes required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error } = await supabase
        .from("platform_quotes")
        .update({
          status: "changes_requested",
          change_request_notes: change_notes.trim(),
          change_requested_at: new Date().toISOString(),
        })
        .eq("id", quote_id);

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to submit change request" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      try {
        const smsMsg = `${customerName} requested changes on ${quote?.quote_number || "a quote"}. Check the platform.`;
        await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
          body: JSON.stringify({ to: ownerPhone, message: smsMsg }),
        });
      } catch { /* SMS is best-effort */ }

      return new Response(JSON.stringify({ success: true, status: "changes_requested" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Approve Flow ──
    if (!approved_by || typeof approved_by !== "string" || approved_by.trim().length === 0) {
      return new Response(JSON.stringify({ error: "approved_by name required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const alreadyApproved =
      quote?.status === "approved" || quote?.status === "accepted" || quote?.status === "won";

    if (alreadyApproved) {
      console.log(`[approve-quote] quote ${quote?.quote_number} already approved — returning idempotent success`);
      return new Response(
        JSON.stringify({ success: true, status: "already_approved", quote_status: quote?.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Guard against duplicate approvals at the SQL level: only flip status when it's
    // currently in a non-approved state. If 0 rows match, treat as already approved.
    const { data: updatedRows, error } = await supabase
      .from("platform_quotes")
      .update({
        status: "approved",
        approved_by: approved_by.trim(),
        approved_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      })
      .eq("id", quote_id)
      .not("status", "in", "(approved,accepted,won)")
      .select("id");

    if (error) {
      return new Response(JSON.stringify({ error: "Failed to approve quote" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!updatedRows || updatedRows.length === 0) {
      // Race: another request approved this quote between our SELECT and UPDATE.
      console.log(`[approve-quote] no rows updated for ${quote?.quote_number} — likely race; returning idempotent success`);
      return new Response(
        JSON.stringify({ success: true, status: "already_approved" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.log(`[approve-quote] status updated to approved for ${quote?.quote_number}`);

    // ── Auto-create draft invoice from approved quote ──
    // Only PPS auto-creates an invoice (deposit/payment workflow).
    // GCP is approval-only — owner converts to job, then invoices later.
    let invoiceNumber = "";
    try {
      if (isPPS && quote?.business_id && !alreadyApproved) {
        // Generate invoice number
        const { data: invNum, error: numErr } = await supabase.rpc("generate_next_number", {
          _business_id: quote.business_id,
          _record_type: "invoice",
        });
        if (numErr) throw numErr;
        invoiceNumber = invNum as string;

        // Fetch quote line items
        const { data: lineItems } = await supabase
          .from("platform_quote_line_items")
          .select("*")
          .eq("quote_id", quote_id)
          .order("sort_order");

        // Create draft invoice
        const { data: inv, error: invErr } = await supabase.from("platform_invoices").insert({
          business_id: quote.business_id,
          invoice_number: invoiceNumber,
          customer_id: quote.customer_id,
          quote_id: quote_id,
          status: "draft",
          issue_date: new Date().toISOString().split("T")[0],
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          terms: "Net 30",
          subtotal: quote.subtotal,
          tax_rate: quote.tax_rate,
          tax_total: quote.tax_total,
          discount_total: quote.discount_total,
          total: quote.total,
          balance_due: quote.total,
          amount_paid: 0,
          public_notes: quote.public_notes || null,
          internal_notes: `Auto-created from approved quote ${quote.quote_number}`,
        }).select("id").single();

        if (invErr || !inv) throw invErr || new Error("Failed to create invoice");

        // Copy line items to invoice
        if (lineItems && lineItems.length > 0) {
          await supabase.from("platform_invoice_line_items").insert(
            lineItems.map((li: Record<string, unknown>, i: number) => ({
              business_id: quote.business_id,
              invoice_id: inv.id,
              description: li.description as string,
              quantity: li.quantity as number,
              unit_price: li.unit_price as number,
              line_total: li.line_total as number,
              sort_order: i,
            }))
          );
        }

        // Mark quote as won since invoice was created
        await supabase.from("platform_quotes").update({ status: "won" }).eq("id", quote_id);
      }
    } catch { /* Invoice creation is best-effort — owner can still convert manually */ }

    // ── Send SMS to owner about approval (idempotent: only once per quote) ──
    console.log(`[approve-quote] approval_sms_sent (before) = ${quote?.approval_sms_sent}`);
    if (!quote?.approval_sms_sent) {
      try {
        const totalStr = quote?.total
          ? `$${Number(quote.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
          : "$0.00";
        const smsMsg =
          `Quote approved: ${quote?.quote_number || "quote"} — ${customerName} — ${totalStr}. View: ${adminQuoteUrl}`;
        console.log(`[approve-quote] calling send-sms to ${ownerPhone}`);
        const smsResp = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
          body: JSON.stringify({ to: ownerPhone, message: smsMsg }),
        });
        const smsBody = await smsResp.text().catch(() => "");
        if (smsResp.ok) {
          console.log(`[approve-quote] SMS success: ${smsBody.substring(0, 200)}`);
          await supabase
            .from("platform_quotes")
            .update({ approval_sms_sent: true, approval_sms_sent_at: new Date().toISOString() })
            .eq("id", quote_id);
          console.log(`[approve-quote] approval_sms_sent (after) = true`);
        } else {
          console.error(`[approve-quote] SMS failed (${smsResp.status}): ${smsBody.substring(0, 300)}`);
          await supabase.from("error_logs").insert({
            error_message: `approve-quote SMS failed (${smsResp.status}) for ${quote?.quote_number}: ${smsBody.substring(0, 300)}`,
            page_url: "/edge/approve-quote",
          }).then(() => null, () => null);
        }
      } catch (e) {
        // SMS is best-effort — never block approval
        console.error("[approve-quote] SMS exception:", e);
      }
    } else {
      console.log(`[approve-quote] skipping SMS — already sent for ${quote?.quote_number}`);
    }

    return new Response(JSON.stringify({ success: true, status: "approved", invoice_number: invoiceNumber || null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
