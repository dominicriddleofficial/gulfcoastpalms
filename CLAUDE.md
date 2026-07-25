# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Vite + React + TypeScript + shadcn-ui app for Gulf Coast Palms (a palm-tree-service business), backed by Supabase (Lovable Cloud). It's both the public marketing site and a full field-service CRM ("the platform") for two businesses: GCP and PPS. The project is edited both locally and via Lovable (lovable.dev) — Lovable pushes commits directly to this repo, so don't assume all history is human-authored.

## Commands

```sh
npm run dev              # start dev server (runs sitemap generation first via predev)
npm run build             # production build (vite build + prerender-meta script)
npm run lint               # eslint .
npm test                    # vitest run (single run)
npm run test:watch    # vitest watch mode
npx vitest run path/to/file.test.ts       # run a single test file
npx vitest run -t "test name"                  # run tests matching a name
npm run perf                # build + bundle-size check + Lighthouse CI (perf:bundle, perf:lighthouse)
```

Package manager: both `bun.lock`/`bun.lockb` and `package-lock.json` are present; `npm` scripts are the documented interface either way.

There is no separate lint-fix script and `@typescript-eslint/no-unused-vars` is turned off — don't treat unused-var warnings as build blockers.

Supabase edge functions (`supabase/functions/*`) are Deno code, not part of the Vite/npm build — they deploy independently via the Supabase CLI/Lovable Cloud, not `npm run build`.

## Architecture

### Five route trees, one app shell

`src/App.tsx` mounts a single `BrowserRouter` and concatenates five route-tree functions from `src/routes/`: `MarketingRoutes`, `AdminRoutes`, `PlatformRoutes`, `PortalRoutes`, `PublicRoutes`. These are separate products sharing one deploy:

- **Marketing/Public** (`/`, `/services`, `/locations`, etc.) — the public GCP marketing site, SEO-sensitive (react-helmet-async, sitemap/prerender scripts).
- **Admin** (`/admin`) — legacy single-tenant admin dashboard, reads/writes the legacy tables (see Data model below). Being phased out.
- **Platform** (`/platform`) — the current multi-tenant CRM (leads → quotes → jobs → invoices → payments → reviews) used by owners/managers/crew. This is where most active development happens. Every page is lazily loaded (see `src/routes/PlatformRoutes.tsx`) and most are role-gated with `RoleRoute` (`src/components/platform/RoleRoute.tsx`) wrapping `usePlatformAuth`/`useUserRole`. It has its own PWA manifest, offline queue (`src/lib/offline/`), and a distinct app-shell fallback in `App.tsx` (`PlatformRouteFallback`) shown while the route chunk/auth resolve.
- **Portal** (`/portal`) — customer-facing portal.
- Public quote/invoice/pay links (`/q/:id`, `/pay/:id`, etc.) live under `PublicRoutes`, not `PlatformRoutes` — they're accessed by customers without platform auth, via HMAC-protected public edge functions (`get-quote-public`, `get-invoice-public`, `approve-quote`).

### Multi-business (multi-tenant) model

The platform serves two businesses (GCP and PPS) from one codebase. `BusinessContext` (`src/contexts/BusinessContext.tsx`) holds the currently-selected `selectedBusinessId` (persisted to localStorage). Every workspace-scoped React Query key includes `selectedBusinessId`, so switching businesses is an instant cache-key swap, not a refetch — **never clear the query cache on business switch**, that's a deliberate, documented choice in `BusinessContext.tsx`.

### Data model: legacy vs. platform tables

See `MIGRATION.md`. Two parallel schemas coexist:
- Legacy single-tenant tables (`leads`, `clients`, `jobs`, `invoices`, `employees`, `reviews`) — used only by the Admin Dashboard (`/admin`).
- `platform_*` tables (`platform_leads`, `platform_customers`, `platform_jobs`, `platform_invoices`, `platform_quotes`, `platform_job_visits`, etc.) — used by everything under `/platform`.

**Do not add new features against the legacy tables.** All new work targets `platform_*` tables. Do not delete legacy tables without a full migration/backfill + cutover window.

### Core platform workflow

`docs/platform/workflows/01-end-to-end.md` is the canonical description of the lead → payment → review lifecycle (lead → quote → approval → job → schedule → visit lifecycle → invoice → payment → review). `docs/platform/workflows/` and `docs/platform/runbooks/` cover individual stages and known failure modes (e.g. `01-quote-sms-not-sending.md`, `02-stripe-not-marking-paid.md`, `03-jobber-stale.md`) — check these before debugging a platform data-flow issue, they document intended behavior and past incidents. Note these docs can drift from current code (e.g. automatic review-request SMS described there has since been intentionally disabled in code — check the edge function itself, not just the doc, before relying on described automation).

Key state machines: quote (`draft → sent → approved`), job visit (`scheduled → on_my_way → in_progress → completed`), invoice (`draft → sent → viewed → paid/overdue/void`).

Cross-cutting audit trails: `audit_logs` (state changes), `timeline_events` (per lead/quote/job/invoice), `email_send_log` / `sms_messages` (outbound comms). `/platform/reconciliation` in-app surfaces broken links between stages.

### Supabase edge functions (`supabase/functions/`)

Deno functions, one directory per function, each self-contained — **there is no `_shared`/shared directory**; CORS headers, allowed-origins lists, etc. are duplicated per function rather than imported. `supabase/config.toml` sets `verify_jwt` per function (many customer-facing/public functions set `verify_jwt = false` and rely on their own auth, e.g. HMAC tokens for public quote/invoice links).

Outbound SMS goes through a single gateway function, `send-sms`, which calls SimpleTexting's API — other functions/pages call `send-sms` rather than hitting the SMS provider directly. Some automatic-send pathways exist but are cron-driven (`process-yearly-reminders`, `process-sms-queue`) and some built infrastructure is currently dormant/disabled by design (`process-review-queue`, `dispatch-automation-event`) — check for an explicit disable comment at the top of a function before assuming it's live.

### Path aliases

`@` → `src/`, `@img` → `src/assets/` (see `vite.config.ts` / `vitest.config.ts` / `components.json`).

### Testing

Vitest + jsdom + Testing Library. Setup file: `src/test/setup.ts`. Test files must match `src/**/*.{test,spec}.{ts,tsx}`.

## How to work in this repo

DEFAULT WORKFLOW
Edit files directly in this repo, commit, and push. Lovable syncs the changes
automatically. This is the primary workflow for all code changes.

LOVABLE MCP - USE ONLY FOR THESE
- query_database  : read live data, verify a fix actually landed
- deploy_project  : ship to production (this is the ONLY reliable path to prod;
                    agent preview-publishes silently fail)
- list_messages   : check status of a build fired from the Lovable phone app
- get_diff        : see what a Lovable build changed

DO NOT USE send_message
Never prompt Lovable's agent to write code. If a change is needed, make it here
in the files. Firing Lovable builds burns credits and causes retry loops.

DATABASE SAFETY
Never run a write query (UPDATE, DELETE, INSERT, ALTER, DROP) without showing me
the exact SQL first and getting explicit approval. Read queries are fine.

PROJECT SCOPE
Do NOT touch the Core Command project (522823c4-b869-493f-958a-f9b8a3c22bb3).
It is under App Store review. GCP and PPS only.

STANDING RULES
- Never use coral in any design, ever.
- Crew never mark jobs completed. Never build automation that depends on job
  completion - it will silently never fire.
- Verify server-side before claiming anything is fixed. "Files touched" is not
  the same as "it works."
- Plain wording in all explanations. No jargon.
- Ask 1-3 sharp clarifying questions before a big build, then execute fast.
