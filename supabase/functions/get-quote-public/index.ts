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

    // Fetch quote
    const { data: quote, error: qErr } = await supabase
      .from("platform_quotes")
      .select("id, quote_number, total, subtotal, tax_rate, tax_total, status, valid_until, public_notes, scope_of_work, created_at, customer_id, property_id, business_id, deposit_required_flag, deposit_amount_calculated")
      .eq("id", quote_id)
      .single();

    if (qErr || !quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    // Fetch customer
    let customerName = "Customer";
    let customerEmail: string | null = null;
    let customerPhone: string | null = null;
    if (quote.customer_id) {
      const { data: cust } = await supabase
        .from("platform_customers")
        .select("display_name, email, phone")
        .eq("id", quote.customer_id)
        .single();
      if (cust) {
        customerName = cust.display_name;
        customerEmail = cust.email;
        customerPhone = cust.phone;
      }
    }

    let customerAddress: string | null = null;
    if (quote.property_id) {
      const { data: property } = await supabase
        .from("platform_properties")
        .select("address_1, city, state, zip")
        .eq("id", quote.property_id)
        .single();

      if (property) {
        customerAddress = [property.address_1, property.city, property.state, property.zip].filter(Boolean).join(", ");
      }
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from("platform_quote_line_items")
      .select("description, quantity, unit_price, line_total, line_type")
      .eq("quote_id", quote.id)
      .order("sort_order", { ascending: true });

    // Mark as viewed if first time
    if (!quote.status || quote.status === "sent") {
      await supabase.from("platform_quotes").update({ status: "viewed", first_viewed_at: new Date().toISOString() }).eq("id", quote.id);
    }

    const approvalToken = await signApprovalToken(quote.id, serviceKey);

    return new Response(JSON.stringify({
      id: quote.id,
      quote_number: quote.quote_number,
      total: quote.total || 0,
      subtotal: quote.subtotal || 0,
      tax_rate: quote.tax_rate || 0,
      tax_total: quote.tax_total || 0,
      status: quote.status,
      valid_until: quote.valid_until,
      created_at: quote.created_at,
      public_notes: quote.public_notes,
      scope_of_work: quote.scope_of_work,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      business_name: biz?.public_brand_name || "",
      shortcode: biz?.shortcode || "",
      logo_url: biz?.logo_url,
      business_phone: biz?.support_phone,
      business_email: biz?.support_email,
      deposit_required: quote.deposit_required_flag || false,
      deposit_amount: quote.deposit_amount_calculated || 0,
      line_items: lineItems || [],
      approval_token: approvalToken,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
