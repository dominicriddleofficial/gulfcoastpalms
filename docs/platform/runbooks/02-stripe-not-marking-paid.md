# Runbook: Stripe Payment Not Marking Invoice Paid

## Symptoms
- Customer says they paid; Stripe Dashboard shows succeeded charge
- `/platform/invoices/:id` still shows `status='sent'` and non-zero `balance_due`

## Likely causes
1. `stripe-webhook` not receiving events (endpoint disabled in Stripe)
2. `STRIPE_WEBHOOK_SECRET` mismatched after rotation
3. Webhook delivered but `metadata.invoice_id` missing on Checkout Session
4. Webhook processed but currency/amount mismatch (rare)
5. Race condition: payment arrived before invoice row existed (unlikely)

## Where to check
- Edge logs: `stripe-webhook`
- Tables: `payment_webhook_events` (filter `processed=false` or `error_message IS NOT NULL`), `platform_payments`, `platform_invoices`
- Stripe Dashboard → Developers → Webhooks → recent deliveries

## Edge functions involved
- `stripe-webhook`, `send-invoice-email`, `create-deposit-checkout`

## Safe retry
1. Stripe Dashboard → resend the failed webhook delivery
2. Or: owner can manually mark paid in `/platform/invoices/:id` → **Record payment** (writes `platform_payments` and audits)
3. `/platform/reconciliation` has a "relink Stripe payment" action for orphans

## Escalate
- More than 3 webhook deliveries with `error_message` → check `STRIPE_WEBHOOK_SECRET`, redeploy `stripe-webhook`

## Rollback
- If a payment was wrongly applied: insert a negative `platform_payments` row (manual, owner-only) and re-open the invoice. Do **not** delete payment rows.
