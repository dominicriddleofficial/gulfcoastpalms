/**
 * Customer-facing deposit decision for a public quote.
 * A deposit is shown (and checkout started) ONLY when the quote itself says a deposit is required
 * and a positive saved amount exists. Brand never implies a deposit, and nothing here ever claims
 * that a payment has been received.
 */
export interface PublicDepositInput {
  deposit_required?: boolean | null;
  deposit_amount?: number | null;
  total?: number | null;
}

export interface PublicDepositPlan {
  amountCents: number;
  amount: number;
}

export function publicDepositPlan(q: PublicDepositInput): PublicDepositPlan | null {
  if (q.deposit_required !== true) return null;
  const amount = Number(q.deposit_amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const amountCents = Math.round(amount * 100);
  const total = Number(q.total);
  // A deposit larger than the quote is a data error — never ask the customer for it.
  if (Number.isFinite(total) && total > 0 && amountCents > Math.round(total * 100)) return null;
  return { amountCents, amount: amountCents / 100 };
}

/**
 * Deposit for a customer's live option selection, from the quote's saved deposit plan.
 * Mirrors approve_quote_options exactly (integer cents, half-cents round up), so the preview
 * matches what the server records. Returns null when the saved plan is missing.
 */
export function depositCentsForTotal(plan: { deposit_type?: string | null; deposit_value?: number | null }, totalCents: number): number | null {
  const value = Number(plan.deposit_value);
  if (plan.deposit_value == null || !Number.isFinite(value) || value <= 0 || totalCents <= 0) return null;
  if (plan.deposit_type === "fixed") return Math.min(Math.round(value * 100), totalCents);
  return Math.round(Number((totalCents * value / 100).toFixed(6)));
}
