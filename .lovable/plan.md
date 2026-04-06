
## Phase A: Schema & Backend (Migration)
1. **Payment infrastructure tables**: `payment_provider_accounts`, `payment_intents`, `tap_to_pay_transactions`, `payment_webhook_events`
2. **Source tracking columns**: Add `source_system`, `source_record_id`, `source_last_synced_at` to key platform tables that lack them
3. **Sync log table**: `sync_logs` for Jobber import diagnostics

## Phase B: Stripe Integration
1. Enable Stripe via the Stripe tool
2. Create `create-checkout` edge function for invoice payment links
3. Create `stripe-webhook` edge function for payment status updates
4. Create customer-facing payment page route `/pay/:businessShortcode/:invoiceId`

## Phase C: Replace All Placeholders with Real Pages
1. **Analytics page** — live queries for revenue trends, lead sources, quote conversion, jobs by status
2. **Tasks page** — create/list tasks linked to leads/jobs/invoices with status and due dates
3. **Comms page** — communication timeline/log with manual entry support
4. **Settings page** — business settings, numbering, integrations panel, Jobber sync diagnostics, payment config
5. **Remove "Phase 2+"** from PlatformModule.tsx
6. **Remove "Coming Soon"** from Dashboard section cards — replace with live Recent Activity and pipeline data
7. **Remove "Phase 3+"** from Customer detail — wire real quote/job/invoice counts

## Phase D: Dashboard Live Data
1. Replace static "Coming Soon" sections with real queries
2. Business comparison cards with per-business metrics
3. Recent activity timeline from actual records

## Phase E: Quote Detail Cleanup
1. Remove "(Phase 4)" label from convert-to-job button (it already works)

## Deferred (separate message):
- Full Jobber sync improvements (edge function work)
- Prestige lead normalization (data insertion)
