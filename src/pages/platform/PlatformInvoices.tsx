import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import {
  usePlatformInvoices, INVOICE_STATUSES,
  type PlatformInvoice,
} from "@/hooks/usePlatformInvoices";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { InvoiceStatusBadge, getInvoiceDisplayState, getAmountDueNow } from "@/components/platform/billing/InvoiceStatusBadge";
import BillingSummaryCard from "@/components/platform/billing/BillingSummaryCard";
import PaymentActionPanel from "@/components/platform/billing/PaymentActionPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search, Plus, Receipt, DollarSign, Clock, User,
  AlertTriangle, Send, Link2, ExternalLink, Trash2, Edit, Copy, Download,
  MoreHorizontal, MessageSquare, Eye,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PlatformInvoices() {
  type PlatformInvoiceUpdate = Database["public"]["Tables"]["platform_invoices"]["Update"];

  const { selectedBusinessId, businesses, userId } = usePlatformAuth();
  const {
    invoices, loading, statusFilter, setStatusFilter,
    searchQuery, setSearchQuery, statusCounts, totals, refetch,
  } = usePlatformInvoices(selectedBusinessId);
  const [selectedInvoice, setSelectedInvoice] = useState<PlatformInvoice | null>(null);
  const navigate = useNavigate();

  const getBiz = (bizId: string) => businesses.find(b => b.id === bizId);

  const getPaymentUrl = (inv: PlatformInvoice) => {
    const shortcode = inv.invoice_number?.split("-")[0]?.toLowerCase() || "gcp";
    return `${window.location.origin}/pay/${shortcode}/${inv.id}`;
  };

  const copyPaymentLink = (inv: PlatformInvoice) => {
    navigator.clipboard.writeText(getPaymentUrl(inv));
    toast.success("Payment link copied");
  };

  const deleteInvoice = async (inv: PlatformInvoice) => {
    if (!confirm(`Delete invoice ${inv.invoice_number}? This cannot be undone.`)) return;
    await supabase.from("platform_invoice_line_items").delete().eq("invoice_id", inv.id);
    await supabase.from("platform_invoices").delete().eq("id", inv.id);
    toast.success("Invoice deleted");
    refetch();
  };

  const markSent = async (inv: PlatformInvoice) => {
    await supabase.from("platform_invoices").update({
      status: "sent", sent_at: new Date().toISOString(),
    }).eq("id", inv.id);
    toast.success("Invoice marked as sent");
    refetch();
  };

  const sendOverdueReminder = async (inv: PlatformInvoice) => {
    // Look up customer phone
    let phone: string | null = null;
    if (inv.customer_id) {
      const { data: cust } = await supabase
        .from("platform_customers")
        .select("phone")
        .eq("id", inv.customer_id)
        .single();
      phone = cust?.phone || null;
    }
    if (!phone) {
      toast.error("No phone number on file for this customer");
      return;
    }
    const shortcode = inv.invoice_number?.split("-")[0]?.toLowerCase() || "gcp";
    const paymentUrl = `${window.location.origin}/pay/${shortcode}/${inv.id}`;
    const amount = Number(inv.balance_due || inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const message = `Hi ${inv.customer_name || "there"}, this is a friendly reminder that your invoice from Gulf Coast Palms for $${amount} is past due. Pay here: ${paymentUrl} Questions? Call (850) 910-1290.`;

    try {
      const { error } = await supabase.functions.invoke("send-sms", {
        body: { to: phone, message },
      });
      if (error) {
        toast.error("Failed to send reminder: " + error.message);
      } else {
        toast.success(`Reminder sent to ${phone}`);
      }
    } catch (e: any) {
      toast.error("SMS failed: " + e.message);
    }
  };

  // If no business is selected, require one for creating
  const canCreate = !!selectedBusinessId;

  return (
    <PlatformLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight">Invoices</h1>
            <p className="font-body text-xs text-muted-foreground">
              {statusCounts.all} total · <span className="text-foreground font-medium">${totals.totalOutstanding.toLocaleString()}</span> outstanding
            </p>
          </div>
          <Button size="sm" className="font-body text-xs" onClick={() => navigate("/platform/invoices/new")} disabled={!canCreate}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Invoice
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-2">
          <KPICard icon={DollarSign} label="Collected" value={`$${totals.totalCollected.toLocaleString()}`} color="text-primary" />
          <KPICard icon={Clock} label="Outstanding" value={`$${totals.totalOutstanding.toLocaleString()}`} color="text-[#f59e0b]" />
          <KPICard icon={AlertTriangle} label="Overdue" value={String(totals.overdueCount)} color="text-destructive" />
        </div>

        {/* Status pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <StatusPill active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label={`All (${statusCounts.all})`} />
          {INVOICE_STATUSES.map(s => (
            <StatusPill
              key={s.value}
              active={statusFilter === s.value}
              onClick={() => setStatusFilter(s.value)}
              label={`${s.label} (${statusCounts[s.value] || 0})`}
              color={s.color}
            />
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 font-body text-sm bg-card border-border"
          />
        </div>

        {/* Invoice list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-card rounded-lg animate-pulse border border-border" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-body text-sm text-muted-foreground">No invoices found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map(inv => {
              const biz = getBiz(inv.business_id);
              const displayState = getInvoiceDisplayState(inv);
              const { amount: dueNow } = getAmountDueNow(inv);
              return (
                <div
                  key={inv.id}
                  className="bg-card border border-border rounded-lg p-3.5 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] font-semibold text-foreground/70">{inv.invoice_number}</span>
                        <InvoiceStatusBadge status={displayState} />
                        {displayState === "overdue" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                        )}
                        {!selectedBusinessId && biz && (
                          <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />
                        )}
                      </div>
                      <p className="font-body text-sm font-semibold text-foreground truncate">
                        {inv.customer_name || "Unknown Customer"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-body">
                        {inv.issue_date && <span>{format(parseISO(inv.issue_date), "MMM d")}</span>}
                        {inv.due_date && (
                          <span className={cn(displayState === "overdue" && "text-destructive font-medium")}>
                            Due {format(parseISO(inv.due_date), "MMM d")}
                          </span>
                        )}
                      </div>
                    </button>
                      <div className="flex items-start gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-body text-base font-bold text-foreground">${Number(inv.total || 0).toLocaleString()}</p>
                        {dueNow > 0 && dueNow !== Number(inv.total) && (
                          <p className="font-body text-[11px] font-semibold text-[#f59e0b]">${dueNow.toLocaleString()} due</p>
                        )}
                      </div>
                      {/* Preview icon */}
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(getPaymentUrl(inv), "_blank"); }}
                        className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-primary/10"
                        title="Preview Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {/* Quick actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem className="font-body text-xs" onClick={() => window.open(getPaymentUrl(inv), "_blank")}>
                            <Eye className="w-3.5 h-3.5 mr-2" /> Preview Invoice
                          </DropdownMenuItem>
                          {["draft", "sent"].includes(inv.status) && (
                            <DropdownMenuItem className="font-body text-xs" onClick={() => markSent(inv)}>
                              <Send className="w-3.5 h-3.5 mr-2" /> Send
                            </DropdownMenuItem>
                          )}
                          {displayState === "overdue" && (
                            <DropdownMenuItem className="font-body text-xs" onClick={() => sendOverdueReminder(inv)}>
                              <MessageSquare className="w-3.5 h-3.5 mr-2" /> Send Reminder SMS
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="font-body text-xs" onClick={() => setSelectedInvoice(inv)}>
                            <Edit className="w-3.5 h-3.5 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="font-body text-xs" onClick={() => copyPaymentLink(inv)}>
                            <Copy className="w-3.5 h-3.5 mr-2" /> Copy Payment Link
                          </DropdownMenuItem>
                          <DropdownMenuItem className="font-body text-xs text-destructive" onClick={() => deleteInvoice(inv)}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoice Detail Drawer */}
      <Sheet open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <SheetContent className="ops-theme bg-background border-border w-full sm:max-w-lg overflow-y-auto">
          {selectedInvoice && (
            <InvoiceDetailPanel
              invoice={selectedInvoice}
              businesses={businesses}
              onStatusChange={async (newStatus) => {
                const updates: PlatformInvoiceUpdate = { status: newStatus };
                if (newStatus === "sent") updates.sent_at = new Date().toISOString();
                if (newStatus === "void") updates.voided_at = new Date().toISOString();
                if (newStatus === "paid") {
                  updates.paid_at = new Date().toISOString();
                  updates.amount_paid = selectedInvoice.total;
                  updates.balance_due = 0;
                }
                await supabase.from("platform_invoices").update(updates).eq("id", selectedInvoice.id);
                toast.success("Invoice updated");
                refetch();
                setSelectedInvoice(null);
              }}
              onRecordPayment={async (amount, method, notes, isDeposit) => {
                const { data: numData } = await supabase.rpc("generate_next_number", {
                  _business_id: selectedInvoice.business_id,
                  _record_type: "payment",
                });
                await supabase.from("platform_payments").insert({
                  business_id: selectedInvoice.business_id,
                  payment_number: numData || "P-TEMP",
                  invoice_id: selectedInvoice.id,
                  customer_id: selectedInvoice.customer_id,
                  amount,
                  method,
                  notes: notes || null,
                  is_deposit: isDeposit,
                  recorded_by_user_id: userId,
                });
                const newPaid = (Number(selectedInvoice.amount_paid) || 0) + amount;
                const newBalance = (Number(selectedInvoice.total) || 0) - newPaid;
                const invoiceUpdates: PlatformInvoiceUpdate = {
                  amount_paid: newPaid,
                  balance_due: Math.max(0, newBalance),
                  status: newBalance <= 0 ? "paid" : "partial",
                };
                if (newBalance <= 0) invoiceUpdates.paid_at = new Date().toISOString();
                if (isDeposit) invoiceUpdates.deposit_paid = true;
                await supabase.from("platform_invoices").update(invoiceUpdates).eq("id", selectedInvoice.id);
                toast.success(`Payment of $${amount.toLocaleString()} recorded`);
                refetch();
                setSelectedInvoice(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

    </PlatformLayout>
  );
}

/* ─── Invoice Detail ─── */
function InvoiceDetailPanel({ invoice, businesses, onStatusChange, onRecordPayment }: {
  invoice: PlatformInvoice;
  businesses: Array<{ id: string; public_brand_name: string; shortcode: string; default_business_color?: string }>;
  onStatusChange: (status: string) => void;
  onRecordPayment: (amount: number, method: string, notes: string, isDeposit: boolean) => void;
}) {
  const biz = businesses.find(b => b.id === invoice.business_id);
  const isVoid = invoice.status === "void";

  const getPaymentUrl = () => {
    const shortcode = invoice.invoice_number?.split("-")[0]?.toLowerCase() || "gcp";
    return `${window.location.origin}/pay/${shortcode}/${invoice.id}`;
  };

  const copyPaymentLink = () => {
    navigator.clipboard.writeText(getPaymentUrl());
    toast.success("Payment link copied to clipboard");
  };

  const sendPaymentLinkSMS = async () => {
    if (!invoice.customer_id) { toast.error("No customer linked to this invoice"); return; }
    const { data: cust } = await supabase.from("platform_customers").select("phone").eq("id", invoice.customer_id).single();
    const phone = cust?.phone;
    if (!phone) { toast.error("No phone number on file for this customer"); return; }
    const bizName = biz?.public_brand_name || "our company";
    const amount = Number(invoice.balance_due || invoice.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const msg = `Hi ${invoice.customer_name || "there"}, here's your payment link from ${bizName} for $${amount}: ${getPaymentUrl()} Questions? Call (850) 910-1290.`;
    try {
      const { error } = await supabase.functions.invoke("send-sms", { body: { to: phone, message: msg } });
      if (error) toast.error("Failed to send SMS"); else toast.success(`Payment link texted to ${phone}`);
    } catch { toast.error("SMS failed"); }
  };

  const sendPaymentLinkEmail = async () => {
    if (!invoice.customer_id) { toast.error("No customer linked to this invoice"); return; }
    const { data: cust } = await supabase.from("platform_customers").select("email").eq("id", invoice.customer_id).single();
    const email = cust?.email;
    if (!email) { toast.error("No email on file for this customer"); return; }
    const bizName = biz?.public_brand_name || "our company";
    const amount = Number(invoice.balance_due || invoice.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const payUrl = getPaymentUrl();
    try {
      const { error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          to: email,
          subject: `Pay your invoice ${invoice.invoice_number} — $${amount}`,
          html: `<p>Hi ${invoice.customer_name || "there"},</p><p>Here's your payment link from ${bizName} for <strong>$${amount}</strong>:</p><p><a href="${payUrl}" style="color:var(--accent-color);font-weight:bold;">${payUrl}</a></p><p>Thank you for your business!</p>`,
          text: `Hi ${invoice.customer_name || "there"}, here's your payment link from ${bizName} for $${amount}: ${payUrl}`,
        },
      });
      if (error) toast.error("Failed to send email"); else toast.success(`Payment link emailed to ${email}`);
    } catch { toast.error("Email failed"); }
  };

  return (
    <div className="space-y-5 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground sr-only">Invoice Detail</SheetTitle>
      </SheetHeader>

      {/* Preview Invoice button */}
      <Button size="sm" variant="outline" className="w-full gap-2 border-primary/30 text-primary text-xs" onClick={() => window.open(getPaymentUrl(), "_blank")}>
        <Eye className="w-3.5 h-3.5" /> Preview Invoice (Customer View)
      </Button>

      <BillingSummaryCard
        invoice={invoice}
        businessName={biz?.public_brand_name}
        businessColor={biz?.default_business_color}
        businessShortcode={biz?.shortcode}
      />

      {!isVoid && (
        <PaymentActionPanel
          invoice={{
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            total: invoice.total,
            balance_due: invoice.balance_due,
            amount_paid: invoice.amount_paid,
            deposit_required: invoice.deposit_required,
            deposit_paid: invoice.deposit_paid,
            deposit_amount: invoice.deposit_amount,
            status: invoice.status,
          }}
          businessId={invoice.business_id}
          customerId={invoice.customer_id || undefined}
          onRecordPayment={onRecordPayment}
          onOpenPaymentPage={() => window.open(getPaymentUrl(), "_blank")}
          onCopyPaymentLink={copyPaymentLink}
          onSendPaymentLinkSMS={sendPaymentLinkSMS}
          onSendPaymentLinkEmail={sendPaymentLinkEmail}
        />
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <DetailCard label="Customer" value={invoice.customer_name || "—"} />
        <DetailCard label="Issued" value={invoice.issue_date ? format(parseISO(invoice.issue_date), "MMM d, yyyy") : "—"} />
        <DetailCard label="Due Date" value={invoice.due_date ? format(parseISO(invoice.due_date), "MMM d, yyyy") : "—"} />
        <DetailCard label="Terms" value={invoice.terms || "—"} />
      </div>

      {invoice.internal_notes && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="font-body text-xs font-medium text-foreground mb-1">Internal Notes</p>
          <p className="font-body text-sm text-muted-foreground">{invoice.internal_notes}</p>
        </div>
      )}

      <div>
        <p className="font-body text-xs font-semibold text-foreground mb-2">Update Status</p>
        <div className="flex flex-wrap gap-1.5">
          {INVOICE_STATUSES.map(s => (
            <Button
              key={s.value}
              size="sm"
              variant={invoice.status === s.value ? "default" : "outline"}
              className="font-body text-xs"
              onClick={() => onStatusChange(s.value)}
              disabled={invoice.status === s.value}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <p className="font-body text-[11px] text-muted-foreground">
        Created {formatDistanceToNow(new Date(invoice.created_at), { addSuffix: true })}
      </p>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-2.5">
      <p className="font-body text-[10px] font-medium text-muted-foreground mb-0.5">{label}</p>
      <p className="font-body text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("w-3.5 h-3.5", color)} />
        <span className="font-body text-[10px] font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="font-display text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function StatusPill({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-[11px] font-body font-semibold whitespace-nowrap transition-all border",
        active
          ? color ? "border-transparent" : "bg-primary/15 text-primary border-primary/30"
          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
      )}
      style={active && color ? { backgroundColor: color + "20", color, borderColor: color + "40" } : {}}
    >
      {label}
    </button>
  );
}
