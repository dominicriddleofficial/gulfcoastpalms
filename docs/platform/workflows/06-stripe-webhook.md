# Invoice / Payment / Stripe Webhook Flow

## Outbound: sending an invoice

1. Owner clicks **Send** on `/platform/invoices/:id`
2. Edge function `send-invoice-email` enqueues an email with a Stripe Checkout link
3. `platform_invoices.sent_at`, `status = 'sent'`
4. Customer clicks link → Stripe-hosted Checkout

## Inbound: Stripe webhook

`stripe-webhook` (verify_jwt = false; signed by Stripe) handles:

| Stripe event | Action |
|---|---|
| `checkout.session.completed` | Look up `metadata.invoice_id` → insert `platform_payments` → recalc `amount_paid`, `balance_due` → if 0, set `status='paid'`, `paid_at=now()` |
| `payment_intent.payment_failed` | Insert `platform_comm_logs` failure note |
| `charge.refunded` | Insert `platform_payments` row with negative amount; **does not** auto-void invoice |

## Idempotency

- `payment_webhook_events.event_id` UNIQUE — duplicate Stripe deliveries are no-ops
- `platform_payments.stripe_payment_intent_id` UNIQUE
- Failed processing leaves `processed = false` and `error_message` set

## Triggers

- `notify_invoice_paid` (AFTER UPDATE) writes a `payment_received` notification

## Where to look

- `payment_webhook_events` — every Stripe delivery, processed flag
- `platform_payments` — actual money rows
- `audit_logs` for `invoice.paid` events
