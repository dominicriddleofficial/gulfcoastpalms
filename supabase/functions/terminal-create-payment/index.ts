import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[TERMINAL-CREATE-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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

    // Validate auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Authorization required");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) throw new Error("Invalid authorization");

    const { business_id, invoice_id, amount: clientAmount, customer_id } = await req.json();
    if (!business_id) throw new Error("business_id is required");

    // Verify business access
    const { data: hasAccess } = await supabaseAdmin.rpc("has_business_access", {
      _user_id: user.id,
      _business_id: business_id,
    });
    if (!hasAccess) throw new Error("Access denied to this business");

    // If invoice_id is provided, validate it
    let invoiceData = null;
    if (invoice_id) {
      const { data: inv, error: invErr } = await supabaseAdmin
        .from("platform_invoices")
        .select("*, businesses(shortcode, public_brand_name)")
        .eq("id", invoice_id)
        .eq("business_id", business_id)
        .single();

      if (invErr || !inv) throw new Error("Invoice not found or does not belong to this business");
      if (["paid", "void"].includes(inv.status)) throw new Error(`Invoice is ${inv.status}`);
      invoiceData = inv;
    }

    // SECURITY: When invoice is linked, ALWAYS use server-side authoritative amount
    // (deposit_amount if deposit owed, else balance_due). Never trust client amount on linked invoices.
    let amount: number;
    const isDeposit = invoiceData?.deposit_required && !invoiceData?.deposit_paid;
    if (invoiceData) {
      amount = isDeposit
        ? Number(invoiceData.deposit_amount ?? 0)
        : Number(invoiceData.balance_due ?? 0);
      if (!amount || amount <= 0) throw new Error("Invoice has no balance due");
    } else {
      // Free-form charge — validate client-supplied amount with reasonable cap
      const parsed = Number(clientAmount);
      if (!parsed || parsed <= 0) throw new Error("Valid amount is required");
      if (parsed > 100000) throw new Error("Amount exceeds maximum allowed");
      amount = parsed;
    }

    log("Creating terminal payment intent", { business_id, invoice_id, amount });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create a PaymentIntent for terminal collection
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      payment_method_types: ["card_present"],
      capture_method: "automatic",
      metadata: {
        business_id,
        invoice_id: invoice_id || "",
        customer_id: customer_id || "",
        invoice_number: invoiceData?.invoice_number || "",
        payment_type: isDeposit ? "deposit" : "balance",
        source: "tap_to_pay",
        collected_by_user_id: user.id,
        platform_environment: "production",
      },
    });

    // Record payment intent in our system
    const { data: piRecord } = await supabaseAdmin.from("payment_intents").insert({
      business_id,
      invoice_id: invoice_id || null,
      customer_id: customer_id || null,
      amount,
      currency: "usd",
      source: "tap_to_pay",
      status: "pending",
      provider_payment_intent_id: paymentIntent.id,
      payment_method_type: "card_present",
      metadata_json: paymentIntent.metadata,
    }).select("id").single();

    // Record tap to pay transaction
    await supabaseAdmin.from("tap_to_pay_transactions").insert({
      business_id,
      invoice_id: invoice_id || null,
      customer_id: customer_id || null,
      payment_intent_id: piRecord?.id || null,
      amount,
      currency: "usd",
      status: "pending",
      operator_user_id: user.id,
      device_metadata: { source: "tap_to_pay", created_at: new Date().toISOString() },
    });

    log("Terminal payment intent created", { paymentIntentId: paymentIntent.id });

    return new Response(JSON.stringify({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    log("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
