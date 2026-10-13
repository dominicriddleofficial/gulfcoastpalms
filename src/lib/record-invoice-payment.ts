import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { PlatformInvoice } from "@/hooks/usePlatformInvoices";

const cents = (value: number | null) => Math.round(Number(value || 0) * 100);

export function remainingInvoiceBalance(invoice: Pick<PlatformInvoice, "total" | "amount_paid">) {
  return Math.max(0, cents(invoice.total) - cents(invoice.amount_paid)) / 100;
}

export class RecordedPaymentError extends Error {}

/** Reuse the existing payment tables; never charge a card or send a customer message. */
export async function recordInvoicePayment({
  invoice, userId, amount, method, notes, isDeposit = false, tipAmount = 0,
  paymentDate = format(new Date(), "yyyy-MM-dd"),
  requireFullBalance = false,
}: {
  invoice: Pick<PlatformInvoice, "id" | "business_id">;
  userId: string;
  amount: number;
  method: string;
  notes: string;
  isDeposit?: boolean;
  tipAmount?: number;
  paymentDate?: string;
  requireFullBalance?: boolean;
}) {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(tipAmount) || tipAmount < 0) {
    throw new Error("Enter a valid payment amount.");
  }
  const receivedAt = new Date(`${paymentDate}T12:00:00`);
  if (Number.isNaN(receivedAt.getTime()) || format(receivedAt, "yyyy-MM-dd") !== paymentDate) {
    throw new Error("Enter a valid payment date.");
  }

  // Read the current balance, not the possibly stale invoice drawer snapshot.
  const { data: current, error: readError } = await supabase.from("platform_invoices")
    .select("*").eq("id", invoice.id).eq("business_id", invoice.business_id).single();
  if (readError || !current) throw new Error(readError?.message || "Could not load the invoice.");
  if (current.status === "paid" || current.status === "void") {
    throw new Error(`This invoice is already ${current.status}. No payment was recorded.`);
  }
  const amountCents = cents(amount);
  const balanceCents = cents(remainingInvoiceBalance(current));
  if (amountCents <= 0 || amountCents > balanceCents || (requireFullBalance && amountCents !== balanceCents)) {
    throw new Error("The invoice balance has changed. Reopen the invoice before recording payment.");
  }

  // If an earlier payment insert succeeded but its invoice update failed, do not
  // insert the same money again when the operator reopens the invoice.
  const { data: payments, error: paymentsError } = await supabase.from("platform_payments")
    .select("amount, is_refund").eq("invoice_id", invoice.id)
    .eq("business_id", invoice.business_id).eq("status", "completed");
  if (paymentsError) throw new Error(paymentsError.message);
  const recordedCents = (payments || []).reduce((sum, p) =>
    sum + (p.is_refund ? -Math.abs(cents(p.amount)) : cents(p.amount)), 0);
  if (recordedCents > cents(current.amount_paid)) {
    throw new RecordedPaymentError("A payment is already recorded but is not reflected on this invoice. Review Payments before recording another payment.");
  }

  const { data: paymentNumber, error: numberError } = await supabase.rpc("generate_next_number", {
    _business_id: invoice.business_id, _record_type: "payment",
  });
  if (numberError || !paymentNumber) throw new Error(numberError?.message || "Could not create a payment number.");
  const { error: paymentError } = await supabase.from("platform_payments").insert({
    id: crypto.randomUUID(),
    business_id: invoice.business_id,
    payment_number: paymentNumber,
    invoice_id: invoice.id,
    customer_id: current.customer_id,
    amount: amountCents / 100,
    tip_amount: cents(tipAmount) / 100,
    method,
    notes: notes.trim() || null,
    payment_date: paymentDate,
    is_deposit: isDeposit,
    recorded_by_user_id: userId,
  });
  if (paymentError) throw new Error(`Could not record payment: ${paymentError.message}`);

  const newPaid = cents(current.amount_paid) + amountCents;
  const newBalance = Math.max(0, cents(current.total) - newPaid);
  try {
    const { data: updated, error: updateError } = await supabase.from("platform_invoices")
      .update({
        amount_paid: newPaid / 100,
        balance_due: newBalance / 100,
        status: newBalance === 0 ? "paid" : "partial",
        ...(newBalance === 0 ? { paid_at: receivedAt.toISOString() } : {}),
        ...(isDeposit || (current.deposit_required && newBalance === 0) ? { deposit_paid: true } : {}),
      })
      .eq("id", invoice.id).eq("business_id", invoice.business_id)
      .eq("updated_at", current.updated_at).select("*").single();
    if (updateError || !updated) throw updateError || new Error("Invoice changed while saving.");
    return updated;
  } catch {
    throw new RecordedPaymentError("Payment was recorded, but the invoice could not be updated. Review Payments before recording again.");
  }
}
