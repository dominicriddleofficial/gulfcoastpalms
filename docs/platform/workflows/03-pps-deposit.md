# PPS Deposit & Payment Schedule Flow

Prestige Property Services uses **deposit + final balance** scheduling.

## Behavior

- `deposit_required_flag = true` on PPS quotes by default
- `deposit_type` = `percentage` (default 50%) or `flat`
- `deposit_amount_calculated` is computed at quote build time
- On approval, `approve-quote` triggers `create-deposit-checkout` which creates a Stripe Checkout Session for the deposit amount only
- When the deposit is paid, `stripe-webhook` writes a `platform_payments` row with `payment_kind = 'deposit'` and sets `platform_invoices.deposit_paid = true`
- After visit completion, the **balance invoice** is generated for `total - deposit_amount`
- Final payment via Stripe → `payment_kind = 'final'` → invoice `status = 'paid'`

## Audit

- `platform_payments.payment_kind` distinguishes deposit vs final
- `platform_invoices.deposit_paid`, `amount_paid`, `balance_due`

## Edge cases

- Deposit refund: handled manually in Stripe; `stripe-webhook` records the `charge.refunded` event but does **not** auto-revert the job
- If a customer pays the full amount via the deposit link, the surplus appears as `amount_paid > total` and reconciliation surfaces it
