import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { invoice_id, origin_url } = body;

    // Server-side validation
    if (!invoice_id || typeof invoice_id !== "string") {
      return new Response(JSON.stringify({ error: true, message: "invoice_id is required", code: "VALIDATION_ERROR" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // UUID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invoice_id)) {
      return new Response(JSON.stringify({ error: true, message: "Invalid invoice_id format", code: "VALIDATION_ERROR" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Request received", { invoice_id });

    // Fetch invoice with customer and business info — ALWAYS use server-side amount
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("platform_invoices")
      .select("*, platform_customers(display_name, email, phone), businesses(shortcode, public_brand_name)")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) throw new Error(`Invoice not found: ${invErr?.message}`);
    if (["paid", "void"].includes(invoice.status)) throw new Error(`Invoice is ${invoice.status}`);

    // Always use server-fetched amount, never client-supplied
    const balanceDue = Number(invoice.balance_due) || Number(invoice.total) || 0;
    if (balanceDue <= 0) throw new Error("No balance due on this invoice");

    const businessName = invoice.businesses?.public_brand_name || "Payment";
    const shortcode = invoice.businesses?.shortcode || "PAY";
    const customerEmail = invoice.platform_customers?.email || undefined;
    const customerName = invoice.platform_customers?.display_name || "Customer";

    // Validate shortcode format
    if (shortcode && !/^[A-Z0-9]{2,10}$/i.test(shortcode)) {
      throw new Error("Invalid business shortcode");
    }

    log("Creating checkout session", {
      business: businessName,
      invoiceNumber: invoice.invoice_number,
      amount: balanceDue,
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const baseUrl = origin_url || "https://gulfcoastpalms.lovable.app";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${businessName} - Invoice ${invoice.invoice_number}`,
              description: `Payment for ${customerName}`,
            },
            unit_amount: Math.round(balanceDue * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        business_id: invoice.business_id,
        invoice_id: invoice.id,
        customer_id: invoice.customer_id || "",
        invoice_number: invoice.invoice_number,
        shortcode: shortcode,
        payment_type: invoice.deposit_required && !invoice.deposit_paid ? "deposit" : "balance",
        platform_environment: "production",
      },
      success_url: `${baseUrl}/pay/${shortcode.toLowerCase()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pay/${shortcode.toLowerCase()}/${invoice.id}?cancelled=true`,
    });

    log("Checkout session created", { sessionId: session.id });

    // Record payment intent
    await supabaseAdmin.from("payment_intents").insert({
      business_id: invoice.business_id,
      invoice_id: invoice.id,
      customer_id: invoice.customer_id,
      amount: balanceDue,
      currency: "usd",
      source: "checkout",
      status: "pending",
      provider_session_id: session.id,
      payment_method_type: "card",
      metadata_json: session.metadata,
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    log("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: true, message: error.message, code: "SERVER_ERROR" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
