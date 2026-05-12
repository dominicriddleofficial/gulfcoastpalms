# End-to-End: Lead → Payment → Review

The canonical happy path across both businesses (GCP & PPS).

## Stages

1. **Lead** — `platform_leads` row created via public intake form, manual entry, or external sync. Trigger `notify_new_lead` writes a `new_lead` row to `platform_notifications`.
2. **Quote** — Owner/manager creates a `platform_quotes` row (status `draft`). Line items live in `platform_quote_line_items`. Sending sets `sent_at` and `status = 'sent'`. The `send-quote` edge function delivers SMS/email with a public link `/q/<id>`.
3. **Approval** — Customer opens the public quote (`get-quote-public`), reviews, and approves. `approve-quote` (HMAC-protected) sets `accepted_at`, `approved_at`, `status = 'approved'`. Trigger `notify_quote_approved` posts an internal notification.
4. **Job** — Owner converts the approved quote to a `platform_jobs` row (carries `quote_id`). Recurring jobs set `job_type = 'recurring'`.
5. **Schedule** — `platform_job_visits` rows are generated (one for one-time, many for recurring). `platform_visit_assignments` links visits to crew members.
6. **Visit lifecycle** — Crew updates status: `scheduled → on_my_way → in_progress → completed`. See [Visit Lifecycle](./05-visit-lifecycle.md).
7. **Invoice** — `platform_invoices` row generated from the job. Status flows `draft → sent → viewed → paid` (or `overdue`, `void`).
8. **Payment** — Either Stripe (`stripe-webhook` writes `platform_payments` and updates invoice) or manual entry. Trigger `notify_invoice_paid` posts notification.
9. **Review** — `process-review-queue` cron sends a review-request SMS ~2 hours after `completed_at`.

## Owner audit points

- `audit_logs` for any state change
- `timeline_events` per entity (lead/quote/job/invoice)
- `email_send_log` and `sms_messages` for outbound comms
- `/platform/reconciliation` flags broken links between stages
