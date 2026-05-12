# Jobber Sync Behavior

Read-only mirror of Jobber data into `jobber_*` tables for reporting and the legacy schedule view.

## Architecture

- OAuth tokens stored in `jobber_tokens` (single row per workspace)
- Cron `run_jobber_auto_sync` (every 30 min) calls edge function `jobber-sync` per business
- `jobber-sync` paginates GraphQL endpoints, upserts into `jobber_jobs`, `jobber_clients`, `jobber_visits`, `jobber_invoices`
- Each batch writes a `sync_logs` row with `sync_type='jobber'`, `status='success'|'error'`
- `system_health_checks.jobber_sync` reflects the last result

## Disabling per business

`sync_schedules` row with `(business_id, schedule_type='jobber', enabled=false)` skips that business in the cron.

## Manual run

Owner can trigger from `/platform/backend-health` → "Run Jobber sync now".

## Stale detection

- Dashboard banner if `sync_schedules.last_run_at` is > 2 hours old
- Reconciliation flags Jobber jobs missing from `platform_jobs` for the same customer
