# Runbook: SimpleTexting Down

## Symptoms
- Bulk SMS failures across multiple businesses
- `system_health_checks.simpletexting.status='fail'`
- `sms_messages.status='failed'` rate spikes in dashboard

## Likely causes
1. SimpleTexting API outage (most common)
2. API key rotated/revoked
3. Account suspended or out of credit

## Where to check
- SimpleTexting status: https://status.simpletexting.com/
- Edge logs: `send-sms`, `process-sms-queue`
- Tables: `sms_messages` (last hour, `status='failed'`)

## Edge functions involved
- `send-sms`, `process-sms-queue`, `system-health-probe`

## Safe retry
1. Outbound SMS continues to enqueue in `sms_queue`; `process-sms-queue` retries automatically with backoff
2. Once SimpleTexting is healthy, queued items drain on the next cron tick
3. To force a drain: `/platform/backend-health` → **Process SMS queue**

## Escalate
- > 30 min outage → notify on-call, post status banner on Comms page
- If API key issue → rotate `SIMPLETEXTING_API_KEY` in Cloud → Secrets

## Rollback
None. SMS is fire-and-forget; failed sends remain in `sms_messages` for audit.
