# Runbook: Quote Approval SMS Not Sending

## Symptoms
- Owner clicks **Send Quote**, gets a success toast, but customer reports no SMS
- Or: customer approved but no internal SMS arrived for the owner

## Likely causes
1. SimpleTexting API key invalid/rotated
2. Customer phone in `sms_opt_outs`
3. Customer phone not E.164 formatted
4. Quiet hours blocking send (`sms_quiet_hours`)
5. `send-sms` rate limit (20/hr/IP) tripped by an automation loop
6. SimpleTexting account out of credit

## Where to check
- Edge logs: `send-sms`, `send-quote`
- Tables: `sms_messages` (status, error_message), `sms_queue`, `sms_opt_outs`, `system_health_checks` where `check_name='simpletexting'`
- `audit_logs` for `quote.sent`

## Edge functions involved
- `send-quote`, `send-sms`, `process-sms-queue`, `system-health-probe`

## Safe retry
1. Owner: `/platform/quotes/:id` → **Resend SMS** (uses fresh `client_mutation_id`)
2. If still failing, manually call `process-sms-queue` from `/platform/backend-health`

## Escalate
- `system_health_checks.simpletexting.status='fail'` for > 15 min → check SimpleTexting status page, rotate `SIMPLETEXTING_API_KEY` secret if revoked

## Rollback
None required — SMS is fire-and-forget. If a wrong message went out, document in `audit_logs` and follow up via call.
