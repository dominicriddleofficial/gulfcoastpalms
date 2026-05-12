# Runbook: Production Rollback

Use when a deploy has caused a measurable regression (errors, broken flow, security finding).

## Decision tree

| Layer | Symptom | Action |
|---|---|---|
| Frontend only | Visual bug, broken page, JS error | Revert in Lovable chat history → re-publish |
| Edge function only | One function returning 500 | Redeploy previous version from edge function history |
| Database migration | Schema/RLS regression | New migration that reverses the change (never edit historical migrations) |
| Combined | Multi-layer regression | Frontend revert first, then edge revert, then migration |

## Frontend rollback

1. Open the chat history; click **Revert** on the last known-good message
2. Re-publish from `/` → **Publish**
3. Verify CDN serves new build (hard reload, check `<meta name="build-id">` or asset hashes)

## Edge function rollback

1. Identify the function: `supabase--edge_function_logs` to confirm regression
2. In the Supabase functions list, redeploy the prior code from this repo's git history (use `git log supabase/functions/<name>/` to find the commit)
3. Confirm with a `curl` test against the function URL

## Database rollback

1. Never `git revert` an old migration file — it stays as historical truth
2. Create a NEW migration that performs the reverse change (e.g. drops a column, recreates a policy)
3. Run via the migration tool; user approves
4. If the change involved data backfill, the rollback may need to backfill from `audit_logs` snapshots

## Verifications post-rollback

- `/platform/backend-health` — all checks `ok`
- `/platform/reconciliation` — no new findings vs the baseline
- Spot check: create a test quote → approve → invoice → mark paid

## Communicate

- Note the incident in `audit_logs` via the owner-only "incident note" action
- If customer-facing data was affected, post in Comms

## When to escalate

- Rollback fails (e.g. migration cannot be reversed cleanly) → freeze writes by toggling all `sync_schedules.enabled = false` and contact platform support
