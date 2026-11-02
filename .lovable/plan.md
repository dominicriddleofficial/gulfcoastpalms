# CRM A–Z audit (read-only) and next build batches

Nothing was changed, sent, or written. Search and customer profile were left out because they're already done. Approving this plan only approves the build order below. Each batch still gets its own confirmation before any build starts.

## Coverage

| Area | Code | Data (totals only) | Browser |
|---|---|---|---|
| Leads, quotes, approval | yes | yes | no |
| Climber reports and guest link | the conversion path only | no | no |
| Jobs, visits, schedule, route | yes | yes | no |
| Recurring contracts and services | yes | yes | no |
| Invoices, payments, Stripe | yes | yes | no |
| Texts, reviews, yearly reminders, scheduled jobs | yes | list of scheduled jobs | no |
| Analytics and finance | yes | no | no |
| Crew, offline, clock-ins, end-of-day | yes | clock-ins only | no |
| Roles and business separation | screen rules only | no | no |

I didn't run a signed-in browser pass this time.

## Current numbers (GCP, read-only)
- **37 invoices past their due date, $25,858.45 unpaid.** None of them is marked "overdue". No background job changes the status, and no automatic overdue reminder has ever gone out.
- **930 past visits still say "scheduled"**, the oldest from May 12, 2025. 178 upcoming visits, and none has a crew assigned in the app.
- 34 leads still "new" after more than 3 days. 6 leads came in the last 30 days, and none is linked to a quote.
- 3 approved quotes have no job or invoice yet.
- 112 visits have ever been marked complete. This fits your rule that crew never complete jobs.
- Recurring services has 0 rows. The review-request auto-send job is turned off. All other scheduled jobs are on.

## A) Confirmed problems

**Critical (money)**
1. **A failed Stripe payment can never be recovered.** If the first attempt to record a payment fails, every Stripe retry is treated as a duplicate and skipped. A customer can pay and the invoice stays unpaid. (`stripe-webhook/index.ts:60-78`, `:227-242`)
2. **Stripe saves without checking for errors.** The payment record and the invoice update are saved without checking whether they worked, and the event is still marked a success. This can leave a payment with no record, or an invoice that's off. (`:133-175`)
3. **Two payments at the same moment can overwrite each other.** Stripe and manual payments each read the amount paid, add to it and save. (`stripe-webhook:150-175`, `record-invoice-payment.ts:66-98`)
4. **Refunds are only logged.** The invoice still shows the money as collected. (`stripe-webhook:199-204`)

**High**
5. **Converting a quote to a job:**
   - marks the deposit "collected" whenever one was required, even if nothing was paid
   - puts the visit on **today's** date
   - doesn't check whether the visit and quote saved, so a job can end up with no visit. (`platform-conversions.ts:87-111`)
6. **Completing one visit completes the whole job,** even when the job has more visits. The status words also don't match: the job gets "completed" and the visit gets "complete". (`update-visit-status/index.ts:227-244`)
7. **Offline "complete" and "start" changes skip the normal path,** so the schedule and the Jobber copy can stay open. (`offline/sync.ts:36-46`)
8. **Yearly reminders that fail are never retried,** and a missed day loses that reminder window. (`process-yearly-reminders:71-107`)
9. **Any signed-in user can text any number.** The texting function doesn't check the business, and the limit is per internet address. (`send-sms/index.ts:56-131`)
10. **Invoices and payments are hidden on screen for managers, but the database still lets any business member read them.** (`PlatformRoutes.tsx:64-65` compared with the invoice and payment access rules)

**Medium**
11. **Overdue is never worked out from the due date.** The overdue count and filter only read the saved status, so they show 0. (`usePlatformInvoices.ts:143-168`)
12. **The Payments page total can count failed or pending rows.** (`usePlatformInvoices.ts:224-227`)
13. **Recurring contracts make a job but no visit, crew or property,** so it never shows on the schedule. (`process-recurring-contracts:112-145`)
14. **Route order ignores appointment times.** It just picks the closest stop next. (`RouteView.tsx:52-99`)
15. **The money and analytics pages don't match:**
    - Income counts only fully paid invoices, so deposits and part payments are missing.
    - Analytics counts any past scheduled job as earned.
16. **Turning a lead into a customer marks the lead "won"** before any quote is approved. (`platform-conversions.ts:16-54`)
17. **Notifications show only the latest 20** and aren't limited to the business you have open.

Yearly rebooking: there's a nightly yearly-rebooking job, so rebooking may not depend only on jobs being marked complete. I didn't trace how that job picks customers.

## B) Built, but needs setup or better screens
- An office **"close out the day"** screen. Past visits get marked done or skipped in bulk, then the next step comes up: invoice, rebook or review. This replaces depending on crew to complete jobs.
- **Assign crew to visits.** All 178 upcoming visits are unassigned in the app.
- Review requests stay manual. Add a "needs review request" list built from paid invoices.
- Show the climber report → quote step on the report itself, with a customer/address check.
- The **reconciliation** page exists. Add checks for the problems above, such as a payment with no matching invoice change.

## C) Useful additions
- **Collections:** automatic overdue status, a list of unpaid invoices grouped by how late they are, and reminder texts you approve one at a time.
- **Speed-to-lead:** an alert for leads still "new" after 24 hours, and a reminder to follow up on quotes sent 7+ days ago.
- A **rebooking list** for yearly-trimming customers who have no job next year.
- Route order that respects appointment times.

## Next build batches, in order
1. **Payments you can trust:** fix items 1–4 and 12, and save each payment and its invoice update together.
2. **Collections:** item 11, overdue status, the unpaid-by-lateness list and approved reminders.
3. **Quote → job → close-out:** fix items 5 and 6, then build the office close-out screen and match the offline path (item 7).
4. **Who can do what:** items 9 and 10, plus notifications per business.
5. **Dispatch:** crew assignment, recurring visits that reach the schedule (item 13), and route order by appointment time.
6. **Getting work in:** lead and quote follow-up alerts, and yearly rebooking reminders that retry (item 8).

## Not checked
- Whether Stripe failures have actually happened in live data.
- The live database access rules.
- The full security of the climber guest link.
- How the nightly yearly-rebooking job works.
- Jobber two-way sync accuracy.
- Imports.
- Any signed-in browser walkthrough.
