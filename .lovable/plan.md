
# Multi-Business Field Service Platform — Build Plan

## Reality Check
This spec describes a full SaaS product (42+ tables, 7+ modules, complete UI). Building it all at once would produce broken, untestable code. Instead, I'll build it in **focused, working phases** where each phase delivers usable functionality.

## Phase 1 — Foundation (This Session)
Build the core infrastructure that everything else depends on:

### Database Schema (Phase 1 tables only)
1. **workspaces** — single master workspace
2. **businesses** — Gulf Coast Palms + Prestige Property Services
3. **business_settings** — per-business config (prefixes, defaults, colors)
4. **numbering_sequences** — independent numbering per business per record type
5. **user_business_access** — maps users to businesses with role + permissions
6. **audit_logs** — foundation for change tracking
7. **Refactor existing user_roles** — integrate with new business-aware access model

### UI (Phase 1)
1. **Business switcher** — global context selector (All / GCP / PPS)
2. **Platform shell** — new `/platform` route with dark ops theme, nav, business badge
3. **Owner command center dashboard** — KPI cards that respect business filter
4. **Seed data** — realistic demo records for both businesses

### Auth/Permissions
- Existing Supabase auth preserved
- New `user_business_access` table controls which businesses a user can see
- RLS policies on all new tables using business_id scoping

### What Phase 1 does NOT include (deferred to future phases):
- Leads/CRM module (Phase 2)
- Quotes module (Phase 3)
- Jobs/Schedule/Dispatch (Phase 4)  
- Invoices/Payments (Phase 5)
- Analytics/Exports (Phase 6)
- Automations/Integrations (Phase 7)

Each future phase will add tables + UI modules that plug into this foundation via `business_id`.

## Existing System Preservation
- The current `/ops` dashboard, `/admin` dashboard, and public website remain untouched
- New platform lives at `/platform/*`
- Migration path from old ops → new platform can happen gradually
