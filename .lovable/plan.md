# Analytics, income and Tax tab improvements (GCP)

The A–Z audit is closed with no changes. This plan covers only the three things you picked: accurate income numbers, Analytics charts and layout, and the Tax tab's quarterly estimates.

## What's wrong today (checked against your 2026 GCP data)
- **Income tab shows $0 "earned" from Jobber work.** It only counts Jobber jobs marked "completed", but Jobber never sends that word. Jobs come through as "requires invoicing", "archived", "late" and similar. There's about $53,494 of past 2026 Jobber work that never shows.
- **Income and Tax only count invoices that are fully paid.** Deposits and part payments are skipped. Payments are also dated by when the invoice closed, not when the money came in. 2026 so far: $3,900 recorded in the app.
- **The Tax estimate is a flat 25%** of paid invoices minus expenses. There are 0 expenses entered, so the estimate is high. It also doesn't say how much is due each quarter.
- **Saving a quarterly payment doesn't check whether it worked,** so a failed save looks like it saved.
- **Analytics counts any past scheduled job as done.** Its money figures are "booked work", not "money collected", and the page doesn't say which.

## What you'll get

**1. Accurate income**
- Income tab has three clear lines:
  - **Collected:** real payments recorded in the app, by the day the money came in, including deposits and part payments, minus refunds
  - **Jobber work:** past Jobber jobs that weren't cancelled or deleted, labeled as work done in Jobber, not as collected
  - **Other income:** what you enter by hand
- Each line has its own total and a monthly breakdown. The download file says which line every row came from.
- Profit & Loss uses the same numbers, so the two tabs always match.

**2. Analytics charts and layout**
- A switch at the top: **Booked work** or **Money collected**. Every chart follows it.
- A summary row at the top: this month, year to date, the same point last year, and the change.
- Monthly revenue and year-over-year are combined into one chart with last year as a faint line.
- "Revenue by service" and "service area" become ranked lists with dollar amounts and share of total. These read better on a phone.
- Each chart says where its numbers come from, such as "Jobber + app jobs" or "recorded payments".
- Same dark green look; no coral.

**3. Tax tab quarterly estimates**
- The estimate uses Collected income (from step 1) minus deductible expenses.
- You can set the tax rate (25% stays the starting value). It's saved separately for each business.
- Each quarter shows its due date, the suggested amount (the year's estimate split evenly across the four quarters), what you've paid and what's left.
- Past-due quarters are highlighted. Saving a payment shows a clear error if it fails.
- If no expenses are entered, a note says the estimate is probably high.
- The "estimate only, check with your accountant" note stays.

## Not changing
Jobs, invoices, payments, texts, Jobber sync, the public site or other tabs. Nothing gets published.

## Questions for you
- **Jobber collected money:** Jobber payments aren't in the app, so Jobber work shows as "work done", not as collected. If you collect most money in Jobber, the Tax tab can count Jobber work as income too. Off by default; tell me if you want it on.
- **Tax rate:** if your accountant gave you a rate, tell me and I'll use it as the starting value.

## Technical details
- New shared helper `src/lib/finance/income.ts`. Collected comes from `platform_payments` (completed, payment_date in range, refunds subtracted). Jobber work means a past `scheduled_start` with a status other than deleted, archived or cancelled. Other income comes from `finance_income`. Analytics, Income, Profit & Loss and Tax all use this helper.
- Add one setting for the tax rate with a small additive change: a new column on `business_settings`, default 0.25, using the existing access rules. No other database changes.
- Check `finance_quarterly_taxes` save errors and refresh the data after saving.
- Tests:
  - income helper: deposits and part payments, refunds, date window, Jobber status filter
  - quarter math: split and amount left
  - typecheck and build
- A signed-in, read-only look at desktop and phone width. Saving a quarterly payment won't be tried on real data.
