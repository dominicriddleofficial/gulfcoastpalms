## Schedule Upgrade — Pass 2 + Pass 3

Builds on Pass 1 (Contact sheet). Targets `/platform/schedule` (`PlatformSchedule.tsx`) and the `JobDetail` drawer. Schedule data lives in `jobber_jobs` (synced read-mostly), so visit lifecycle state is written back to `jobber_jobs.visit_status` plus a new lightweight `job_visit_events` table for timestamps + drip/review hooks. No changes to `platform_jobs` are needed for this pass.

### 1. New table: `job_visit_events`

Stores per-visit lifecycle timestamps and crew actions for Jobber-synced jobs (which don't have `platform_job_visits` rows).

```text
job_visit_events
  id uuid pk
  business_id uuid not null
  jobber_job_id uuid not null  -> jobber_jobs.id
  on_my_way_at timestamptz
  arrived_at timestamptz
  started_at timestamptz
  completed_at timestamptz
  on_my_way_sms_sent_at timestamptz
  drip_enrolled_at timestamptz
  review_queued_at timestamptz
  created_by_user_id uuid
  unique (jobber_job_id)
```

RLS: `has_business_access(auth.uid(), business_id)` for select/insert/update.

### 2. Visit lifecycle UI (Pass 2)

In the `JobDetail` drawer (replaces today's single "Contact Customer" button area):

- **Status pill** at top reflects `visit_status`: scheduled → on_my_way → on_site → in_progress → complete.
- **Action button** (large, primary, min-h 56px) advances the next stage:
  - `scheduled` → "On My Way" (also opens On My Way confirm sheet — see Pass 3)
  - `on_my_way` / `on_site` → "Start Visit" (sets started_at, status=in_progress)
  - `in_progress` → "Complete Visit" (sets completed_at, status=complete, fires drip + review)
  - `complete` → shows "Completed [time]" muted, with "Reopen" secondary button
- All transitions update `jobber_jobs.visit_status` AND upsert `job_visit_events` timestamps in a single mutation, then invalidate the `schedule-jobber` query.
- "Contact Customer" button stays, moved to a secondary row alongside other actions.

On **Complete Visit**:
1. Set `jobber_jobs.visit_status = 'complete'`, write `completed_at` to `job_visit_events`.
2. Insert `review_requests` row scheduled for `now() + 2h` (matches `field-ops-status-workflow` memory + automated-review-collection-policy).
3. If a matching `platform_jobs` row exists by source mapping, call `enrollCompletedJobInDrip` from `src/lib/drip-enrollment.ts`. Skip silently otherwise (jobber-only jobs don't have a platform customer record).
4. Toast "Visit completed — review request queued for 2h".

### 3. On My Way SMS (Pass 3)

When the user taps "On My Way":

- Open a small confirm sheet with editable message:
  > "Hi {first}, this is {crew} with Gulf Coast Palms — on my way to your property now. See you in about {ETA} min."
- ETA defaults to 30; user can pick 15 / 30 / 45 / 60.
- Two buttons: "Send & Mark On My Way" (calls `send-sms` edge function, then advances status) and "Skip SMS" (just advances status).
- Records `on_my_way_sms_sent_at` when sent. Disabled if `client_phone` is missing.

### 4. Status pills + completion counter (Pass 3)

- **Job cards in list view**: existing colored badge stays, but expand `STATUS_STYLES` to include `on_my_way` (amber), `on_site` (blue), `in_progress` (orange), `complete` (green/accent).
- **Day header** ("EEEE, MMMM d, yyyy") gains a right-aligned counter: `{completedCount}/{totalCount} done` with a thin progress bar underneath. Computed from `dateJobs` filtering `visit_status === 'complete'`.

### 5. Files

**New**
- `supabase/migrations/<timestamp>_job_visit_events.sql` — table + RLS.
- `src/components/platform/schedule/VisitActionPanel.tsx` — status pill + primary action button + reopen, used inside `JobDetail`.
- `src/components/platform/schedule/OnMyWaySheet.tsx` — confirm bottom-sheet with ETA + editable message.
- `src/hooks/useVisitLifecycle.ts` — mutations for advance/reopen, drip + review side-effects.

**Edited**
- `src/pages/platform/PlatformSchedule.tsx`
  - Expand `STATUS_STYLES` (on_my_way, on_site, in_progress, complete).
  - Day group header gets completion counter + progress bar.
  - `JobDetail` uses `<VisitActionPanel>` and renders `<OnMyWaySheet>`.
- (Read-only reuse) `src/lib/drip-enrollment.ts`, existing `send-sms` edge function, existing `review_requests` table.

### 6. Out of scope (Pass 4 — later)

Tabs on job detail, pull-to-refresh, "Today" line on Week view, Before/After photo prompts on complete.

### Technical notes

- All DB mutations use the typed Supabase client; no raw SQL strings.
- Strict TS: typed `VisitStatus = 'scheduled' | 'on_my_way' | 'on_site' | 'in_progress' | 'complete'`, no `any`, no `!`.
- Realtime not required — `useQuery` invalidation after each mutation is fast enough.
- Idempotency: `review_requests` insert guarded by checking for existing pending row for same `job_id` (jobber id) within last 24h; drip enrollment is already idempotent per `enrollCompletedJobInDrip`.
- Multi-tenant safety: every insert/update includes `business_id` from the active `selectedBusinessId`; RLS enforces.
