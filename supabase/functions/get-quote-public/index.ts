import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { quote_id } = await req.json();
    if (!quote_id || typeof quote_id !== "string") {
      return new Response(JSON.stringify({ error: "quote_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch quote
    const { data: quote, error: qErr } = await supabase
      .from("platform_quotes")
      .select("id, quote_number, total, subtotal, tax_total, status, valid_until, public_notes, customer_id, business_id")
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

    // Fetch customer
    let customerName = "Customer";
    if (quote.customer_id) {
      const { data: cust } = await supabase
        .from("platform_customers")
        .select("display_name")
        .eq("id", quote.customer_id)
        .single();
      if (cust) customerName = cust.display_name;
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

    return new Response(JSON.stringify({
      id: quote.id,
      quote_number: quote.quote_number,
      total: quote.total || 0,
      subtotal: quote.subtotal || 0,
      tax_total: quote.tax_total || 0,
      status: quote.status,
      valid_until: quote.valid_until,
      public_notes: quote.public_notes,
      customer_name: customerName,
      business_name: biz?.public_brand_name || "",
      shortcode: biz?.shortcode || "",
      logo_url: biz?.logo_url,
      business_phone: biz?.support_phone,
      business_email: biz?.support_email,
      line_items: lineItems || [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
