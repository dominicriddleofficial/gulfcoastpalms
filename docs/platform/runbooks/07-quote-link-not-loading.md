# Runbook: Customer Quote Link Not Loading

## Symptoms
- Customer reports `/q/<id>` returns 404, blank page, or "Quote not found"

## Likely causes
1. Wrong/expired UUID in the link
2. `get-quote-public` returning 404 because shortcode/HMAC mismatch
3. Quote was deleted or its `business_id` was changed
4. Edge function down or misdeployed
5. CDN / prerender caching an old 404

## Where to check
- Edge logs: `get-quote-public` (search by quote UUID)
- Tables: `platform_quotes` (does the row exist? what's `status`?)
- Browser network tab for the actual response

## Edge functions involved
- `get-quote-public`, `approve-quote`

## Safe retry
1. Owner: `/platform/quotes/:id` → **Copy public link** and re-send via SMS
2. If the quote is voided/deleted, recreate from history

## Escalate
- Multiple unrelated quotes return 404 → likely an edge function deploy problem; check `supabase--edge_function_logs` for `get-quote-public`

## Rollback
- Redeploy the previous version of `get-quote-public` from the edge function history
