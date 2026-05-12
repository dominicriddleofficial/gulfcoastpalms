# Runbook: Jobber Sync Stale

## Symptoms
- Dashboard "Last synced" > 2 hours
- `system_health_checks.jobber_sync.status='warn'` or `'fail'`
- New Jobber jobs not appearing in `/platform/schedule`

## Likely causes
1. `jobber_tokens` expired (refresh failed)
2. Jobber API rate limit (429)
3. GraphQL schema change broke the query
4. Cron `run_jobber_auto_sync` disabled or pg_cron unhealthy

## Where to check
- Edge logs: `jobber-sync`, `jobber-oauth-callback`
- Tables: `sync_logs` (latest 20 with `sync_type='jobber'`), `jobber_tokens`, `sync_schedules`
- pg_cron: `SELECT * FROM cron.job WHERE jobname LIKE '%jobber%'`

## Edge functions involved
- `jobber-sync`, `jobber-oauth-callback`

## Safe retry
1. `/platform/backend-health` → **Run Jobber sync now**
2. If token expired: `/platform/settings/integrations/jobber` → **Reconnect** (re-OAuths)

## Escalate
- 3 consecutive `sync_logs.status='error'` → check Jobber developer status, inspect `error_message`
- If GraphQL schema changed → patch `jobber-sync/index.ts`, redeploy

## Rollback
- `jobber_*` tables are read mirrors — safe to truncate the affected table and let the next sync rebuild
- Do **not** touch `platform_*` tables; they hold authoritative data
