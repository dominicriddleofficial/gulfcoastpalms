# GCP No-Deposit Quote Flow

Gulf Coast Palms quotes are **billed on completion** — no deposit is collected.

## Behavior

- `platform_quotes.deposit_required_flag = false` (default for GCP)
- `deposit_amount_calculated = 0`
- Public quote page does not render the "Pay deposit" CTA
- `approve-quote` sets `status = 'approved'`; **no Stripe Payment Intent is created**
- After job completion, an invoice is sent for the **full balance**
- Customer pays via Stripe Checkout link in the invoice email/SMS

## Validation rules

- If a GCP quote is saved with `deposit_required_flag = true`, the form blocks submission with "GCP quotes do not collect deposits — switch to PPS or remove deposit."
- `send-quote` rejects payloads that mix `business.shortcode = 'GCP'` with non-zero deposit.

## When this is wrong

If a GCP quote shows a deposit on the public page, check:
- `platform_quotes.deposit_required_flag` — should be `false`
- `business_id` matches the GCP business row
