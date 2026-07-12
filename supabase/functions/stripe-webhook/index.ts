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
  if (!webhookSecret) {
    log("ERROR: STRIPE_WEBHOOK_SECRET not set — refusing to process events");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const body = await req.text();
  let event: Stripe.Event;

  // Verify signature — STRIPE_WEBHOOK_SECRET is required (checked above).
  // Never fall back to unsigned JSON.parse: that would allow attackers to
  // forge checkout.session.completed events and flip invoices to paid.
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    log("ERROR: Missing stripe-signature header");
    return new Response("Missing signature", { status: 400 });
  }
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    log("ERROR: Signature verification failed", { message: (err as Error).message });
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  log("Event received", { type: event.type, id: event.id });

  const metadata = (event.data.object as any)?.metadata || {};
  const businessId = metadata.business_id || null;

  // ─── IDEMPOTENCY GATE ──────────────────────────────────────────────
  // Insert into stripe_events FIRST, in its own transaction, before any
  // business logic. Stripe's event.id is the primary key, so a duplicate
  // delivery hits a unique-violation (23505) and we short-circuit with 200
  // so Stripe stops retrying. This MUST happen before invoice/payment writes.
  const { error: dedupeError } = await supabaseAdmin
    .from("stripe_events")
    .insert({
      id: event.id,
      event_type: event.type,
      business_id: businessId,
      payload: event as any,
      livemode: event.livemode ?? false,
      processing_status: "processing",
    });

  if (dedupeError) {
    // 23505 = unique_violation → already processed (or in flight)
    if ((dedupeError as any).code === "23505") {
      log("Duplicate event, skipping", { eventId: event.id });
      return new Response(
        JSON.stringify({ received: true, duplicate: true }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }
    // Any other error: log and continue. We still want to process the event,
    // but flag it so we know the dedupe row is in a weird state.
    log("WARNING: stripe_events insert failed, continuing", {
      code: (dedupeError as any).code,
      message: dedupeError.message,
    });
  }

  // Legacy mirror (kept so existing payment_webhook_events admin views still work)
  await supabaseAdmin.from("payment_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    provider: "stripe",
    business_id: businessId,
    payload_json: event.data.object,
    processed: false,
  });

  let relatedEntityType: string | null = null;
  let relatedEntityId: string | null = null;

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
        relatedEntityType = "invoice";
        relatedEntityId = meta.invoice_id;

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

    // Mark stripe_events success
    await supabaseAdmin
      .from("stripe_events")
      .update({
        processing_status: "success",
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
      })
      .eq("id", event.id);

  } catch (err) {
    log("ERROR processing event", { message: err.message });
    await supabaseAdmin
      .from("payment_webhook_events")
      .update({ error_message: err.message })
      .eq("event_id", event.id);
    await supabaseAdmin
      .from("stripe_events")
      .update({ processing_status: "failed", error_message: err.message })
      .eq("id", event.id);
    // Re-throw via 500 so Stripe retries; the dedupe row stays so we can
    // inspect it, and the next retry will land in the duplicate path above
    // unless someone manually flips processing_status back to allow replay.
    return new Response(
      JSON.stringify({ received: false, error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
