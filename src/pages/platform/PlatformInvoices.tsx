import { useState } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import {
  usePlatformInvoices, INVOICE_STATUSES, PAYMENT_METHODS,
  type PlatformInvoice, type InvoiceLineItem,
} from "@/hooks/usePlatformInvoices";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, Receipt, DollarSign, Calendar, Hash, User,
  AlertTriangle, CheckCircle, Send, Eye, Clock, Ban,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function InvoiceStatusBadge({ status }: { status: string }) {
  const s = INVOICE_STATUSES.find(is => is.value === status);
  if (!s) return <span className="text-xs text-muted-foreground">{status}</span>;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-medium"
      style={{ backgroundColor: s.color + "20", color: s.color, border: `1px solid ${s.color}30` }}
    >
      {s.label}
    </span>
  );
}

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
            <h1 className="font-display text-xl font-bold text-foreground">Invoices</h1>
            <p className="font-body text-xs text-muted-foreground">
              {statusCounts.all} total · ${totals.totalOutstanding.toLocaleString()} outstanding
            </p>
          </div>
          <Button size="sm" className="font-body text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Invoice
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              <span className="font-body text-[10px] text-muted-foreground">Collected</span>
            </div>
            <p className="font-display text-lg font-bold text-foreground">${totals.totalCollected.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span className="font-body text-[10px] text-muted-foreground">Outstanding</span>
            </div>
            <p className="font-display text-lg font-bold text-foreground">${totals.totalOutstanding.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
              <span className="font-body text-[10px] text-muted-foreground">Overdue</span>
            </div>
            <p className="font-display text-lg font-bold text-foreground">{totals.overdueCount}</p>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-body font-medium whitespace-nowrap transition-all border",
              statusFilter === "all"
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            )}
          >
            All ({statusCounts.all})
          </button>
          {INVOICE_STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-body font-medium whitespace-nowrap transition-all border",
                statusFilter === s.value
                  ? "border-primary/30"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              )}
              style={statusFilter === s.value ? { backgroundColor: s.color + "20", color: s.color, borderColor: s.color + "40" } : {}}
            >
              {s.label} ({statusCounts[s.value] || 0})
            </button>
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
              const isOverdue = inv.due_date && isPast(parseISO(inv.due_date)) && !["paid", "void"].includes(inv.status);
              return (
                <button
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-body text-[11px] text-muted-foreground font-mono">{inv.invoice_number}</span>
                        <InvoiceStatusBadge status={isOverdue && inv.status !== "overdue" ? "overdue" : inv.status} />
                        {!selectedBusinessId && biz && (
                          <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />
                        )}
                      </div>
                      <p className="font-body text-sm font-medium text-foreground truncate">
                        {inv.customer_name || "Unknown Customer"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-body">
                        {inv.issue_date && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(parseISO(inv.issue_date), "MMM d")}</span>
                        )}
                        {inv.due_date && (
                          <span className={cn("flex items-center gap-1", isOverdue && "text-destructive")}>
                            Due {format(parseISO(inv.due_date), "MMM d")}
                          </span>
                        )}
                        {inv.job_number && (
                          <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{inv.job_number}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-body text-sm font-semibold text-foreground">${Number(inv.total || 0).toLocaleString()}</p>
                      {Number(inv.balance_due || 0) > 0 && Number(inv.balance_due) !== Number(inv.total) && (
                        <p className="font-body text-[10px] text-accent">
                          ${Number(inv.balance_due).toLocaleString()} due
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
              businessId={selectedInvoice.business_id}
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
              onRecordPayment={async (amount, method) => {
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
                  recorded_by_user_id: userId,
                });
                const newPaid = (Number(selectedInvoice.amount_paid) || 0) + amount;
                const newBalance = (Number(selectedInvoice.total) || 0) - newPaid;
                const newStatus = newBalance <= 0 ? "paid" : "partial";
                await supabase.from("platform_invoices").update({
                  amount_paid: newPaid,
                  balance_due: Math.max(0, newBalance),
                  status: newStatus,
                  ...(newStatus === "paid" ? { paid_at: new Date().toISOString() } : {}),
                }).eq("id", selectedInvoice.id);
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

function InvoiceDetailPanel({ invoice, businessId, onStatusChange, onRecordPayment }: {
  invoice: PlatformInvoice;
  businessId: string;
  onStatusChange: (status: string) => void;
  onRecordPayment: (amount: number, method: string) => void;
}) {
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState(String(Number(invoice.balance_due || invoice.total || 0)));
  const [payMethod, setPayMethod] = useState("card");

  const isPaid = invoice.status === "paid";
  const isVoid = invoice.status === "void";

  return (
    <div className="space-y-5 pt-4">
      <SheetHeader>
        <SheetTitle className="font-display text-foreground flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{invoice.invoice_number}</span>
          <InvoiceStatusBadge status={invoice.status} />
        </SheetTitle>
      </SheetHeader>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-body text-[10px] text-muted-foreground">Total</p>
            <p className="font-display text-2xl font-bold text-foreground">${Number(invoice.total || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="font-body text-[10px] text-muted-foreground">Balance Due</p>
            <p className={cn("font-display text-2xl font-bold", Number(invoice.balance_due || 0) > 0 ? "text-accent" : "text-primary")}>
              ${Number(invoice.balance_due || 0).toLocaleString()}
            </p>
          </div>
        </div>
        {Number(invoice.amount_paid || 0) > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="font-body text-xs text-muted-foreground">
              Paid: <span className="text-primary font-medium">${Number(invoice.amount_paid).toLocaleString()}</span>
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="Customer" value={invoice.customer_name || "—"} icon={User} />
        <InfoCard label="Issued" value={invoice.issue_date ? format(parseISO(invoice.issue_date), "MMM d, yyyy") : "—"} icon={Calendar} />
        <InfoCard label="Due Date" value={invoice.due_date ? format(parseISO(invoice.due_date), "MMM d, yyyy") : "—"} icon={Clock} />
        <InfoCard label="Terms" value={invoice.terms || "—"} icon={Receipt} />
      </div>

      {invoice.deposit_required && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="font-body text-xs text-muted-foreground mb-1">Deposit Required</p>
          <p className="font-body text-sm text-foreground">
            ${Number(invoice.deposit_amount || 0).toLocaleString()}
            {invoice.deposit_paid ? " ✓ Collected" : " — Pending"}
          </p>
        </div>
      )}

      {invoice.internal_notes && (
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="font-body text-xs text-muted-foreground mb-1">Internal Notes</p>
          <p className="font-body text-sm text-foreground">{invoice.internal_notes}</p>
        </div>
      )}

      {/* Actions */}
      {!isPaid && !isVoid && (
        <div className="space-y-2">
          {!showPayment ? (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 font-body text-xs" onClick={() => setShowPayment(true)}>
                <DollarSign className="w-3.5 h-3.5 mr-1" /> Record Payment
              </Button>
              {invoice.status === "draft" && (
                <Button size="sm" variant="outline" className="font-body text-xs" onClick={() => onStatusChange("sent")}>
                  <Send className="w-3.5 h-3.5 mr-1" /> Mark Sent
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-3 space-y-3">
              <p className="font-body text-xs text-muted-foreground">Record Payment</p>
              <Input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="Amount"
                className="bg-background border-border font-body"
              />
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="bg-background border-border font-body text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 font-body text-xs" onClick={() => onRecordPayment(Number(payAmount), payMethod)}>
                  Confirm Payment
                </Button>
                <Button size="sm" variant="ghost" className="font-body text-xs" onClick={() => setShowPayment(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status buttons */}
      <div>
        <p className="font-body text-xs text-muted-foreground mb-2">Update Status</p>
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

      <p className="font-body text-[10px] text-muted-foreground">
        Created {formatDistanceToNow(new Date(invoice.created_at), { addSuffix: true })}
      </p>
    </div>
  );
}

function InfoCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="bg-card border border-border rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3 h-3 text-muted-foreground" />
        <p className="font-body text-[10px] text-muted-foreground">{label}</p>
      </div>
      <p className="font-body text-sm text-foreground truncate">{value}</p>
    </div>
  );
}

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
          <label className="font-body text-xs text-muted-foreground mb-1 block">Business</label>
          <Select value={bizId} onValueChange={setBizId}>
            <SelectTrigger className="bg-card border-border font-body text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.public_brand_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className="font-body text-xs text-muted-foreground mb-1 block">Terms</label>
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
          <label className="font-body text-xs text-muted-foreground">Line Items</label>
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
          <span className="font-body text-sm font-semibold text-foreground">${subtotal.toLocaleString()}</span>
        </div>
      </div>

      <div>
        <label className="font-body text-xs text-muted-foreground mb-1 block">Internal Notes</label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional..." className="bg-card border-border font-body" />
      </div>

      <Button className="w-full font-body" onClick={handleSubmit} disabled={saving}>
        {saving ? "Creating..." : "Create Invoice"}
      </Button>
    </div>
  );
}
