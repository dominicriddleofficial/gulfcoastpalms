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
