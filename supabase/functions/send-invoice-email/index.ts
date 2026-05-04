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

function formatMessageHtml(value: string | null | undefined): string {
  return escapeHtml(
    value || "Please find your invoice details below. You can pay online using the button below.",
  ).replaceAll("\n", "<br />");
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

async function flushEmailQueue(supabaseUrl: string, serviceKey: string): Promise<void> {
  const response = await fetch(`${supabaseUrl}/functions/v1/process-email-queue`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Queue processor failed (${response.status}): ${text || response.statusText}`);
  }
}

async function waitForMessageResult(
  supabase: any,
  messageId: string,
  timeoutMs = 8000,
): Promise<{ status: string; error_message: string | null } | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("email_send_log")
      .select("status, error_message")
      .eq("message_id", messageId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read email status: ${error.message}`);
    }

    if (data && data.status !== "pending") {
      return data;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invoiceId, recipientEmail, recipientName, subject, message, businessName, invoiceNumber, total, dueDate, paymentUrl, ccEmail, ownerEmail } = await req.json();

    if (!recipientEmail || !invoiceNumber) {
      return jsonResponse({ error: "Missing recipientEmail or invoiceNumber" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const queuedAt = new Date().toISOString();

    // Per-business sender lookup (falls back to default)
    let SENDER_DOMAIN = DEFAULT_SENDER_DOMAIN;
    let FROM_EMAIL = DEFAULT_FROM_EMAIL;
    let resolvedBusinessName = businessName || "Invoice";
    if (invoiceId) {
      const { data: invRow } = await supabase
        .from("platform_invoices")
        .select("business_id")
        .eq("id", invoiceId)
        .maybeSingle();
      if (invRow?.business_id) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("public_brand_name, legal_name, sender_domain, from_email")
          .eq("id", invRow.business_id)
          .maybeSingle();
        if (biz) {
          if (biz.sender_domain) SENDER_DOMAIN = biz.sender_domain;
          if (biz.from_email) FROM_EMAIL = biz.from_email;
          resolvedBusinessName = businessName || biz.public_brand_name || biz.legal_name || "Invoice";
        }
      }
    }

    const safeBusinessName = escapeHtml(resolvedBusinessName);
    const safeRecipientName = escapeHtml(recipientName || "there");
    const safeInvoiceNumber = escapeHtml(invoiceNumber);
    const safeDueDate = dueDate ? escapeHtml(dueDate) : "";
    const safePaymentUrl = paymentUrl ? escapeHtml(paymentUrl) : "";

    // Build the HTML email
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
            <td style="color:#71717a;font-size:12px;padding:4px 0;">Invoice</td>
            <td style="text-align:right;font-weight:600;color:#18181b;font-size:13px;">${safeInvoiceNumber}</td>
          </tr>
          <tr>
            <td style="color:#71717a;font-size:12px;padding:4px 0;">Amount Due</td>
            <td style="text-align:right;font-weight:700;color:#22c55e;font-size:16px;">$${Number(total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          </tr>
          ${safeDueDate ? `<tr><td style="color:#71717a;font-size:12px;padding:4px 0;">Due Date</td><td style="text-align:right;color:#18181b;font-size:13px;">${safeDueDate}</td></tr>` : ""}
        </table>
      </div>
      ${safePaymentUrl ? `
      <a href="${safePaymentUrl}" style="display:block;text-align:center;background:#22c55e;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;">
        Pay Now
      </a>` : ""}
      <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;">
        Thank you for your business! — ${safeBusinessName}
      </p>
    </div>
  </div>
</body>
</html>`;

    const emailSubject = subject || `Invoice ${invoiceNumber} from ${businessName}`;
    const messageId = `invoice-${invoiceId || invoiceNumber}-${Date.now()}`;

    // Log as pending in email_send_log
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "invoice",
      recipient_email: recipientEmail,
      status: "pending",
      metadata: { invoiceNumber, total, businessName },
    });

    // Get or create unsubscribe token for recipient
    const unsubToken = await getOrCreateUnsubToken(supabase, recipientEmail);

    const plainText = `Hi ${recipientName || "there"},\n\n${message || "Please find your invoice details below."}\n\nInvoice: ${invoiceNumber}\nAmount Due: $${Number(total || 0).toFixed(2)}\n${dueDate ? `Due Date: ${dueDate}\n` : ""}${paymentUrl ? `\nPay online: ${paymentUrl}\n` : ""}\nThank you for your business! — ${businessName}`;

    const emailPayload = {
      to: recipientEmail,
      from: `${businessName || "Invoices"} <${FROM_EMAIL}>`,
      subject: emailSubject,
      html,
      text: plainText,
      sender_domain: SENDER_DOMAIN,
      message_id: messageId,
      idempotency_key: messageId,
      label: "invoice",
      purpose: "transactional",
      queued_at: queuedAt,
      unsubscribe_token: unsubToken,
    };

    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: emailPayload,
    });

    if (enqueueError) {
      console.error("Failed to enqueue invoice email:", enqueueError);
      // Update send log to failed
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "invoice",
        recipient_email: recipientEmail,
        status: "failed",
        error_message: enqueueError.message,
      });
      return jsonResponse({ error: `Failed to send email: ${enqueueError.message}` }, 500);
    }

    console.log(`Invoice email enqueued for: ${recipientEmail}, subject: ${emailSubject}`);

    // Send owner notification email
    let ownerMessageId: string | null = null;
    if (ownerEmail) {
      const ownerSubject = `Invoice ${invoiceNumber} sent to ${recipientName || recipientEmail}`;
      const ownerHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#0a0f0a;padding:20px 24px;">
      <h1 style="margin:0;color:#22c55e;font-size:18px;">Invoice Sent ✓</h1>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 12px;color:#27272a;font-size:14px;">Invoice <strong>${invoiceNumber}</strong> was sent to <strong>${recipientName || recipientEmail}</strong>.</p>
      <p style="margin:0;color:#52525b;font-size:13px;">Amount: <strong>$${Number(total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></p>
    </div>
  </div>
</body>
</html>`;

      ownerMessageId = `invoice-owner-${invoiceId || invoiceNumber}-${Date.now()}`;
      const ownerUnsubToken = await getOrCreateUnsubToken(supabase, ownerEmail);
      await supabase.from("email_send_log").insert({
        message_id: ownerMessageId,
        template_name: "invoice-owner",
        recipient_email: ownerEmail,
        status: "pending",
        metadata: { invoiceNumber, total, businessName },
      });
      await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          to: ownerEmail,
          from: `${businessName || "Invoices"} <${FROM_EMAIL}>`,
          subject: ownerSubject,
          html: ownerHtml,
          text: `Invoice ${invoiceNumber} was sent to ${recipientName || recipientEmail}. Amount: $${Number(total || 0).toFixed(2)}`,
          sender_domain: SENDER_DOMAIN,
          message_id: ownerMessageId,
          idempotency_key: ownerMessageId,
          label: "invoice-owner",
          purpose: "transactional",
          queued_at: queuedAt,
          unsubscribe_token: ownerUnsubToken,
        },
      });
    }

    let queueFlushError: string | null = null;

    try {
      await flushEmailQueue(supabaseUrl, serviceKey);
    } catch (error) {
      queueFlushError = error instanceof Error ? error.message : String(error);
      console.error("Failed to trigger immediate email queue flush:", queueFlushError);
    }

    const customerResult = await waitForMessageResult(supabase, messageId);

    if (!customerResult || customerResult.status !== "sent") {
      return jsonResponse({
        error: customerResult?.error_message || queueFlushError || "Invoice email is still pending and was not confirmed as sent.",
      }, 502);
    }

    // Log to comm_logs and update invoice status only after actual send success
    if (invoiceId) {
      const { data: inv } = await supabase
        .from("platform_invoices")
        .select("customer_id, business_id")
        .eq("id", invoiceId)
        .single();

      if (inv) {
        await supabase.from("platform_comm_logs").insert({
          business_id: inv.business_id,
          customer_id: inv.customer_id,
          channel: "email",
          direction: "outbound",
          subject: emailSubject,
          body: `Invoice ${invoiceNumber} sent to ${recipientEmail}. Amount: $${total}`,
          sent_at: new Date().toISOString(),
        });

        await supabase.from("platform_invoices").update({
          status: "sent",
          sent_at: new Date().toISOString(),
        }).eq("id", invoiceId);
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
      message: `Invoice email sent to ${recipientEmail}`,
      messageId,
      ownerNotificationWarning,
    });

  } catch (err) {
    console.error("send-invoice-email error:", err);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceKey);
      await supabase.from("error_logs").insert({
        error_message: `send-invoice-email: ${(err as Error).message}`,
        error_stack: (err as Error).stack || null,
        page_url: "/edge/send-invoice-email",
      });
    } catch {}

    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
