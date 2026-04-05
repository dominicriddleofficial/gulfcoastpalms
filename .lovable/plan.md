
## Phase 1: Database Schema & Auth (This session)
1. **New database tables**: `jobber_jobs`, `jobber_clients`, `jobber_properties`, `crews`, `sync_logs`, `jobber_tokens`
2. **Extend existing role system**: Add `manager` role to the `app_role` enum (admin/crew_member/read-only already map to existing roles)
3. **RLS policies**: Role-based access on all new tables
4. **Seed mock data** so you can preview the UI immediately

## Phase 2: Dashboard UI (This session)
5. **New route group** `/ops/*` (separate from existing `/admin` dashboard)
6. **Pages**: Login → Dashboard Home → Today's Jobs → Weekly Schedule → Job Detail → Crew View → Settings
7. **Mobile-first card layout** with desktop table fallback
8. **Status chips**, click-to-call, tap-to-maps, crew grouping
9. **Role-based views**: Rookies see only their today, Crew sees their jobs, Manager/Admin see all

## Phase 3: Jobber Integration (Next session recommended)
10. **Edge Function**: `jobber-oauth` — handles OAuth authorize + callback, stores tokens securely
11. **Edge Function**: `jobber-sync` — fetches jobs/clients/properties from Jobber GraphQL API, upserts into our DB
12. **Secrets needed**: `JOBBER_CLIENT_ID`, `JOBBER_CLIENT_SECRET`, `JOBBER_REDIRECT_URI`
13. **Sync Now button** + last-synced timestamp
14. **Jobber Developer App checklist** for you to follow

## Phase 4: Polish & V2 Prep (Future)
15. Webhooks endpoint for near-real-time updates
16. Photo uploads, status updates, route optimization prep

### Why split Phase 3?
The Jobber OAuth flow requires you to create a Jobber Developer App first and provide the Client ID/Secret. We can build the full UI with mock data now, then wire up live data once credentials are ready.

### Shall I proceed with Phases 1 & 2 now?
