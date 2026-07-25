/**
 * Shared owner/staff phone constants for Deno edge functions.
 * Single source of truth — these used to be hardcoded independently in
 * eod-nudge, submit-application, notify-lead, approve-quote, and
 * resend-approval-sms under different constant names, which meant a number
 * change required hunting down every copy by hand.
 *
 * Not deployed as a function itself — the Supabase CLI ignores directories
 * prefixed with "_" when discovering functions, so this is import-only.
 */

/** Dominic's personal cell — owner alerts (leads, applications, EOD nudges). */
export const DOMINIC_PHONE = "+18508897255";

/** Ryan's personal cell — secondary owner/staff alerts. */
export const RYAN_PHONE = "+18507127850";

/** GCP's main business line — used when an edge function notifies the owner via the business's own number (quote-approval alerts). */
export const GCP_OWNER_PHONE = "8509101290";
