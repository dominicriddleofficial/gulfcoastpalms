import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };
// Default Resend sender that works WITHOUT domain verification — good for
// immediate use. Owner can override by adding a verified domain and setting
// per-business `from_email` on the businesses table.
const DEFAULT_FROM_EMAIL = "Gulf Coast Palms <onboarding@resend.dev>";

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

// Send via Resend HTTP API directly. Returns { ok, id?, error? }.
// Exported for unit tests (see __sendViaResend below).
export async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  cc?: string | null;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean; id?: string; error?: string; status?: number }> {
  const f = params.fetchImpl ?? fetch;
  const body: Record<string, unknown> = {
    from: params.from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text,
  };
  if (params.cc) body.cc = [params.cc];
  if (params.replyTo) body.reply_to = params.replyTo;

  let res: Response;
  try {
    res = await f("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, error: `Network error contacting Resend: ${(err as Error).message}` };
  }

  const raw = await res.text();
  let parsed: any = null;
  try { parsed = raw ? JSON.parse(raw) : null; } catch { /* keep raw */ }

  if (!res.ok) {
    const msg = parsed?.message || parsed?.error || raw || res.statusText;
    return { ok: false, error: `Resend ${res.status}: ${msg}`, status: res.status };
  }
  return { ok: true, id: parsed?.id, status: res.status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      invoiceId,
      recipientEmail,
      recipientName,
      subject,
      message,
      businessName,
      invoiceNumber,
      total,
      dueDate,
      paymentUrl,
      ccEmail,
      ownerEmail,
    } = await req.json();

    if (!recipientEmail || !invoiceNumber) {
      return jsonResponse({ error: "Missing recipientEmail or invoiceNumber" }, 400);
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return jsonResponse({
        error:
          "Email is not configured: RESEND_API_KEY is missing. Add it in Project Settings → Secrets, then try again.",
      }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Per-business sender lookup (falls back to default Resend sandbox sender)
    let FROM_EMAIL = DEFAULT_FROM_EMAIL;
    let resolvedBusinessName = businessName || "Invoice";
    let replyToEmail: string | null = null;
    if (invoiceId) {
      const { data: invRow } = await supabase
        .from("platform_invoices")
        .select("business_id")
        .eq("id", invoiceId)
        .maybeSingle();
      if (invRow?.business_id) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("public_brand_name, legal_name, from_email, support_email")
          .eq("id", invRow.business_id)
          .maybeSingle();
        if (biz) {
          if (biz.from_email) {
            const brand = biz.public_brand_name || biz.legal_name || "Invoice";
            FROM_EMAIL = `${brand} <${biz.from_email}>`;
          }
          replyToEmail = biz.support_email || null;
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

    const emailSubject = subject || `Invoice ${invoiceNumber} from ${resolvedBusinessName}`;
    const messageId = `invoice-${invoiceId || invoiceNumber}-${Date.now()}`;
    const plainText = `Hi ${recipientName || "there"},\n\n${message || "Please find your invoice details below."}\n\nInvoice: ${invoiceNumber}\nAmount Due: $${Number(total || 0).toFixed(2)}\n${dueDate ? `Due Date: ${dueDate}\n` : ""}${paymentUrl ? `\nPay online: ${paymentUrl}\n` : ""}\nThank you for your business! — ${resolvedBusinessName}`;

    // Log as pending
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "invoice",
      recipient_email: recipientEmail,
      status: "pending",
      metadata: { invoiceNumber, total, businessName: resolvedBusinessName },
    });

    // Send to customer via Resend
    const customerResult = await sendViaResend({
      apiKey: RESEND_API_KEY,
      from: FROM_EMAIL,
      to: recipientEmail,
      cc: ccEmail || null,
      replyTo: replyToEmail,
      subject: emailSubject,
      html,
      text: plainText,
    });

    if (!customerResult.ok) {
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "invoice",
        recipient_email: recipientEmail,
        status: "failed",
        error_message: customerResult.error || "Unknown Resend error",
      });
      return jsonResponse({
        success: false,
        deliveryStatus: "failed",
        deliveryError: customerResult.error,
        error: customerResult.error || "Email failed to send",
        messageId,
      }, 502);
    }

    // Mark as sent ONLY after provider accepted the send
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "invoice",
      recipient_email: recipientEmail,
      status: "sent",
      provider_message_id: customerResult.id || null,
    });

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
        }).then(() => {}, () => {});

        await supabase.from("platform_invoices").update({
          status: "sent",
          sent_at: new Date().toISOString(),
        }).eq("id", invoiceId);
      }
    }

    // Owner notification (best-effort; warn if it fails, don't fail the whole call)
    let ownerNotificationWarning: string | null = null;
    if (ownerEmail) {
      const ownerSubject = `Invoice ${invoiceNumber} sent to ${recipientName || recipientEmail}`;
      const ownerHtml = `<div style="font-family:Arial,sans-serif"><p>Invoice <strong>${escapeHtml(invoiceNumber)}</strong> was sent to <strong>${escapeHtml(recipientName || recipientEmail)}</strong>.</p><p>Amount: <strong>$${Number(total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></p></div>`;
      const ownerResult = await sendViaResend({
        apiKey: RESEND_API_KEY,
        from: FROM_EMAIL,
        to: ownerEmail,
        subject: ownerSubject,
        html: ownerHtml,
        text: `Invoice ${invoiceNumber} sent to ${recipientName || recipientEmail}. Amount: $${Number(total || 0).toFixed(2)}`,
      });
      if (!ownerResult.ok) ownerNotificationWarning = ownerResult.error || null;
    }

    return jsonResponse({
      success: true,
      deliveryStatus: "sent",
      message: `Invoice email sent to ${recipientEmail}`,
      messageId,
      providerMessageId: customerResult.id || null,
      sentAt: new Date().toISOString(),
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
