# Runbook: Resend Email Failures

## Symptoms
- `email_send_log.status` = `dlq`, `failed`, or `bounced` for many recent rows
- Customers reporting missing quote/invoice emails
- `system_health_checks.resend.status` = `warn` / `fail`

## Likely causes
1. DNS for sender subdomain not verified (most common after domain changes)
2. Recipient on `suppressed_emails` (prior bounce/unsubscribe)
3. `SENDER_DOMAIN` constant in `send-transactional-email` set to root domain instead of verified subdomain
4. Service role key rotated → vault secret stale
5. pgmq `process-email-queue` cron not running on Live (publish flow issue)

## Where to check
- Cloud → Emails → Manage Domains (verification status)
- Edge logs: `send-transactional-email`, `process-email-queue`, `auth-email-hook`
- Tables: `email_send_log` (dedupe by `message_id`, latest status), `suppressed_emails`
- `SELECT * FROM cron.job WHERE jobname='process-email-queue'`

## Edge functions involved
- `send-transactional-email`, `process-email-queue`, `auth-email-hook`

## Safe retry
1. Re-enqueue failed messages from `/platform/comms?tab=email-failed` → **Retry**
2. For domain issues: Cloud → Emails → **Verify Domain**
3. For prod cron missing: re-publish the project (provisions cron + vault secret)

## Escalate
- Bounce rate > 5% sustained → review template content, check for spammy phrasing
- Suppressed list growing rapidly → audit which template is triggering bounces

## Rollback
- For a bad template that went out: clear the queue (`SELECT pgmq.purge_queue('transactional_emails')`) before fixing the template, then redeploy
