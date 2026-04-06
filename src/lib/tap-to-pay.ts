/**
 * Tap to Pay Deep Link & Universal Link utilities.
 *
 * DEEP LINK FORMAT:
 *   gcpops://tap-to-pay?business_id={}&invoice_id={}&customer_id={}&amount={}&payment_mode=tap_to_pay&return_url={}
 *
 * UNIVERSAL LINK FORMAT:
 *   /app/tap-to-pay?business_id={}&invoice_id={}&customer_id={}&amount={}&payment_mode=tap_to_pay
 *
 * FUTURE MOBILE POS API CONTRACT:
 *   1. POST /functions/v1/terminal-connection-token  { business_id }                     → { secret }
 *   2. POST /functions/v1/terminal-create-payment    { business_id, invoice_id, amount }  → { client_secret, payment_intent_id }
 *   3. Stripe Terminal SDK collectPaymentMethod(clientSecret)
 *   4. Stripe Terminal SDK processPayment()
 *   5. Webhook / poll → reconcile invoice status, payment record, audit log
 */

export const DEEP_LINK_SCHEME = "gcpops";
export const UNIVERSAL_LINK_PATH = "/app/tap-to-pay";

export interface TapToPayParams {
  business_id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_mode: "tap_to_pay";
  return_url?: string;
}

/** Build the native deep link URL. */
export function buildDeepLink(params: TapToPayParams): string {
  const qs = new URLSearchParams({
    business_id: params.business_id,
    invoice_id: params.invoice_id,
    customer_id: params.customer_id,
    amount: String(params.amount),
    payment_mode: params.payment_mode,
    ...(params.return_url ? { return_url: params.return_url } : {}),
  }).toString();
  return `${DEEP_LINK_SCHEME}://tap-to-pay?${qs}`;
}

/** Build the universal / fallback web URL. */
export function buildUniversalLink(params: TapToPayParams): string {
  const qs = new URLSearchParams({
    business_id: params.business_id,
    invoice_id: params.invoice_id,
    customer_id: params.customer_id,
    amount: String(params.amount),
    payment_mode: params.payment_mode,
  }).toString();
  return `${UNIVERSAL_LINK_PATH}?${qs}`;
}

/** Attempt to open the native app via deep link, with a fallback to the universal link page. */
export function launchTapToPay(params: TapToPayParams): void {
  const deepLink = buildDeepLink(params);
  const fallbackUrl = buildUniversalLink(params);

  // Try native deep link first
  const start = Date.now();
  window.location.href = deepLink;

  // If the page is still visible after 1.5s, the app isn't installed → navigate to fallback
  setTimeout(() => {
    if (Date.now() - start < 3000) {
      window.open(fallbackUrl, "_blank");
    }
  }, 1500);
}

/**
 * MOBILE POS API CONTRACT (for future React Native / native app)
 *
 * All endpoints require Authorization: Bearer <supabase_access_token>
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ 1. GET CONNECTION TOKEN                                         │
 * │    POST /functions/v1/terminal-connection-token                  │
 * │    Body: { business_id, location_id? }                          │
 * │    Response: { secret: string }                                 │
 * │    Purpose: Initialize Stripe Terminal SDK                      │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 2. CREATE IN-PERSON PAYMENT INTENT                              │
 * │    POST /functions/v1/terminal-create-payment                   │
 * │    Body: { business_id, invoice_id, amount, customer_id?,       │
 * │            currency? }                                          │
 * │    Response: { client_secret, payment_intent_id }               │
 * │    Purpose: Create card_present PaymentIntent for Terminal      │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 3. FETCH INVOICE DETAILS                                       │
 * │    Query: supabase.from("platform_invoices")                    │
 * │           .select("*, platform_customers(*)")                   │
 * │           .eq("id", invoice_id)                                 │
 * │    Purpose: Load invoice + customer for display                 │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 4. FETCH BUSINESS PAYMENT CONFIG                                │
 * │    Query: supabase.from("payment_provider_accounts")            │
 * │           .select("*")                                          │
 * │           .eq("business_id", business_id)                       │
 * │           .eq("active", true)                                   │
 * │    Purpose: Verify terminal is enabled for business             │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 5. RECONCILIATION (automatic)                                   │
 * │    Stripe webhook (payment_intent.succeeded) →                  │
 * │      stripe-webhook edge function →                             │
 * │        update platform_invoices (balance, status) +             │
 * │        insert platform_payments record +                        │
 * │        insert audit_logs entry                                  │
 * └─────────────────────────────────────────────────────────────────┘
 */
