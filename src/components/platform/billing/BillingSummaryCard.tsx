import { format, parseISO } from "date-fns";
import { InvoiceStatusBadge, getInvoiceDisplayState, getAmountDueNow } from "./InvoiceStatusBadge";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { CheckCircle, Calendar, FileText } from "lucide-react";
import type { PlatformInvoice } from "@/hooks/usePlatformInvoices";

interface Props {
  invoice: PlatformInvoice;
  businessName?: string;
  businessColor?: string;
  businessShortcode?: string;
}

export default function BillingSummaryCard({ invoice, businessName, businessColor, businessShortcode }: Props) {
  const displayState = getInvoiceDisplayState(invoice);
  const { amount: dueNow, label: dueLabel } = getAmountDueNow(invoice);
  const total = Number(invoice.total || 0);
  const paid = Number(invoice.amount_paid || 0);
  const balance = Number(invoice.balance_due ?? total);
  const depositAmt = Number(invoice.deposit_amount || 0);
  const isPaidFull = displayState === "paid";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Top bar with business + invoice */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {businessShortcode && <InlineBadge shortcode={businessShortcode} color={businessColor} />}
          <span className="font-mono text-sm font-semibold text-foreground tracking-wide">{invoice.invoice_number}</span>
        </div>
        <InvoiceStatusBadge status={displayState} size="md" />
      </div>

      {/* Customer + dates */}
      <div className="px-4 pb-3 flex items-center gap-4 text-xs font-body text-muted-foreground">
        {invoice.customer_name && (
          <span className="text-foreground font-medium">{invoice.customer_name}</span>
        )}
        {invoice.due_date && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Due {format(parseISO(invoice.due_date), "MMM d, yyyy")}
          </span>
        )}
        {invoice.terms && <span>{invoice.terms}</span>}
      </div>

      {/* Primary amount */}
      <div className="px-4 py-4 border-t border-border">
        {isPaidFull ? (
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-[#22c55e]" />
            <div>
              <p className="font-display text-2xl font-bold text-[#22c55e]">Paid in Full</p>
              {invoice.paid_at && (
                <p className="font-body text-xs text-muted-foreground">
                  Paid on {format(parseISO(invoice.paid_at), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{dueLabel}</p>
            <p className="font-display text-3xl font-extrabold text-foreground tracking-tight">${dueNow.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Finance breakdown */}
      {!isPaidFull && (
        <div className="px-4 pb-4 space-y-1.5">
          <FinanceRow label="Invoice Total" value={`$${total.toLocaleString()}`} />
          {invoice.deposit_required && (
            <FinanceRow
              label={invoice.deposit_paid ? "Deposit Paid ✓" : "Deposit Required"}
              value={`$${depositAmt.toLocaleString()}`}
              highlight={!invoice.deposit_paid}
            />
          )}
          {paid > 0 && (
            <FinanceRow label="Amount Paid" value={`$${paid.toLocaleString()}`} positive />
          )}
          <div className="border-t border-border pt-1.5">
            <FinanceRow label="Remaining Balance" value={`$${balance.toLocaleString()}`} bold />
          </div>
        </div>
      )}
    </div>
  );
}

function FinanceRow({ label, value, bold, highlight, positive }: {
  label: string; value: string; bold?: boolean; highlight?: boolean; positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`font-body text-xs ${bold ? "font-semibold text-foreground" : "text-muted-foreground"} ${highlight ? "text-[#f59e0b]" : ""}`}>
        {label}
      </span>
      <span className={`font-body text-sm ${bold ? "font-bold text-foreground" : "font-medium text-foreground"} ${positive ? "text-[#22c55e]" : ""}`}>
        {value}
      </span>
    </div>
  );
}
