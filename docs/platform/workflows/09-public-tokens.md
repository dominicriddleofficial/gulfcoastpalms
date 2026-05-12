# Customer Portal & Public Token Behavior

Customers never authenticate — they receive signed links.

## Public quote link `/q/:id?t=<token>`

- `get-quote-public` (verify_jwt = false; service role) validates the UUID, then HMAC token if present
- Returns scrubbed payload (no internal notes, no cost data)
- Approval requires HMAC token (`approve-quote`)

## Public invoice link `/i/:id?s=<shortcode>`

- `get-invoice-public` requires both UUID **and** shortcode; mismatch returns 404
- Returns invoice + Stripe Checkout URL

## Customer portal `/portal?token=...`

- `customer-portal-data` validates a long-lived `customer_portal_tokens` row (revocable, optional `expires_at`)
- Lists all quotes/invoices/visits for that customer
- Token can be revoked from `/platform/customers/:id`

## Token security model

- All public endpoints use the service role key server-side; client never gets it
- HMAC payload includes `quoteId` only — no expiry today (tracked as SEC-3)
- CORS is `*` for public endpoints (necessary for cross-domain links)
- Rate limiting by IP for `approve-quote` and `customer-portal-data`
