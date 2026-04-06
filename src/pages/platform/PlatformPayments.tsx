import { useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { usePlatformPayments, PAYMENT_METHODS, type PlatformPayment } from "@/hooks/usePlatformInvoices";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search, CreditCard, DollarSign, Calendar, Hash, User, ArrowUpRight, ArrowDownLeft,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export default function PlatformPayments() {
  const { selectedBusinessId, businesses } = usePlatformAuth();
  const { payments, loading, searchQuery, setSearchQuery, totals } = usePlatformPayments(selectedBusinessId);
  const [selectedPayment, setSelectedPayment] = useState<PlatformPayment | null>(null);

  const getBiz = (bizId: string) => businesses.find(b => b.id === bizId);
  const methodIcon = (m: string | null) => {
    if (m === "cash") return "💵";
    if (m === "check") return "📝";
    if (m === "transfer") return "🏦";
    return "💳";
  };

  return (
    <PlatformLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Payments</h1>
          <p className="font-body text-xs text-muted-foreground">
            {totals.count} payments · ${totals.totalReceived.toLocaleString()} received
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-primary" />
              <span className="font-body text-[10px] text-muted-foreground">Received</span>
            </div>
            <p className="font-display text-lg font-bold text-foreground">${totals.totalReceived.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
              <span className="font-body text-[10px] text-muted-foreground">Refunded</span>
            </div>
            <p className="font-display text-lg font-bold text-foreground">${totals.totalRefunded.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-body text-[10px] text-muted-foreground">Count</span>
            </div>
            <p className="font-display text-lg font-bold text-foreground">{totals.count}</p>
          </div>
        </div>

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
            {[1,2,3].map(i => <div key={i} className="h-16 bg-card rounded-lg animate-pulse border border-border" />)}
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
              return (
                <button
                  key={pay.id}
                  onClick={() => setSelectedPayment(pay)}
                  className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">{methodIcon(pay.method)}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-body text-[11px] text-muted-foreground font-mono">{pay.payment_number}</span>
                          {pay.is_deposit && (
                            <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-body font-medium">Deposit</span>
                          )}
                          {pay.is_refund && (
                            <span className="px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive text-[10px] font-body font-medium">Refund</span>
                          )}
                          {!selectedBusinessId && biz && (
                            <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />
                          )}
                        </div>
                        <p className="font-body text-sm text-foreground truncate">{pay.customer_name || "—"}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-body">
                          {pay.payment_date && <span>{format(parseISO(pay.payment_date), "MMM d, yyyy")}</span>}
                          {pay.invoice_number && <span>· {pay.invoice_number}</span>}
                        </div>
                      </div>
                    </div>
                    <p className={cn("font-body text-sm font-semibold shrink-0", pay.is_refund ? "text-destructive" : "text-primary")}>
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
          {selectedPayment && (
            <div className="space-y-5 pt-4">
              <SheetHeader>
                <SheetTitle className="font-display text-foreground flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{selectedPayment.payment_number}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-body font-medium",
                    selectedPayment.status === "completed" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {selectedPayment.status}
                  </span>
                </SheetTitle>
              </SheetHeader>

              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <p className="font-body text-xs text-muted-foreground mb-1">Amount</p>
                <p className={cn("font-display text-3xl font-bold", selectedPayment.is_refund ? "text-destructive" : "text-primary")}>
                  {selectedPayment.is_refund ? "-" : ""}${Number(selectedPayment.amount).toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-lg p-2.5">
                  <p className="font-body text-[10px] text-muted-foreground mb-0.5">Customer</p>
                  <p className="font-body text-sm text-foreground">{selectedPayment.customer_name || "—"}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-2.5">
                  <p className="font-body text-[10px] text-muted-foreground mb-0.5">Method</p>
                  <p className="font-body text-sm text-foreground capitalize">{selectedPayment.method || "—"}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-2.5">
                  <p className="font-body text-[10px] text-muted-foreground mb-0.5">Date</p>
                  <p className="font-body text-sm text-foreground">
                    {selectedPayment.payment_date ? format(parseISO(selectedPayment.payment_date), "MMM d, yyyy") : "—"}
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-2.5">
                  <p className="font-body text-[10px] text-muted-foreground mb-0.5">Invoice</p>
                  <p className="font-body text-sm text-foreground font-mono">{selectedPayment.invoice_number || "—"}</p>
                </div>
              </div>

              {selectedPayment.reference_number && (
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="font-body text-xs text-muted-foreground mb-1">Reference #</p>
                  <p className="font-body text-sm text-foreground font-mono">{selectedPayment.reference_number}</p>
                </div>
              )}
              {selectedPayment.notes && (
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="font-body text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="font-body text-sm text-foreground">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}
