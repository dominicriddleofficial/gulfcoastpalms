import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { invoice_id, shortcode } = body;

    // Validate invoice_id is a valid UUID
    if (!invoice_id || typeof invoice_id !== "string" || !UUID_RE.test(invoice_id)) {
      return new Response(JSON.stringify({ error: true, message: "Invalid invoice ID format", code: "VALIDATION_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate shortcode if provided
    if (shortcode !== undefined && (typeof shortcode !== "string" || shortcode.length > 50)) {
      return new Response(JSON.stringify({ error: true, message: "Invalid shortcode format", code: "VALIDATION_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabaseAdmin
      .from("platform_invoices")
      .select("id, invoice_number, total, balance_due, status, deposit_required, deposit_amount, deposit_paid, business_id, customer_id, platform_customers(display_name), businesses(shortcode, public_brand_name)")
      .eq("id", invoice_id)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: true, message: "Invoice not found", code: "NOT_FOUND" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // If shortcode was provided, verify it matches the invoice's business
    const invoiceShortcode = (data as any).businesses?.shortcode || "";
    if (shortcode && shortcode.toLowerCase() !== invoiceShortcode.toLowerCase()) {
      // Don't reveal that the invoice exists — just return not found
      return new Response(JSON.stringify({ error: true, message: "Invoice not found", code: "NOT_FOUND" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Return only safe public-facing fields — no internal notes, cost margins, or employee data
    return new Response(JSON.stringify({
      id: data.id,
      invoice_number: data.invoice_number,
      total: data.total,
      balance_due: data.balance_due,
      status: data.status,
      deposit_required: data.deposit_required,
      deposit_amount: data.deposit_amount,
      deposit_paid: data.deposit_paid,
      customer_name: (data as any).platform_customers?.display_name || "Customer",
      business_name: (data as any).businesses?.public_brand_name || "",
      shortcode: invoiceShortcode,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: true, message: "Invalid request", code: "VALIDATION_ERROR" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
