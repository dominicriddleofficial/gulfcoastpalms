import { useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { usePlatformPayments, PAYMENT_METHODS, type PlatformPayment } from "@/hooks/usePlatformInvoices";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search, CreditCard, DollarSign, Calendar, Hash, User, ArrowDownLeft,
  Banknote, Receipt, Filter,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const METHOD_ICONS: Record<string, { icon: string; label: string }> = {
  card: { icon: "💳", label: "Card" },
  cash: { icon: "💵", label: "Cash" },
  check: { icon: "📝", label: "Check" },
  transfer: { icon: "🏦", label: "Transfer" },
  other: { icon: "📋", label: "Other" },
};

const SOURCE_LABELS: Record<string, string> = {
  stripe: "Stripe",
  manual: "Manual",
  offline: "Offline",
  checkout: "Online Checkout",
};

export default function PlatformPayments() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const { payments, loading, searchQuery, setSearchQuery, totals } = usePlatformPayments(selectedBusinessId);
  const [selectedPayment, setSelectedPayment] = useState<PlatformPayment | null>(null);

  const getBiz = (bizId: string) => businesses.find(b => b.id === bizId);

  // Calculate deposits collected
  const depositsCollected = payments.filter(p => p.is_deposit && !p.is_refund).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <PlatformLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="font-display text-xl font-bold text-foreground tracking-tight">Payments</h1>
          <p className="font-body text-xs text-muted-foreground">
            {totals.count} payments · <span className="font-medium text-foreground">${totals.totalReceived.toLocaleString()}</span> received
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ArrowDownLeft className="w-4 h-4 text-primary" />
              <span className="font-body text-[11px] font-medium text-muted-foreground">Total Received</span>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">${totals.totalReceived.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Banknote className="w-4 h-4 text-[#06b6d4]" />
              <span className="font-body text-[11px] font-medium text-muted-foreground">Deposits Collected</span>
            </div>
            <p className="font-display text-2xl font-bold text-foreground">${depositsCollected.toLocaleString()}</p>
          </div>
        </div>

        {totals.totalRefunded > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center justify-between">
            <span className="font-body text-xs font-medium text-destructive">Refunded</span>
            <span className="font-body text-sm font-bold text-destructive">-${totals.totalRefunded.toLocaleString()}</span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 font-body text-sm bg-card border-border"
          />
        </div>

        {/* Payment list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-18 bg-card rounded-lg animate-pulse border border-border" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-body text-sm text-muted-foreground">No payments recorded</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map(pay => {
              const biz = getBiz(pay.business_id);
              const mi = METHOD_ICONS[pay.method || "card"] || METHOD_ICONS.card;
              return (
                <button
                  key={pay.id}
                  onClick={() => setSelectedPayment(pay)}
                  className="w-full text-left bg-card border border-border rounded-lg p-3.5 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{mi.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[11px] font-semibold text-foreground/70">{pay.payment_number}</span>
                          {pay.is_deposit && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#06b6d4]/15 text-[#06b6d4] text-[10px] font-body font-semibold border border-[#06b6d4]/25">Deposit</span>
                          )}
                          {pay.is_refund && (
                            <span className="px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-body font-semibold border border-destructive/25">Refund</span>
                          )}
                          {!selectedBusinessId && biz && (
                            <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />
                          )}
                        </div>
                        <p className="font-body text-sm font-semibold text-foreground truncate">{pay.customer_name || "—"}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-body mt-0.5">
                          {pay.payment_date && <span>{format(parseISO(pay.payment_date), "MMM d, yyyy")}</span>}
                          {pay.invoice_number && <span className="font-mono">· {pay.invoice_number}</span>}
                          <span className="capitalize">· {mi.label}</span>
                        </div>
                      </div>
                    </div>
                    <p className={cn("font-display text-base font-bold shrink-0", pay.is_refund ? "text-destructive" : "text-primary")}>
                      {pay.is_refund ? "-" : "+"}${Number(pay.amount).toLocaleString()}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <SheetContent className="ops-theme bg-background border-border w-full sm:max-w-lg overflow-y-auto">
          {selectedPayment && <PaymentDetail payment={selectedPayment} businesses={businesses} />}
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function PaymentDetail({ payment, businesses }: { payment: PlatformPayment; businesses: any[] }) {
  const biz = businesses.find(b => b.id === payment.business_id);
  const mi = METHOD_ICONS[payment.method || "card"] || METHOD_ICONS.card;

  return (
    <div className="space-y-5 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground sr-only">Payment Detail</SheetTitle>
      </SheetHeader>

      {/* Amount */}
      <div className="bg-card border border-border rounded-xl p-5 text-center">
        <p className="font-body text-xs font-medium text-muted-foreground mb-1">Amount</p>
        <p className={cn("font-display text-4xl font-extrabold tracking-tight", payment.is_refund ? "text-destructive" : "text-primary")}>
          {payment.is_refund ? "-" : ""}${Number(payment.amount).toLocaleString()}
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="font-mono text-xs font-semibold text-foreground/70">{payment.payment_number}</span>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[11px] font-body font-semibold border",
            payment.status === "completed"
              ? "bg-primary/15 text-primary border-primary/25"
              : "bg-muted text-muted-foreground border-border"
          )}>
            {payment.status}
          </span>
          {payment.is_deposit && (
            <span className="px-2 py-0.5 rounded-full bg-[#06b6d4]/15 text-[#06b6d4] text-[11px] font-body font-semibold border border-[#06b6d4]/25">Deposit</span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2.5">
        <DetailItem label="Customer" value={payment.customer_name || "—"} />
        <DetailItem label="Method" value={`${mi.icon} ${mi.label}`} />
        <DetailItem label="Date" value={payment.payment_date ? format(parseISO(payment.payment_date), "MMM d, yyyy") : "—"} />
        <DetailItem label="Invoice" value={payment.invoice_number || "—"} mono />
        {biz && <DetailItem label="Business" value={biz.public_brand_name} />}
      </div>

      {payment.reference_number && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="font-body text-xs font-medium text-foreground mb-1">Reference Number</p>
          <p className="font-body text-sm text-foreground font-mono">{payment.reference_number}</p>
        </div>
      )}
      {payment.notes && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="font-body text-xs font-medium text-foreground mb-1">Notes</p>
          <p className="font-body text-sm text-muted-foreground">{payment.notes}</p>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-lg p-2.5">
      <p className="font-body text-[10px] font-medium text-muted-foreground mb-0.5">{label}</p>
      <p className={cn("font-body text-sm font-medium text-foreground truncate", mono && "font-mono")}>{value}</p>
    </div>
  );
}
