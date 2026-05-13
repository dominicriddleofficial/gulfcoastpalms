# Owner QA Checklist

Run this after any change to Schedule, Jobs, Visits, or RLS. Every box
must be checked on **both an owner account and a non-owner account**
(e.g. Ryan = office_manager).

## 1. Auth & access
- [ ] Owner can sign in and lands on `/platform`
- [ ] Non-owner (office_manager / manager / crew) can sign in
- [ ] Switching the active business updates header + Schedule
- [ ] A user with no business access sees an empty / "no access" state, not a crash

## 2. Schedule (Day / List / Map)
- [ ] Owner sees all GCP jobs for today
- [ ] Office manager (Ryan) sees the **same** jobs as owner for GCP
- [ ] Crew member sees only jobs they are assigned to
- [ ] Week strip highlights today and the selected day
- [ ] Tapping any weekday jumps the selected date in one tap
- [ ] Day, List, and Map tabs all show the same set of jobs
- [ ] Imported Jobber jobs appear with customer name + address
- [ ] Native platform jobs appear alongside Jobber jobs (no duplicates)

## 3. New Customer
- [ ] "Save Customer" button is visible without scrolling on mobile (≤402px)
- [ ] Saving with empty required fields shows inline errors
- [ ] Successful save redirects to the customer or returns to the previous flow
- [ ] No data loss on save failure (form values remain)

## 4. New Job
- [ ] "Save Job" button is visible without scrolling on mobile
- [ ] Can pick an existing customer
- [ ] Can create a new customer inline
- [ ] Save succeeds without requiring a Jobber connection
- [ ] No "row violates row-level security" toast on save
- [ ] Saved job shows on Schedule for the selected date immediately
- [ ] Toast shows the **real** error message on failure (not "non-2xx")

## 5. Visit lifecycle (per job source)
Repeat each row for: imported Jobber job, platform-native job, quote-converted job.

- [ ] On My Way → no error, status updates, customer SMS queued (if enabled)
- [ ] Start Visit → no "non-2xx" error, status flips to In Progress
- [ ] **Complete Visit button appears** after Start Visit (no refresh needed)
- [ ] Complete Visit opens the completion sheet
- [ ] After Complete, status persists across refresh
- [ ] Photos/notes captured during the visit are saved

## 6. Dashboard
- [ ] Top KPI cards match the Schedule's job count for the same window
- [ ] Revenue chart and headline numbers agree
- [ ] No card shows `NaN`, `undefined`, or `0` when Schedule has data
- [ ] Switching businesses updates all KPIs

## 7. Cross-tenant safety
- [ ] Office manager assigned only to GCP cannot see PPS jobs
- [ ] Switching the active business hides the previous business's data
- [ ] No request in DevTools returns rows from a business the user is not in

## 8. Error surface
- [ ] No toast contains the literal text "Edge Function returned a non-2xx status code"
- [ ] Auth-expired errors say "Your session expired. Please sign in again."
- [ ] Permission errors say "You do not have permission to ..."
- [ ] RLS-blocked actions show a human message, not a Postgres error code

## 9. Jobber off-mode
- [ ] Disabling Jobber sync does not blank the Schedule
- [ ] Native jobs still create, start, and complete with Jobber off
- [ ] No edge function 500s when Jobber tokens are missing

## 10. Regression smoke
- [ ] Quote → approve → invoice → payment still works end-to-end
- [ ] Public quote/invoice links still load
- [ ] SMS conversation list still loads
- [ ] No new console errors on `/platform`, `/platform/schedule`, `/platform/jobs`