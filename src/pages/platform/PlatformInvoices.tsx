import { useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import {
  usePlatformInvoices, INVOICE_STATUSES, PAYMENT_METHODS,
  type PlatformInvoice, type InvoiceLineItem,
} from "@/hooks/usePlatformInvoices";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { InvoiceStatusBadge, getInvoiceDisplayState, getAmountDueNow } from "@/components/platform/billing/InvoiceStatusBadge";
import BillingSummaryCard from "@/components/platform/billing/BillingSummaryCard";
import PaymentActionPanel from "@/components/platform/billing/PaymentActionPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, Receipt, DollarSign, Calendar, Hash, User,
  AlertTriangle, CheckCircle, Send, Eye, Clock, Ban, Link2, ExternalLink,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function PlatformInvoices() {
  const { selectedBusinessId, businesses, userId } = usePlatformAuth();
  const {
    invoices, loading, statusFilter, setStatusFilter,
    searchQuery, setSearchQuery, statusCounts, totals, refetch,
  } = usePlatformInvoices(selectedBusinessId);
  const [selectedInvoice, setSelectedInvoice] = useState<PlatformInvoice | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

  const getBiz = (bizId: string) => businesses.find(b => b.id === bizId);

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
          <Button size="sm" className="font-body text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Invoice
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-2">
          <KPICard icon={DollarSign} label="Collected" value={`$${totals.totalCollected.toLocaleString()}`} color="text-[#22c55e]" />
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
            placeholder="Search invoices..."
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
                <button
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="w-full text-left bg-card border border-border rounded-lg p-3.5 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] font-semibold text-foreground/70">{inv.invoice_number}</span>
                        <InvoiceStatusBadge status={displayState} />
                        {!selectedBusinessId && biz && (
                          <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />
                        )}
                      </div>
                      <p className="font-body text-sm font-semibold text-foreground truncate">
                        {inv.customer_name || "Unknown Customer"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-body">
                        {inv.issue_date && (
                          <span>{format(parseISO(inv.issue_date), "MMM d")}</span>
                        )}
                        {inv.due_date && (
                          <span className={cn(displayState === "overdue" && "text-destructive font-medium")}>
                            Due {format(parseISO(inv.due_date), "MMM d")}
                          </span>
                        )}
                        {inv.job_number && (
                          <span className="font-mono">#{inv.job_number}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-body text-base font-bold text-foreground">${Number(inv.total || 0).toLocaleString()}</p>
                      {dueNow > 0 && dueNow !== Number(inv.total) && (
                        <p className="font-body text-[11px] font-semibold text-[#f59e0b]">
                          ${dueNow.toLocaleString()} due
                        </p>
                      )}
                    </div>
                  </div>
                </button>
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
                const updates: any = { status: newStatus };
                if (newStatus === "sent") updates.sent_at = new Date().toISOString();
                if (newStatus === "void") updates.voided_at = new Date().toISOString();
                if (newStatus === "paid") {
                  updates.paid_at = new Date().toISOString();
                  updates.amount_paid = selectedInvoice.total;
                  updates.balance_due = 0;
                }
                await supabase.from("platform_invoices").update(updates).eq("id", selectedInvoice.id);
                toast({ title: "Invoice updated" });
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
                const invoiceUpdates: any = {
                  amount_paid: newPaid,
                  balance_due: Math.max(0, newBalance),
                  status: newBalance <= 0 ? "paid" : "partial",
                };
                if (newBalance <= 0) invoiceUpdates.paid_at = new Date().toISOString();
                if (isDeposit) invoiceUpdates.deposit_paid = true;
                await supabase.from("platform_invoices").update(invoiceUpdates).eq("id", selectedInvoice.id);
                toast({ title: `Payment of $${amount.toLocaleString()} recorded` });
                refetch();
                setSelectedInvoice(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Create Invoice Drawer */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="ops-theme bg-background border-border w-full sm:max-w-lg overflow-y-auto">
          <CreateInvoiceForm
            businessId={selectedBusinessId}
            businesses={businesses}
            userId={userId}
            onCreated={() => { setShowCreate(false); refetch(); }}
          />
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

/* ─── Invoice Detail ─── */
function InvoiceDetailPanel({ invoice, businesses, onStatusChange, onRecordPayment }: {
  invoice: PlatformInvoice;
  businesses: any[];
  onStatusChange: (status: string) => void;
  onRecordPayment: (amount: number, method: string, notes: string, isDeposit: boolean) => void;
}) {
  const { toast } = useToast();
  const biz = businesses.find(b => b.id === invoice.business_id);
  const isPaid = invoice.status === "paid";
  const isVoid = invoice.status === "void";
  const hasBalance = Number(invoice.balance_due || invoice.total || 0) > 0;

  const getPaymentUrl = () => {
    const shortcode = invoice.invoice_number?.split("-")[0]?.toLowerCase() || "gcp";
    return `${window.location.origin}/pay/${shortcode}/${invoice.id}`;
  };

  const copyPaymentLink = () => {
    navigator.clipboard.writeText(getPaymentUrl());
    toast({ title: "Payment link copied to clipboard" });
  };

  const openPaymentPage = () => {
    window.open(getPaymentUrl(), "_blank");
  };

  return (
    <div className="space-y-5 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground sr-only">Invoice Detail</SheetTitle>
      </SheetHeader>

      {/* Billing Summary Card */}
      <BillingSummaryCard
        invoice={invoice}
        businessName={biz?.public_brand_name}
        businessColor={biz?.default_business_color}
        businessShortcode={biz?.shortcode}
      />

      {/* Payment Actions — always shown, panel adapts to state */}
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
          onRecordPayment={onRecordPayment}
          onOpenPaymentPage={openPaymentPage}
          onCopyPaymentLink={copyPaymentLink}
        />
      )}

      {/* Paid state */}
      {isPaid && (
        <div className="flex items-center gap-3 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl p-4">
          <CheckCircle className="w-6 h-6 text-[#22c55e]" />
          <div>
            <p className="font-body text-sm font-semibold text-[#22c55e]">Payment Complete</p>
            <p className="font-body text-xs text-muted-foreground">
              ${Number(invoice.amount_paid || invoice.total || 0).toLocaleString()} collected
            </p>
          </div>
        </div>
      )}

      {/* Details grid */}
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

      {/* Status Update */}
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

/* ─── Detail Card ─── */
function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-2.5">
      <p className="font-body text-[10px] font-medium text-muted-foreground mb-0.5">{label}</p>
      <p className="font-body text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

/* ─── KPI Card ─── */
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

/* ─── Status Pill ─── */
function StatusPill({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-[11px] font-body font-semibold whitespace-nowrap transition-all border",
        active
          ? color
            ? "border-transparent"
            : "bg-primary/15 text-primary border-primary/30"
          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
      )}
      style={active && color ? { backgroundColor: color + "20", color: color, borderColor: color + "40" } : {}}
    >
      {label}
    </button>
  );
}

/* ─── Create Invoice Form ─── */
function CreateInvoiceForm({ businessId, businesses, userId, onCreated }: {
  businessId: string | null;
  businesses: any[];
  userId: string | null;
  onCreated: () => void;
}) {
  const [bizId, setBizId] = useState(businessId || businesses[0]?.id || "");
  const [terms, setTerms] = useState("Due on receipt");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState([{ description: "", qty: "1", price: "0" }]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const addLine = () => setLineItems([...lineItems, { description: "", qty: "1", price: "0" }]);
  const removeLine = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, val: string) => {
    const updated = [...lineItems];
    (updated[i] as any)[field] = val;
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);

  const handleSubmit = async () => {
    if (!bizId) return;
    setSaving(true);

    const { data: numData, error: numErr } = await supabase.rpc("generate_next_number", {
      _business_id: bizId,
      _record_type: "invoice",
    });

    if (numErr) {
      toast({ title: "Error", description: numErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const { data: inv, error } = await supabase.from("platform_invoices").insert({
      business_id: bizId,
      invoice_number: numData,
      status: "draft",
      terms,
      subtotal,
      total: subtotal,
      balance_due: subtotal,
      internal_notes: notes || null,
      created_by_user_id: userId,
    }).select().single();

    if (error || !inv) {
      toast({ title: "Error", description: error?.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const validLines = lineItems.filter(l => l.description.trim());
    if (validLines.length > 0) {
      await supabase.from("platform_invoice_line_items").insert(
        validLines.map((l, i) => ({
          business_id: bizId,
          invoice_id: inv.id,
          description: l.description,
          quantity: Number(l.qty) || 1,
          unit_price: Number(l.price) || 0,
          line_total: (Number(l.qty) || 1) * (Number(l.price) || 0),
          sort_order: i,
        }))
      );
    }

    toast({ title: "Invoice created" });
    onCreated();
    setSaving(false);
  };

  return (
    <div className="space-y-4 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground">Create Invoice</SheetTitle>
      </SheetHeader>

      {!businessId && businesses.length > 1 && (
        <div>
          <label className="font-body text-xs font-medium text-foreground mb-1.5 block">Business</label>
          <Select value={bizId} onValueChange={setBizId}>
            <SelectTrigger className="bg-card border-border font-body text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.public_brand_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className="font-body text-xs font-medium text-foreground mb-1.5 block">Terms</label>
        <Select value={terms} onValueChange={setTerms}>
          <SelectTrigger className="bg-card border-border font-body text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Due on receipt">Due on receipt</SelectItem>
            <SelectItem value="Net 15">Net 15</SelectItem>
            <SelectItem value="Net 30">Net 30</SelectItem>
            <SelectItem value="Net 60">Net 60</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-body text-xs font-medium text-foreground">Line Items</label>
          <Button size="sm" variant="ghost" className="font-body text-xs text-primary h-6 px-2" onClick={addLine}>
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {lineItems.map((line, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input
                placeholder="Description"
                value={line.description}
                onChange={e => updateLine(i, "description", e.target.value)}
                className="bg-card border-border font-body text-sm flex-1"
              />
              <Input
                type="number"
                placeholder="Qty"
                value={line.qty}
                onChange={e => updateLine(i, "qty", e.target.value)}
                className="bg-card border-border font-body text-sm w-16"
              />
              <Input
                type="number"
                placeholder="Price"
                value={line.price}
                onChange={e => updateLine(i, "price", e.target.value)}
                className="bg-card border-border font-body text-sm w-20"
              />
              {lineItems.length > 1 && (
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-muted-foreground" onClick={() => removeLine(i)}>×</Button>
              )}
            </div>
          ))}
        </div>
        <div className="text-right mt-2">
          <span className="font-body text-sm text-muted-foreground">Total: </span>
          <span className="font-body text-sm font-bold text-foreground">${subtotal.toLocaleString()}</span>
        </div>
      </div>

      <div>
        <label className="font-body text-xs font-medium text-foreground mb-1.5 block">Internal Notes</label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional..." className="bg-card border-border font-body" />
      </div>

      <Button className="w-full font-body font-semibold" onClick={handleSubmit} disabled={saving}>
        {saving ? "Creating..." : "Create Invoice"}
      </Button>
    </div>
  );
}
