# Runbook: RLS / Access Denied

## Symptoms
- User sees "permission denied for table X" or empty results where data should exist
- PostgREST returns 401/403
- Worked before a recent migration

## Likely causes
1. Migration changed/removed an RLS policy
2. `user_business_access` row missing or `active_status != 'active'`
3. Helper function (`has_business_access`, `user_has_role`) signature changed
4. User is acting under wrong `business_id` from `BusinessContext`
5. New table created without RLS enabled (will surface as scanner warning)

## Where to check
- `SELECT * FROM pg_policies WHERE tablename = '<table>'`
- `SELECT public.has_business_access('<user_uuid>', '<business_uuid>')`
- `user_business_access`, `user_roles`, `workspaces`
- `audit_logs` for recent migration events
- Lovable security scanner output

## Edge functions involved
- None directly. RLS is enforced in PostgREST.

## Safe retry
1. Confirm the user has an `active` `user_business_access` row for the right business
2. Confirm `selectedBusinessId` in the UI matches a business they have access to
3. As owner, switch business in the top bar to verify the row exists outside the user's scope

## Escalate
- New table missing RLS → add `ENABLE ROW LEVEL SECURITY` + appropriate policies in a new migration immediately
- Helper function changed signature → check all policies that reference it

## Rollback
- Roll back the migration that introduced the policy change. RLS rollbacks are safe — they only re-open access, they don't lose data.
