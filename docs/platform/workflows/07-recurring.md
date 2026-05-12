# Recurring Service Generation

Recurring jobs (maintenance plans, monthly cleanings, etc.) auto-generate visits.

## Setup

- `platform_jobs.job_type = 'recurring'`
- `recurring_pattern` JSONB: `{ frequency: 'weekly'|'biweekly'|'monthly'|'quarterly', day_of_week, day_of_month, end_date }`

## Generator

Cron `process-recurring-services` runs hourly:

1. Selects active recurring jobs whose next scheduled date is within the look-ahead window (default 60 days)
2. For each, computes the next visit date from `recurring_pattern` and the most recent `platform_job_visits` row
3. Inserts new `platform_job_visits` rows up to the look-ahead boundary
4. Copies the assigned crew from the previous visit
5. Records `audit_logs` row `recurring.visit_generated`

## Termination

- Stops when `recurring_pattern.end_date` reached, OR
- When `platform_jobs.status = 'completed'` or `'cancelled'`

## Reliability

- `system_health_checks.recurring_processor` flips to `fail` if the cron has not run in > 90 minutes
- Reconciliation flags recurring jobs with no upcoming visits as a finding
