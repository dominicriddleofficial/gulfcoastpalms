import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Lock, CreditCard, Banknote, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { buildOfflinePaymentBlock } from "@/lib/invoice-message";

/** Same labels the New Invoice screen uses. */
export const INVOICE_PAYMENT_METHOD_OPTIONS = [
  { value: "card", label: "Card (online payment link)", icon: CreditCard },
  { value: "check", label: "Check (mail-in)", icon: Banknote },
  { value: "p2p", label: "Zelle / Venmo / Cash App", icon: Smartphone },
] as const;

export function paymentMethodLabel(method: string | null | undefined): string {
  return INVOICE_PAYMENT_METHOD_OPTIONS.find(o => o.value === (method || "card"))?.label
    ?? "Card (online payment link)";
}

interface Props {
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    payment_method?: string | null;
    amount_paid: number | null;
  };
  businessName?: string;
  /** Called after a successful save so the detail panel + list re-render. */
  onUpdated: (method: string) => void;
}

/**
 * Change an existing invoice's payment method (card / check / p2p).
 * Mirrors the billing_name pencil-edit pattern from the invoice builder.
 *
 * Locked once money has landed: paid invoices, or invoices with any recorded
 * payment rows, show the method read-only.
 */
export default function PaymentMethodCard({ invoice, businessName, onUpdated }: Props) {
  const { isOwner } = useUserRole();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentRows, setPaymentRows] = useState<number | null>(null);
  const method = invoice.payment_method || "card";

  useEffect(() => {
    let active = true;
    (async () => {
      const { count } = await supabase
        .from("platform_payments")
        .select("id", { count: "exact", head: true })
        .eq("invoice_id", invoice.id);
      if (active) setPaymentRows(count ?? 0);
    })();
    return () => { active = false; };
  }, [invoice.id]);

  const paidOrCollected =
    invoice.status === "paid" ||
    Number(invoice.amount_paid || 0) > 0 ||
    (paymentRows ?? 0) > 0;

  const statusAllows = ["draft", "sent", "viewed", "overdue", "partial"].includes(invoice.status);
  const locked = paidOrCollected || !statusAllows;
  const canEdit = isOwner && !locked;

  const save = async (next: string) => {
    if (next === method) { setEditing(false); return; }
    setSaving(true);
    // Method only — no totals, balance, sent_at, paid_at, number, or payment rows.
    const { error } = await supabase
      .from("platform_invoices")
      .update({ payment_method: next })
      .eq("id", invoice.id);
    setSaving(false);
    if (error) {
      toast.error(`Could not change payment method: ${error.message}`);
      return;
    }
    setEditing(false);
    toast.success(`Payment method set to ${paymentMethodLabel(next)}`);
    onUpdated(next);
  };

  const remit = buildOfflinePaymentBlock(method, invoice.invoice_number, businessName);

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-body text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Payment Method
        </p>
        {canEdit && !editing && (
          <button
            type="button"
            data-testid="payment-method-edit"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 font-body text-[10px] text-primary hover:underline"
          >
            <Pencil className="w-3 h-3" /> Change payment method
          </button>
        )}
        {locked && (
          <span className="flex items-center gap-1 font-body text-[10px] text-muted-foreground">
            <Lock className="w-3 h-3" /> Locked
          </span>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {INVOICE_PAYMENT_METHOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() => save(opt.value)}
                aria-pressed={method === opt.value}
                className={cn(
                  "py-2 px-1 rounded-lg border text-[10px] leading-tight font-body font-semibold transition-all",
                  method === opt.value
                    ? "bg-primary/15 text-primary border-primary"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 font-body text-[10px] text-muted-foreground"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <p className="font-body text-sm font-semibold text-foreground" data-testid="payment-method-value">
          {paymentMethodLabel(method)}
        </p>
      )}

      {locked && (
        <p className="font-body text-[10px] text-muted-foreground">
          {paidOrCollected
            ? "This invoice has been paid. Payment method can't be changed."
            : "Payment method can only be changed while the invoice is draft, sent, or overdue."}
        </p>
      )}

      {!editing && remit && (
        <p className="font-body text-[10px] text-muted-foreground whitespace-pre-line bg-secondary/40 border border-border rounded-md p-2">
          {remit}
        </p>
      )}
    </div>
  );
}
