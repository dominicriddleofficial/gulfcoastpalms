# Runbook: PWA / Offline Sync Failed

## Symptoms
- Crew sees "Failed to sync" badge on visit actions
- Owner sees rows in `/platform/offline-queue` with `status='failed'`
- Mutations stuck in `pending` for > 10 min while online

## Likely causes
1. Auth session expired while offline; replay returns 401
2. Edge function rejecting the `client_mutation_id` (schema mismatch)
3. Required referenced row (e.g. visit) deleted between offline action and replay
4. Photo blob exceeds upload size cap
5. Service worker serving stale JS that posts to a removed endpoint

## Where to check
- Browser → Application → IndexedDB → `mutation_queue`
- Edge logs: `update-visit-status`, `add-visit-note`, `upload-job-photo`
- Tables: `mutation_idempotency` (was the `client_mutation_id` recorded?), `audit_logs`

## Edge functions involved
- `update-visit-status`, `add-visit-note`, `upload-job-photo`, `complete-checklist-item`

## Safe retry
1. Crew: tap **Retry** on the failed badge, or open `/platform/offline-queue` (owner)
2. Owner: `/platform/offline-queue` → **Retry all failed**
3. If 401, crew signs out and back in; queue persists across re-auth

## Escalate
- Same `client_mutation_id` failing > 5 times → manually delete the queue row and have the user re-enter the action

## Rollback
- For a bad SW deploy: ship the kill-switch service worker (see PWA docs in repo) for one release cycle
