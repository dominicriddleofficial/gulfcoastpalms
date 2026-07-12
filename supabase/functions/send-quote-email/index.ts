import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SENDER_DOMAIN = "notify.prestigeflservices.com";
const DEFAULT_FROM_EMAIL = "invoices@prestigeflservices.com";
const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };

function escapeHtml(value: string | null | undefined): string {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function flushEmailQueue(supabaseUrl: string, serviceKey: string): Promise<void> {
  const response = await fetch(`${supabaseUrl}/functions/v1/process-email-queue`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json" },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Queue processor failed (${response.status}): ${text || response.statusText}`);
}

async function waitForMessageResult(supabase: any, messageId: string, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("email_send_log")
      .select("status, error_message")
      .eq("message_id", messageId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Failed to read email status: ${error.message}`);
    if (data && data.status !== "pending") return data;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function getOrCreateUnsubToken(supabase: any, email: string): Promise<string> {
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", email)
    .is("used_at", null)
    .limit(1)
    .single();
  if (existing?.token) return existing.token;
  const token = crypto.randomUUID();
  await supabase.from("email_unsubscribe_tokens").insert({ email, token });
  return token;
}

/**
 * Strip a leading greeting line such as "Hi Name," / "Hello Name," / "Hey Name,"
 * because the email template renders its own greeting line and we don't want
 * "Hi Dom," to appear twice in the final email body.
 */
function stripLeadingGreeting(value: string): string {
  const trimmed = (value || "").replace(/^\s+/, "");
  const match = trimmed.match(/^(?:hi|hello|hey|dear)\b[^\n]*,?\s*\n+/i);
  return match ? trimmed.slice(match[0].length) : trimmed;
}

function formatMessageHtml(value: string | null | undefined): string {
  const stripped = stripLeadingGreeting(
    value || "Please find your quote attached. You can view and approve it online using the link below.",
  );
  return escapeHtml(stripped).replaceAll("\n", "<br />");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth gate — require a valid user JWT (or the service-role key for
    // internal calls). Prevents unauthenticated abuse of the sending domain.
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!bearer) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    if (bearer !== serviceRoleKey) {
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: `Bearer ${bearer}` } } },
      );
      const { data: userData, error: userErr } = await authClient.auth.getUser(bearer);
      if (userErr || !userData?.user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
    }

    const { quoteId, recipientEmail, recipientName, subject, message, businessName, quoteNumber, quoteUrl, ownerEmail } = await req.json();

    if (!recipientEmail || !quoteNumber) {
      return jsonResponse({ error: "Missing recipientEmail or quoteNumber" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const queuedAt = new Date().toISOString();

    let SENDER_DOMAIN = DEFAULT_SENDER_DOMAIN;
    let FROM_EMAIL = DEFAULT_FROM_EMAIL;
    let resolvedBusinessName = businessName || "Quote";
    if (quoteId) {
      const { data: qRow } = await supabase
        .from("platform_quotes")
        .select("business_id")
        .eq("id", quoteId)
        .maybeSingle();
      if (qRow?.business_id) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("public_brand_name, legal_name, sender_domain, from_email")
          .eq("id", qRow.business_id)
          .maybeSingle();
        if (biz) {
          if (biz.sender_domain) SENDER_DOMAIN = biz.sender_domain;
          if (biz.from_email) FROM_EMAIL = biz.from_email;
          resolvedBusinessName = businessName || biz.public_brand_name || biz.legal_name || "Quote";
        }
      }
    }

    const safeBusinessName = escapeHtml(resolvedBusinessName);
    const safeRecipientName = escapeHtml(recipientName || "there");
    const safeQuoteNumber = escapeHtml(quoteNumber);
    const safeQuoteUrl = quoteUrl ? escapeHtml(quoteUrl) : "";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#0a0f0a;padding:28px 32px;">
      <h1 style="margin:0;color:#22c55e;font-size:22px;">${safeBusinessName}</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#27272a;font-size:15px;">Hi ${safeRecipientName},</p>
      <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">
        ${formatMessageHtml(message)}
      </p>
      <div style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#71717a;font-size:12px;padding:4px 0;">Quote</td>
            <td style="text-align:right;font-weight:600;color:#18181b;font-size:13px;">${safeQuoteNumber}</td>
          </tr>
        </table>
      </div>
      ${safeQuoteUrl ? `
      <a href="${safeQuoteUrl}" style="display:block;text-align:center;background:#22c55e;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;">
        View Quote
      </a>` : ""}
      <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;">
        Thank you for considering ${safeBusinessName}.
      </p>
    </div>
  </div>
</body>
</html>`;

    const emailSubject = subject || `Quote ${quoteNumber} from ${resolvedBusinessName}`;
    const messageId = `quote-${quoteId || quoteNumber}-${Date.now()}`;

    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "quote",
      recipient_email: recipientEmail,
      status: "pending",
      metadata: { quoteNumber, businessName: resolvedBusinessName },
    });

    const unsubToken = await getOrCreateUnsubToken(supabase, recipientEmail);

    const plainText = `Hi ${recipientName || "there"},\n\n${stripLeadingGreeting(message || "Please find your quote attached. You can view and approve it online using the link below.")}\n\nQuote: ${quoteNumber}\n${safeQuoteUrl ? `\nView quote: ${quoteUrl}\n` : ""}\nThank you for considering ${resolvedBusinessName}.`;

    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: recipientEmail,
        from: `${resolvedBusinessName} <${FROM_EMAIL}>`,
        subject: emailSubject,
        html,
        text: plainText,
        sender_domain: SENDER_DOMAIN,
        message_id: messageId,
        idempotency_key: messageId,
        label: "quote",
        purpose: "transactional",
        queued_at: queuedAt,
        unsubscribe_token: unsubToken,
      },
    });

    if (enqueueError) {
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "quote",
        recipient_email: recipientEmail,
        status: "failed",
        error_message: enqueueError.message,
      });
      return jsonResponse({ error: `Failed to send email: ${enqueueError.message}` }, 500);
    }

    // Owner notification (with internal price for visibility)
    let ownerMessageId: string | null = null;
    if (ownerEmail) {
      const ownerSubject = `Quote ${quoteNumber} sent to ${recipientName || recipientEmail}`;
      const ownerHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#0a0f0a;padding:20px 24px;">
      <h1 style="margin:0;color:#22c55e;font-size:18px;">Quote Sent ✓</h1>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 12px;color:#27272a;font-size:14px;">Quote <strong>${escapeHtml(quoteNumber)}</strong> was sent to <strong>${escapeHtml(recipientName || recipientEmail)}</strong>.</p>
    </div>
  </div>
</body></html>`;
      ownerMessageId = `quote-owner-${quoteId || quoteNumber}-${Date.now()}`;
      const ownerUnsubToken = await getOrCreateUnsubToken(supabase, ownerEmail);
      await supabase.from("email_send_log").insert({
        message_id: ownerMessageId,
        template_name: "quote-owner",
        recipient_email: ownerEmail,
        status: "pending",
        metadata: { quoteNumber, businessName: resolvedBusinessName },
      });
      await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          to: ownerEmail,
          from: `${resolvedBusinessName} <${FROM_EMAIL}>`,
          subject: ownerSubject,
          html: ownerHtml,
          text: `Quote ${quoteNumber} was sent to ${recipientName || recipientEmail}.`,
          sender_domain: SENDER_DOMAIN,
          message_id: ownerMessageId,
          idempotency_key: ownerMessageId,
          label: "quote-owner",
          purpose: "transactional",
          queued_at: queuedAt,
          unsubscribe_token: ownerUnsubToken,
        },
      });
    }

    let queueFlushError: string | null = null;
    try { await flushEmailQueue(supabaseUrl, serviceKey); }
    catch (e) { queueFlushError = e instanceof Error ? e.message : String(e); }

    const customerResult = await waitForMessageResult(supabase, messageId);

    if (!customerResult || customerResult.status !== "sent") {
      return jsonResponse({
        success: false,
        deliveryStatus: customerResult?.status || "pending",
        deliveryError: customerResult?.error_message || queueFlushError || null,
        error: customerResult?.error_message || queueFlushError || "Quote email is still pending and was not confirmed as sent.",
        messageId,
      }, 502);
    }

    if (quoteId) {
      const { data: q } = await supabase
        .from("platform_quotes")
        .select("customer_id, business_id")
        .eq("id", quoteId)
        .single();
      if (q) {
        await supabase.from("platform_comm_logs").insert({
          business_id: q.business_id,
          customer_id: q.customer_id,
          channel: "email",
          direction: "outbound",
          subject: emailSubject,
          body: `Quote ${quoteNumber} sent to ${recipientEmail}`,
          sent_at: new Date().toISOString(),
        });
      }
    }

    let ownerNotificationWarning: string | null = null;
    if (ownerMessageId) {
      const ownerResult = await waitForMessageResult(supabase, ownerMessageId, 4000);
      if (ownerResult && ownerResult.status !== "sent") {
        ownerNotificationWarning = ownerResult.error_message || "Owner notification email was not confirmed as sent.";
      } else if (!ownerResult && queueFlushError) {
        ownerNotificationWarning = queueFlushError;
      }
    }

    return jsonResponse({
      success: true,
      deliveryStatus: customerResult.status,
      message: `Quote email sent to ${recipientEmail}`,
      messageId,
      ownerNotificationWarning,
    });
  } catch (err) {
    console.error("send-quote-email error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});