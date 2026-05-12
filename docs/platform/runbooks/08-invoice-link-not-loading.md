# Runbook: Invoice Link Not Loading

## Symptoms
- `/i/<id>?s=<shortcode>` returns 404 or blank

## Likely causes
1. Shortcode in URL doesn't match `businesses.shortcode` for that invoice's business
2. Invoice deleted or voided
3. `get-invoice-public` deploy broken
4. Stripe Checkout link expired (separate from page load)

## Where to check
- Edge logs: `get-invoice-public`
- Tables: `platform_invoices`, `businesses`

## Edge functions involved
- `get-invoice-public`, `send-invoice-email`, `stripe-webhook`

## Safe retry
1. Owner: `/platform/invoices/:id` → **Resend** (regenerates link with correct shortcode)
2. If Stripe link expired, owner re-sends the invoice email which creates a fresh Checkout Session

## Escalate
- All invoices in a business return 404 → check that `businesses.shortcode` is set and matches what `send-invoice-email` writes into the link

## Rollback
- Redeploy previous `get-invoice-public` from edge function history
