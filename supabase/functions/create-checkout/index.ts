import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGINS = [
  "https://gulfcoastpalmservices.com",
  "https://www.gulfcoastpalmservices.com",
  "https://gulfcoastpalms.lovable.app",
  "https://id-preview--2e9a44f0-ac4c-4ebd-ad4f-dd591d732484.lovable.app",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const log = (step: string, details?: any) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

async function checkRateLimit(supabase: any, identifier: string, endpoint: string, maxRequests: number, windowMinutes: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  await supabase.from("rate_limit_counters").delete().lt("window_start", cutoff).eq("endpoint", endpoint);

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("rate_limit_counters")
    .select("request_count, id")
    .eq("identifier", identifier)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart)
    .maybeSingle();

  if (data && data.request_count >= maxRequests) return false;

  if (data) {
    await supabase.from("rate_limit_counters").update({ request_count: data.request_count + 1 }).eq("id", data.id);
  } else {
    await supabase.from("rate_limit_counters").insert({ identifier, endpoint, request_count: 1, window_start: new Date().toISOString() });
  }
  return true;
}

/**
 * Auto-create a deposit invoice from an approved/sent quote.
 * Returns the invoice ID, ready to be checked out.
 */
async function createInvoiceFromQuote(supabaseAdmin: any, quoteId: string): Promise<string> {
  // Pull quote with line items + customer + business
  const { data: quote, error: qErr } = await supabaseAdmin
    .from("platform_quotes")
    .select("*, platform_customers(id, display_name, email, phone), businesses(id, shortcode)")
    .eq("id", quoteId)
    .single();

  if (qErr || !quote) throw new Error(`Quote not found: ${qErr?.message}`);

  // If a deposit invoice already exists for this quote, reuse it
  const { data: existing } = await supabaseAdmin
    .from("platform_invoices")
    .select("id, status")
    .eq("quote_id", quoteId)
    .eq("deposit_required", true)
    .not("status", "in", "(paid,void)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    log("Reusing existing deposit invoice", { invoice_id: existing.id });
    return existing.id;
  }

  const grandTotal = Number(quote.total) || 0;
  if (grandTotal <= 0) throw new Error("Quote has no total amount");

  // 20% deposit (matches the milestone ladder shown in ViewQuote.tsx)
  const depositAmount = Number((grandTotal * 0.2).toFixed(2));

  // Generate invoice number
  const { data: numData, error: numErr } = await supabaseAdmin.rpc("generate_next_number", {
    _business_id: quote.business_id,
    _record_type: "invoice",
  });
  if (numErr || !numData) throw new Error(`Failed to generate invoice number: ${numErr?.message}`);

  const invoiceNumber = numData as string;

  // Create the deposit invoice
  const { data: newInvoice, error: insErr } = await supabaseAdmin
    .from("platform_invoices")
    .insert({
      business_id: quote.business_id,
      customer_id: quote.customer_id,
      quote_id: quote.id,
      invoice_number: invoiceNumber,
      status: "sent",
      issue_date: new Date().toISOString().split("T")[0],
      subtotal: depositAmount,
      tax_total: 0,
      tax_rate: 0,
      total: depositAmount,
      balance_due: depositAmount,
      amount_paid: 0,
      deposit_required: true,
      deposit_amount: depositAmount,
      deposit_paid: false,
      public_notes: `Deposit (20%) for quote ${quote.quote_number}`,
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insErr || !newInvoice) throw new Error(`Failed to create deposit invoice: ${insErr?.message}`);

  // Add a single line item
  await supabaseAdmin.from("platform_invoice_line_items").insert({
    business_id: quote.business_id,
    invoice_id: newInvoice.id,
    description: `Deposit (20%) — Quote ${quote.quote_number}`,
    quantity: 1,
    unit_price: depositAmount,
    line_total: depositAmount,
    sort_order: 0,
    taxable_flag: false,
  });

  log("Created deposit invoice from quote", { invoice_id: newInvoice.id, amount: depositAmount });
  return newInvoice.id;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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
    let { invoice_id, quote_id, origin_url } = body;

    // ── Quote-based checkout: create deposit invoice on the fly ──
    if (!invoice_id && quote_id) {
      if (typeof quote_id !== "string" || !UUID_RE.test(quote_id)) {
        return new Response(JSON.stringify({ error: true, message: "Invalid quote_id format", code: "VALIDATION_ERROR" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Rate-limit by quote
      const allowed = await checkRateLimit(supabaseAdmin, quote_id, "create-checkout-quote", 5, 60);
      if (!allowed) {
        return new Response(JSON.stringify({ error: true, message: "Too many payment attempts. Please wait before trying again.", code: "RATE_LIMITED" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      invoice_id = await createInvoiceFromQuote(supabaseAdmin, quote_id);
    }

    // Server-side validation
    if (!invoice_id || typeof invoice_id !== "string" || !UUID_RE.test(invoice_id)) {
      return new Response(JSON.stringify({ error: true, message: "Invalid invoice_id format", code: "VALIDATION_ERROR" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit by invoice_id — max 5 checkout sessions per invoice per hour
    const allowed = await checkRateLimit(supabaseAdmin, invoice_id, "create-checkout", 5, 60);
    if (!allowed) {
      return new Response(JSON.stringify({ error: true, message: "Too many payment attempts. Please wait before trying again.", code: "RATE_LIMITED" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Request received", { invoice_id, from_quote: !!quote_id });

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
        quote_id: invoice.quote_id || quote_id || "",
        platform_environment: "production",
      },
      success_url: `${baseUrl}/pay/${shortcode.toLowerCase()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pay/${shortcode.toLowerCase()}/${invoice.id}?cancelled=true`,
    });

    log("Checkout session created", { sessionId: session.id });

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

    return new Response(JSON.stringify({ url: session.url, session_id: session.id, invoice_id: invoice.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    log("ERROR", { message: (error as Error).message });
    return new Response(JSON.stringify({ error: true, message: (error as Error).message || "Payment processing failed. Please try again.", code: "SERVER_ERROR" }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 400,
    });
  }
});
