import { INVOICE_STATUSES } from "@/hooks/usePlatformInvoices";
import { cn } from "@/lib/utils";

const EXTENDED_STATES: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-[#9ca3af]", bg: "bg-[#9ca3af]/15 border-[#9ca3af]/25" },
  sent: { label: "Sent", color: "text-[#3b82f6]", bg: "bg-[#3b82f6]/15 border-[#3b82f6]/25" },
  viewed: { label: "Viewed", color: "text-[#8b5cf6]", bg: "bg-[#8b5cf6]/15 border-[#8b5cf6]/25" },
  deposit_due: { label: "Deposit Due", color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/15 border-[#f59e0b]/25" },
  deposit_paid: { label: "Deposit Paid", color: "text-[#06b6d4]", bg: "bg-[#06b6d4]/15 border-[#06b6d4]/25" },
  partial: { label: "Partially Paid", color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/15 border-[#f59e0b]/25" },
  paid: { label: "Paid in Full", color: "text-primary", bg: "bg-primary/15 border-primary/25" },
  overdue: { label: "Overdue", color: "text-[#ef4444]", bg: "bg-[#ef4444]/15 border-[#ef4444]/25" },
  void: { label: "Void", color: "text-[#64748b]", bg: "bg-[#64748b]/15 border-[#64748b]/25" },
};

export function getInvoiceDisplayState(invoice: {
  status: string;
  deposit_required?: boolean | null;
  deposit_paid?: boolean | null;
  deposit_amount?: number | null;
  balance_due?: number | null;
  total?: number | null;
  amount_paid?: number | null;
  due_date?: string | null;
}): string {
  if (invoice.status === "void") return "void";
  if (invoice.status === "paid") return "paid";

  const balance = Number(invoice.balance_due || 0);
  const paid = Number(invoice.amount_paid || 0);

  if (balance <= 0 && paid > 0) return "paid";

  if (invoice.deposit_required && !invoice.deposit_paid && paid === 0) return "deposit_due";
  if (invoice.deposit_required && invoice.deposit_paid && balance > 0) return "deposit_paid";

  if (paid > 0 && balance > 0) return "partial";

  if (invoice.due_date) {
    const due = new Date(invoice.due_date);
    if (due < new Date() && !["paid", "void", "draft"].includes(invoice.status)) return "overdue";
  }

  if (invoice.status === "overdue") return "overdue";

  return invoice.status;
}

export function getAmountDueNow(invoice: {
  deposit_required?: boolean | null;
  deposit_paid?: boolean | null;
  deposit_amount?: number | null;
  balance_due?: number | null;
  total?: number | null;
  amount_paid?: number | null;
}): { amount: number; label: string } {
  const balance = Number(invoice.balance_due ?? invoice.total ?? 0);
  const depositAmt = Number(invoice.deposit_amount || 0);

  if (balance <= 0) return { amount: 0, label: "Paid in Full" };

  if (invoice.deposit_required && !invoice.deposit_paid && depositAmt > 0) {
    return { amount: depositAmt, label: "Deposit Due" };
  }

  return { amount: balance, label: "Amount Due Now" };
}

export function InvoiceStatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const state = EXTENDED_STATES[status] || EXTENDED_STATES.draft;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-body font-semibold border",
      state.bg, state.color,
      size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[11px]"
    )}>
      {state.label}
    </span>
  );
}

export default InvoiceStatusBadge;
