import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };

const SENDER_DOMAIN = "notify.prestigeflservices.com";
const FROM_EMAIL = "portal@prestigeflservices.com";
const TOKEN_TTL_MIN = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(v: string): string {
  return v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function genToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, origin } = await req.json();
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: JSON_HEADERS });
    }
    const normalized = email.trim().toLowerCase();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Look up customer (don't reveal whether matched)
    const { data: customer } = await supabase
      .from("platform_customers")
      .select("id, display_name, business_id, email, do_not_contact_flag")
      .ilike("email", normalized)
      .limit(1)
      .maybeSingle();

    // Always respond success to prevent email enumeration
    if (!customer || customer.do_not_contact_flag) {
      return new Response(JSON.stringify({ success: true }), { headers: JSON_HEADERS });
    }

    const token = genToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60_000).toISOString();

    await supabase.from("customer_portal_tokens").insert({
      email: normalized,
      token_hash: tokenHash,
      expires_at: expiresAt,
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    });

    const baseOrigin = (typeof origin === "string" && origin.startsWith("http")) ? origin : "https://gulfcoastpalmservices.com";
    const portalUrl = `${baseOrigin}/portal?token=${token}`;

    // Business branding
    const { data: biz } = await supabase
      .from("businesses")
      .select("public_brand_name, support_email, support_phone")
      .eq("id", customer.business_id)
      .maybeSingle();
    const brandName = biz?.public_brand_name || "Customer Portal";

    const safeUrl = escapeHtml(portalUrl);
    const safeBrand = escapeHtml(brandName);
    const safeName = escapeHtml(customer.display_name || "there");

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
        <div style="background:#0a0f0a;padding:28px 32px;"><h1 style="margin:0;color:#22c55e;font-size:22px;">${safeBrand}</h1></div>
        <div style="padding:32px;">
          <p style="margin:0 0 16px;color:#27272a;font-size:15px;">Hi ${safeName},</p>
          <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">Click the button below to sign in to your customer portal. This link expires in ${TOKEN_TTL_MIN} minutes and can only be used once.</p>
          <a href="${safeUrl}" style="display:block;text-align:center;background:#22c55e;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;">Sign in to your portal</a>
          <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;">If you didn't request this email, you can safely ignore it.</p>
        </div>
      </div></body></html>`;
    const text = `Hi ${customer.display_name || "there"},\n\nSign in to your portal: ${portalUrl}\n\nThis link expires in ${TOKEN_TTL_MIN} minutes.`;

    const messageId = `portal-${tokenHash.slice(0, 16)}`;
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "customer-portal-magic-link",
      recipient_email: normalized,
      status: "pending",
      metadata: { business_id: customer.business_id },
    });
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: normalized,
        from: `${brandName} <${FROM_EMAIL}>`,
        subject: `Sign in to ${brandName}`,
        html,
        text,
        sender_domain: SENDER_DOMAIN,
        message_id: messageId,
        idempotency_key: messageId,
        label: "customer-portal",
        purpose: "transactional",
        queued_at: new Date().toISOString(),
      },
    });

    // Trigger immediate flush
    fetch(`${supabaseUrl}/functions/v1/process-email-queue`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json" },
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: JSON_HEADERS });
  }
});