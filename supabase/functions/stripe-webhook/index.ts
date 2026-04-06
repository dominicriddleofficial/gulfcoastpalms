import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const log = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey) {
    log("ERROR: STRIPE_SECRET_KEY not set");
    return new Response("Server configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const body = await req.text();
  let event: Stripe.Event;

  // Verify signature if webhook secret is set
  if (webhookSecret) {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      log("ERROR: Missing stripe-signature header");
      return new Response("Missing signature", { status: 400 });
    }
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      log("ERROR: Signature verification failed", { message: err.message });
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }
  } else {
    log("WARNING: No STRIPE_WEBHOOK_SECRET set, skipping signature verification");
    event = JSON.parse(body);
  }

  log("Event received", { type: event.type, id: event.id });

  // Check for duplicate
  const { data: existing } = await supabaseAdmin
    .from("payment_webhook_events")
    .select("id")
    .eq("event_id", event.id)
    .eq("processed", true)
    .limit(1);

  if (existing && existing.length > 0) {
    log("Duplicate event, skipping", { eventId: event.id });
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  // Log the webhook event
  const metadata = (event.data.object as any)?.metadata || {};
  const businessId = metadata.business_id || null;

  await supabaseAdmin.from("payment_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    provider: "stripe",
    business_id: businessId,
    payload_json: event.data.object,
    processed: false,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};
        log("Checkout completed", meta);

        if (!meta.invoice_id || !meta.business_id) {
          log("Missing metadata, skipping reconciliation");
          break;
        }

        const amountPaid = (session.amount_total || 0) / 100;
        const isDeposit = meta.payment_type === "deposit";

        // Generate payment number
        const { data: paymentNumber } = await supabaseAdmin.rpc("generate_next_number", {
          _business_id: meta.business_id,
          _record_type: "payment",
        });

        // Create payment record
        await supabaseAdmin.from("platform_payments").insert({
          business_id: meta.business_id,
          payment_number: paymentNumber || `PAY-${Date.now()}`,
          invoice_id: meta.invoice_id,
          customer_id: meta.customer_id || null,
          amount: amountPaid,
          method: "card",
          reference_number: session.payment_intent as string || session.id,
          status: "completed",
          payment_date: new Date().toISOString().split("T")[0],
          is_deposit: isDeposit,
          is_refund: false,
          notes: `Stripe checkout ${session.id}`,
        });

        // Update invoice
        const { data: invoice } = await supabaseAdmin
          .from("platform_invoices")
          .select("total, amount_paid, deposit_amount, deposit_required")
          .eq("id", meta.invoice_id)
          .single();

        if (invoice) {
          const newAmountPaid = (Number(invoice.amount_paid) || 0) + amountPaid;
          const total = Number(invoice.total) || 0;
          const newBalance = Math.max(0, total - newAmountPaid);
          const isPaidInFull = newBalance <= 0.01;

          const updateData: any = {
            amount_paid: newAmountPaid,
            balance_due: newBalance,
            status: isPaidInFull ? "paid" : "partial",
          };

          if (isPaidInFull) updateData.paid_at = new Date().toISOString();
          if (isDeposit) updateData.deposit_paid = true;

          await supabaseAdmin
            .from("platform_invoices")
            .update(updateData)
            .eq("id", meta.invoice_id);

          log("Invoice updated", { invoiceId: meta.invoice_id, newBalance, status: updateData.status });
        }

        // Update payment intent record
        await supabaseAdmin
          .from("payment_intents")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("provider_session_id", session.id);

        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        log("Payment failed", { paymentIntentId: pi.id });
        await supabaseAdmin
          .from("payment_intents")
          .update({ status: "failed" })
          .eq("provider_payment_intent_id", pi.id);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const refundAmount = (charge.amount_refunded || 0) / 100;
        log("Refund received", { chargeId: charge.id, amount: refundAmount });
        // Future: create refund payment record and update invoice
        break;
      }

      default:
        log("Unhandled event type", { type: event.type });
    }

    // Mark as processed
    await supabaseAdmin
      .from("payment_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("event_id", event.id);

  } catch (err) {
    log("ERROR processing event", { message: err.message });
    await supabaseAdmin
      .from("payment_webhook_events")
      .update({ error_message: err.message })
      .eq("event_id", event.id);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
