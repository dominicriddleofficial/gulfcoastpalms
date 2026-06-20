## Findings

### Problem 1 — Analytics revenue is empty for recent months

**Root cause: Analytics and the dashboard read from different tables.**

| Source | Used by | June 2026 jobs | June 2026 revenue |
|---|---|---|---|
| `jobber_jobs` | Analytics page (`fetchAnalytics` in `PlatformAnalytics.tsx`) | **3** | **$150** |
| `platform_jobs` (+ visits, deduped with `jobber_jobs`) | HOME dashboard (`useDashboardScheduledJobs`) | **75** | **$30,300** |

Sub-findings (GCP, `business_id = b0000…0001`):

- `PlatformAnalytics.fetchAnalytics` queries **only** `jobber_jobs` (lines 119–127) plus the legacy `jobs`/`invoices` tables. It never touches `platform_jobs` / `platform_job_visits`.
- `useDashboardScheduledJobs` (HOME) queries `platform_job_visits` + `platform_jobs` + `jobber_jobs` and dedupes by `source_record_id`.
- Of the 75 platform_jobs in June 2026, **70 have `source_system = NULL`** (created natively in the app), and only 5 came from Jobber. Those 70 native jobs are completely invisible to Analytics.
- Jobber sync is stale: `max(jobber_jobs.synced_at) = 2026-05-08`, `max(updated_at) = 2026-06-15`. So even the Jobber side hasn't been refreshed in ~5 weeks.
- Full month-by-month comparison for 2026 confirms divergence starts in May:

```
        jobber_jobs        platform_jobs
month   count   revenue    count   revenue
May     17      $9,844     45      $9,844
Jun      3      $150       75      $30,300
Jul      6      $1,270     12      $1,270
```

**Recommendation:** point Analytics at the same unified source the dashboard uses. Cleanest path: build a unified fetcher that pulls `platform_jobs` (filtered by `business_id`, `deleted_at IS NULL`, status not in archived/canceled/deleted) and unions any `jobber_jobs` whose `id` is not already referenced by `platform_jobs.source_record_id`. Treat `total` (platform) and `total_amount` (jobber) as the revenue field. Drop the legacy `jobs` / `invoices` fallback, or only use it for years where neither table has data (2024 historical). This will make the 2026 chart, "Best Month", "Avg Job Value", "Jobs Completed", Geographic, and Service-Type sections all match the dashboard immediately.

### Problem 2 — "Can't see how many people called or texted"

**Last 30 days, Gulf Coast Palms website:**

```
event_name              count
call_now_click          6
text_us_click           14
```

Per-page breakdown (what the widget shows today):

```
call_now_click  /services/palm-tree-trimming  2
                /quote                        2
                /about                        1
                /                             1
text_us_click   /quote                        10
                /services/palm-tree-trimming  2
                /                             1
                /palm-tree-cost               1
```

Findings:

1. **The RankCard restyle renders correctly** — rows + magnitude bars come through fine (verified against `ConversionFunnelWidget.tsx` lines 234–294). Data is present, so the lists are not empty.
2. **There is no glanceable total anywhere on the page.** Only the per-page list — no "20 total texts / 6 total calls" headline. That's almost certainly what the user is missing post-restyle (the previous funnel was probably more obvious at-a-glance).
3. **Other call/text event names are not being counted.** The DB also has `phone_click`, `sticky_bar_call_click`, `sticky_bar_text_click` events being emitted (last 60d), but the widget only counts `call_now_click` and `text_us_click`. Including the sticky-bar variants will materially increase the totals.
4. `analytics_events` still has no `business_id` column — these queries remain workspace-wide (acceptable today; GCP is the only public site emitting events).

## Recommended Fix Plan

### A. Unify Analytics revenue source (Problem 1)

In `src/pages/platform/PlatformAnalytics.tsx`:

1. Replace the `jobber_jobs`-only queries inside `fetchAnalytics` with a unified query helper:
   - Pull `platform_jobs` rows for the year, filtered by `business_id`, `deleted_at IS NULL`, status not in (`archived`,`canceled`,`cancelled`,`deleted`,`draft`).
   - Pull `jobber_jobs` rows for the year (same `business_id`, scheduled in range).
   - Build a Set of `platform_jobs.source_record_id` values; drop any `jobber_jobs` whose `id` is in that Set (already imported).
   - Map both into the existing `UnifiedJob` shape (`total` for platform, `total_amount` for jobber). Use `platform_jobs.title` and `platform_customers.display_name` for service/customer attribution where available; fall back to jobber fields.
2. Apply the same union to `currentYear`, `prevYear`, `twoYearsAgo`, and `prevYearSamePeriod`.
3. Keep the legacy `jobs`/`invoices` fallback only for **years strictly before the earliest year that has any platform/jobber data** (so 2024 historical still renders), to avoid double-counting 2025/2026.
4. Re-verify against DB: after change, June 2026 should report 75 jobs / $30,300 to match the dashboard.

No schema changes. No edits outside `PlatformAnalytics.tsx` (and possibly a small local helper).

### B. Surface call/text totals (Problem 2)

In `src/components/platform/ConversionFunnelWidget.tsx`:

1. Extend `fetchFunnel` to also count `phone_click`, `sticky_bar_call_click`, `sticky_bar_text_click` and roll them into the call/text page lists and totals. Total calls = sum of `call_now_click + phone_click + sticky_bar_call_click`. Total texts = sum of `text_us_click + sticky_bar_text_click`.
2. Add two prominent stat tiles above (or alongside) the existing Call/SMS RankCards: **Total Calls (30d)** and **Total Texts (30d)**, styled as the existing accent panels (`rgba(255,255,255,0.03)` bg, `--biz-accent-rgb` border, `font-display` big number, small "last 30 days" subtitle, Phone/MessageSquare icon).
3. Optionally show a small delta vs. prior 30 days under each total.
4. Keep the per-page RankCards underneath unchanged.

No schema changes. Single-file edit.

### Verification

- After A: re-run the month-by-month query above; Analytics 2026 chart should match dashboard counts.
- After B: 30-day totals should read approximately Calls ≈ 6+ (plus any sticky-bar / phone_click hits) and Texts ≈ 14+.

## Out of scope

- Re-enabling / fixing the Jobber sync schedule (separate concern; data is fine without it once Analytics reads `platform_jobs`).
- Adding `business_id` to `analytics_events` (would be a larger migration).
