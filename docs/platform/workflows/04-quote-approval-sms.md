# Quote Approval SMS Flow

How a customer goes from "quote sent" to "I approved it".

## Outbound (sending the quote)

1. Owner clicks **Send** in `/platform/quotes/:id`
2. Frontend calls edge function `send-quote` with `{ quoteId }`
3. `send-quote`:
   - Generates HMAC token: `sign(quoteId, SUPABASE_SERVICE_ROLE_KEY)`
   - Builds public link `https://<host>/q/<quoteId>?t=<token>`
   - Calls `send-sms` (SimpleTexting) with the link
   - Optionally calls `send-transactional-email` with the same link
   - Updates `platform_quotes.sent_at`, `status = 'sent'`
   - Inserts `audit_logs` row `quote.sent`

## Inbound (customer approves)

1. Customer opens link → `/q/:id` page calls `get-quote-public` (validates UUID + optional shortcode/HMAC)
2. Customer clicks **Approve** → frontend calls `approve-quote` with `{ quoteId, token, signature }`
3. `approve-quote`:
   - Verifies HMAC using constant-time compare
   - Updates `accepted_at`, `approved_at`, `status = 'approved'`
   - Trigger `notify_quote_approved` writes `platform_notifications`
   - Sends internal SMS to owner via `send-sms`
   - Logs `audit_logs` row `quote.approved`

## Where to look when it breaks

| Symptom | Check |
|---|---|
| Customer never received SMS | `sms_messages` (status=failed?), `send-sms` edge logs |
| Approval click does nothing | Browser console, `approve-quote` edge logs (HMAC mismatch?) |
| Owner not notified | `platform_notifications`, `notify_quote_approved` trigger fired? |
