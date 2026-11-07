/** Editor-only calculation; collection policy remains with public quote approval. */
export function editorDeposit(total: number, enabled: boolean, type: "%" | "$", raw: string) {
  if (!enabled) return { amount: 0, balance: total, error: null };
  const value = Number(raw);
  if (!raw.trim() || !Number.isFinite(value) || value <= 0 ||
    (type === "%" ? value > 100 : value > total)) {
    return { amount: 0, balance: total, error: type === "%"
      ? "Enter a deposit percentage greater than 0 and no more than 100."
      : "Enter a deposit amount greater than $0 and no more than the quote total." };
  }
  const totalCents = Math.round(total * 100);
  const cents = type === "%" ? Math.round(totalCents * value / 100) : Math.round(value * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > totalCents) {
    return { amount: 0, balance: total, error: "Enter a valid deposit amount within the quote total." };
  }
  return { amount: cents / 100, balance: (totalCents - cents) / 100, error: null };
}