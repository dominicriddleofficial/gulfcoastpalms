import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_DOMAIN = "notify.prestigeflservices.com";
const FROM_EMAIL = `invoices@prestigeflservices.com`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invoiceId, recipientEmail, recipientName, subject, message, businessName, invoiceNumber, total, dueDate, paymentUrl, ccEmail, ownerEmail } = await req.json();

    if (!recipientEmail || !invoiceNumber) {
      return new Response(JSON.stringify({ error: "Missing recipientEmail or invoiceNumber" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Build the HTML email
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#0a0f0a;padding:28px 32px;">
      <h1 style="margin:0;color:#22c55e;font-size:22px;">${businessName || "Invoice"}</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#27272a;font-size:15px;">Hi ${recipientName || "there"},</p>
      <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">
        ${message || "Please find your invoice details below. You can pay online using the button below."}
      </p>
      <div style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#71717a;font-size:12px;padding:4px 0;">Invoice</td>
            <td style="text-align:right;font-weight:600;color:#18181b;font-size:13px;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="color:#71717a;font-size:12px;padding:4px 0;">Amount Due</td>
            <td style="text-align:right;font-weight:700;color:#22c55e;font-size:16px;">$${Number(total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          </tr>
          ${dueDate ? `<tr><td style="color:#71717a;font-size:12px;padding:4px 0;">Due Date</td><td style="text-align:right;color:#18181b;font-size:13px;">${dueDate}</td></tr>` : ""}
        </table>
      </div>
      ${paymentUrl ? `
      <a href="${paymentUrl}" style="display:block;text-align:center;background:#22c55e;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;">
        Pay Now
      </a>` : ""}
      <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;">
        Thank you for your business! — ${businessName}
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

    // Enqueue the email for delivery via the email queue
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
      purpose: "transactional",
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
      return new Response(JSON.stringify({ error: `Failed to send email: ${enqueueError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Invoice email enqueued for: ${recipientEmail}, subject: ${emailSubject}`);

    // Log to comm_logs and update invoice status
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

    // Send owner notification email
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

      const ownerMessageId = `invoice-owner-${invoiceId || invoiceNumber}-${Date.now()}`;
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
          purpose: "transactional",
        },
      });
    }

    return new Response(JSON.stringify({ success: true, message: `Invoice email sent to ${recipientEmail}` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
