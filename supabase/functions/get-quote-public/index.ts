import { publicPricingFields, liveIdentityFrom, type PublicPricing } from "./pricing.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate an HMAC-SHA256 approval token tied to a quote_id.
// Uses the service role key as the signing secret (already available, never leaves the server).
async function signApprovalToken(quoteId: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`approve:${quoteId}`));
  // base64url encode
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { quote_id, shortcode } = await req.json();
    if (!quote_id || typeof quote_id !== "string") {
      return new Response(JSON.stringify({ error: "quote_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey
    );

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    const denyNotFound = async (reason: string) => {
      try {
        await supabase.from("audit_logs").insert({
          event_name: "public_quote_access_denied",
          entity_type: "quote",
          entity_id: quote_id,
          action_type: "deny",
          context_json: { reason, shortcode_provided: shortcode ?? null },
          ip_address: ip,
          user_agent: ua,
        });
      } catch { /* best-effort */ }
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    };

    // Require shortcode for public access
    if (!shortcode || typeof shortcode !== "string") {
      return await denyNotFound("missing_shortcode");
    }

    // ONE database statement returns every customer-facing field: header, scope, identity, totals, lines, fingerprint.
    const { data: pricingRow, error: pricingErr } = await supabase.rpc("quote_public_pricing", { _quote_id: quote_id });
    if (pricingErr) throw new Error("pricing unavailable");
    if (!pricingRow) {
      return new Response(JSON.stringify({ error: "Quote not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const row = pricingRow as PublicPricing;
    const quote = row.quote;

    // Fetch business
    const { data: biz } = await supabase
      .from("businesses")
      .select("public_brand_name, shortcode, logo_url, support_phone, support_email")
      .eq("id", quote.business_id)
      .single();

    // Verify shortcode matches the quote's business — never reveal cross-business existence
    const quoteShortcode = (biz?.shortcode || "").toLowerCase();
    if (!quoteShortcode || shortcode.toLowerCase() !== quoteShortcode) {
      return await denyNotFound("shortcode_mismatch");
    }

    // Mark as viewed only if it is still unsent/sent at this moment — never overwrite a concurrent approval.
    let status = quote.status;
    if (!status || status === "sent") {
      const { data: viewed } = await supabase.from("platform_quotes")
        .update({ status: "viewed", first_viewed_at: new Date().toISOString() })
        .eq("id", quote.id).or("status.is.null,status.eq.sent").select("status");
      if (viewed && viewed.length > 0) status = "viewed";
    }

    const approvalToken = await signApprovalToken(quote.id, serviceKey);
    const priced = publicPricingFields(row, liveIdentityFrom(row));
    const customerEmail = row.customer?.email ?? null;
    const customerPhone = row.customer?.phone ?? null;

    return new Response(JSON.stringify({
      id: quote.id,
      quote_number: quote.quote_number,
      total: priced.total,
      subtotal: priced.subtotal,
      tax_rate: priced.tax_rate,
      tax_total: priced.tax_total,
      discount_total: priced.discount_total,
      status,
      valid_until: priced.valid_until,
      created_at: quote.created_at,
      approved_at: priced.approved_at,
      approved_by: priced.approved_by,
      public_notes: priced.public_notes,
      scope_of_work: priced.scope_of_work,
      customer_name: priced.customer_name,
      billing_name: priced.billing_name,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_address: priced.customer_address,
      business_name: biz?.public_brand_name || "",
      shortcode: biz?.shortcode || "",
      logo_url: biz?.logo_url,
      business_phone: biz?.support_phone,
      business_email: biz?.support_email,
      deposit_required: quote.deposit_required_flag || false,
      deposit_amount: priced.deposit_amount,
      line_items: priced.line_items,
      pricing_fingerprint: priced.pricing_fingerprint,
      accepted_snapshot: priced.accepted_snapshot,
      approval_token: approvalToken,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
