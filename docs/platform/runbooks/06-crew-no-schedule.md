# Runbook: Crew Cannot Access Schedule

## Symptoms
- Crew member logs in to `/platform/schedule` and sees an empty list
- Or sees "Access denied"

## Likely causes
1. Crew not assigned to any visits today
2. `user_business_access.active_status` is not `'active'`
3. `platform_crew_members.user_id` not linked to the auth user
4. RLS blocking due to wrong `business_id` context selected
5. Cached service worker serving an empty offline shell

## Where to check
- Tables: `user_business_access`, `platform_crew_members`, `platform_visit_assignments`, `platform_job_visits`
- Browser console (RLS errors show as 401/403 from PostgREST)
- IndexedDB → `cached_jobs` for the user (if PWA cache stale)

## Edge functions involved
- None directly; this is RLS + assignment data

## Safe retry
1. Owner: `/platform/team` → ensure crew has `active_status='active'` and `role_name='crew'`
2. Owner: `/platform/schedule` → assign at least one visit to the crew member
3. Crew: pull-to-refresh on Schedule, or sign out / sign back in to clear caches

## Escalate
- If RLS is the culprit (verified via direct `read_query` as that user), inspect `has_business_access` and `user_has_role` definitions

## Rollback
- Roll back the most recent migration touching `user_business_access` or `platform_visit_assignments` policies
