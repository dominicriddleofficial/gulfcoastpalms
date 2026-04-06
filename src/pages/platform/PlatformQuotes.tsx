import { useState, useEffect } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import {
  usePlatformQuotes, QUOTE_STATUSES, fetchQuoteLineItems, fetchQuoteVersions,
  generateQuoteNumber, calculateQuoteTotals,
  type PlatformQuote, type QuoteLineItem,
} from "@/hooks/usePlatformQuotes";
import { usePlatformCustomers } from "@/hooks/usePlatformCustomers";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, FileText, DollarSign, Clock, Calendar, Hash, Trash2,
  Send, CheckCircle, XCircle, History, ChevronRight,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function QuoteStatusBadge({ status }: { status: string }) {
  const s = QUOTE_STATUSES.find(qs => qs.value === status);
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

export default function PlatformQuotes() {
  const { selectedBusinessId, businesses, userId } = usePlatformAuth();
  const {
    quotes, loading, statusFilter, setStatusFilter,
    searchQuery, setSearchQuery, statusCounts, refetch,
  } = usePlatformQuotes(selectedBusinessId);

  const [selectedQuote, setSelectedQuote] = useState<PlatformQuote | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const getBiz = (bizId: string) => businesses.find(b => b.id === bizId);

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Quotes</h1>
            <p className="font-body text-sm text-muted-foreground">{quotes.length} quote{quotes.length !== 1 ? "s" : ""}</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Quote
          </Button>
        </div>

        {/* Status pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-body font-medium whitespace-nowrap transition-all border",
              statusFilter === "all"
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            )}
          >
            All ({quotes.length})
          </button>
          {QUOTE_STATUSES.map(s => {
            const count = statusCounts[s.value] || 0;
            if (count === 0 && s.value !== statusFilter) return null;
            return (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-body font-medium whitespace-nowrap transition-all border",
                  statusFilter === s.value
                    ? "border-primary/30"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                )}
                style={statusFilter === s.value ? { backgroundColor: s.color + "20", color: s.color, borderColor: s.color + "40" } : {}}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by quote # or customer..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border h-10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="font-body text-muted-foreground">No quotes found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {quotes.map(q => {
              const biz = getBiz(q.business_id);
              return (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuote(q)}
                  className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-primary" />
                        <span className="font-mono text-sm font-medium text-foreground">{q.quote_number}</span>
                        {biz && <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />}
                      </div>
                      <p className="font-body text-sm text-muted-foreground">{q.customer_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-body">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />${q.total?.toFixed(2) || "0.00"}
                        </span>
                        <span>{formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</span>
                        {q.deposit_required_flag && (
                          <span className="text-primary text-[10px]">Deposit req.</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <QuoteStatusBadge status={q.status} />
                      <span className="text-[10px] text-muted-foreground font-mono">v{q.version_number}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quote Detail */}
      <Sheet open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <SheetContent className="ops-theme bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          {selectedQuote && (
            <QuoteDetail
              quote={selectedQuote}
              biz={getBiz(selectedQuote.business_id)}
              onUpdate={() => { refetch(); }}
              onClose={() => setSelectedQuote(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Create Quote */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="ops-theme bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          <CreateQuoteForm
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
            userId={userId}
            onCreated={() => { setShowCreate(false); refetch(); }}
          />
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

function QuoteDetail({ quote, biz, onUpdate, onClose }: {
  quote: PlatformQuote; biz: any; onUpdate: () => void; onClose: () => void;
}) {
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [converting, setConverting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoadingItems(true);
    Promise.all([
      fetchQuoteLineItems(quote.id),
      fetchQuoteVersions(quote.id),
    ]).then(([items, vers]) => {
      setLineItems(items);
      setVersions(vers);
      setLoadingItems(false);
    });
  }, [quote.id]);

  const updateStatus = async (newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === "sent") updates.sent_at = new Date().toISOString();
    if (newStatus === "accepted") updates.accepted_at = new Date().toISOString();
    if (newStatus === "declined") updates.declined_at = new Date().toISOString();

    await supabase.from("platform_quotes").update(updates).eq("id", quote.id);
    toast({ title: `Quote marked as ${newStatus}` });
    onUpdate();
  };

  return (
    <div className="space-y-6 pt-2">
      <SheetHeader>
        <div className="flex items-center gap-2">
          {biz && <InlineBadge shortcode={biz.shortcode} color={biz.default_business_color} />}
          <SheetTitle className="font-mono text-lg text-foreground">{quote.quote_number}</SheetTitle>
        </div>
        <p className="font-body text-sm text-muted-foreground">{quote.customer_name}</p>
      </SheetHeader>

      {/* Status + Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <QuoteStatusBadge status={quote.status} />
        {quote.status === "draft" && (
          <Button size="sm" variant="outline" className="gap-1 border-border text-xs" onClick={() => updateStatus("sent")}>
            <Send className="w-3 h-3" /> Mark Sent
          </Button>
        )}
        {(quote.status === "sent" || quote.status === "viewed") && (
          <>
            <Button size="sm" variant="outline" className="gap-1 border-primary/30 text-primary text-xs" onClick={() => updateStatus("accepted")}>
              <CheckCircle className="w-3 h-3" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="gap-1 border-destructive/30 text-destructive text-xs" onClick={() => updateStatus("declined")}>
              <XCircle className="w-3 h-3" /> Decline
            </Button>
          </>
        )}
      </div>

      {/* Financial summary */}
      <div className="bg-secondary rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm font-body">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground">${quote.subtotal?.toFixed(2)}</span>
        </div>
        {quote.discount_total > 0 && (
          <div className="flex justify-between text-sm font-body">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-destructive">-${quote.discount_total?.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-body">
          <span className="text-muted-foreground">Tax ({quote.tax_rate}%)</span>
          <span className="text-foreground">${quote.tax_total?.toFixed(2)}</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between font-body">
          <span className="font-medium text-foreground">Total</span>
          <span className="font-display text-xl font-bold text-primary">${quote.total?.toFixed(2)}</span>
        </div>
        {quote.deposit_required_flag && (
          <div className="flex justify-between text-sm font-body pt-1">
            <span className="text-muted-foreground">
              Deposit ({quote.deposit_type === "percentage" ? `${quote.deposit_value}%` : `$${quote.deposit_value}`})
            </span>
            <span className="text-primary font-medium">${quote.deposit_amount_calculated?.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="space-y-3">
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Line Items ({lineItems.length})</p>
        {loadingItems ? (
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : lineItems.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground/60">No line items</p>
        ) : (
          <div className="space-y-2">
            {lineItems.map((li, i) => (
              <div key={li.id} className="bg-secondary/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between">
                  <p className="font-body text-sm text-foreground">{li.description}</p>
                  <p className="font-mono text-sm text-foreground font-medium">${li.line_total.toFixed(2)}</p>
                </div>
                <p className="font-body text-xs text-muted-foreground">
                  {li.quantity} {li.unit} × ${li.unit_price.toFixed(2)}
                  {li.discount_amount > 0 && <span className="text-destructive"> (-${li.discount_amount.toFixed(2)})</span>}
                  {li.taxable_flag && <span className="text-muted-foreground/50 ml-1">• taxable</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {quote.internal_notes && (
        <div className="space-y-2">
          <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Internal Notes</p>
          <p className="font-body text-sm text-foreground bg-secondary rounded-lg p-3">{quote.internal_notes}</p>
        </div>
      )}
      {quote.public_notes && (
        <div className="space-y-2">
          <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Customer Notes</p>
          <p className="font-body text-sm text-foreground bg-secondary rounded-lg p-3">{quote.public_notes}</p>
        </div>
      )}

      {/* Validity & dates */}
      <div className="grid grid-cols-2 gap-3">
        {quote.valid_until && (
          <div>
            <p className="font-body text-[10px] text-muted-foreground">Valid Until</p>
            <p className="font-body text-sm text-foreground">{format(new Date(quote.valid_until), "MMM d, yyyy")}</p>
          </div>
        )}
        {quote.sent_at && (
          <div>
            <p className="font-body text-[10px] text-muted-foreground">Sent</p>
            <p className="font-body text-sm text-foreground">{format(new Date(quote.sent_at), "MMM d, h:mm a")}</p>
          </div>
        )}
        {quote.accepted_at && (
          <div>
            <p className="font-body text-[10px] text-muted-foreground">Accepted</p>
            <p className="font-body text-sm text-primary">{format(new Date(quote.accepted_at), "MMM d, h:mm a")}</p>
          </div>
        )}
      </div>

      {/* Version history */}
      {versions.length > 0 && (
        <div className="space-y-2">
          <button onClick={() => setShowVersions(!showVersions)} className="flex items-center gap-1.5 font-body text-xs text-muted-foreground hover:text-foreground">
            <History className="w-3 h-3" />
            {versions.length} version{versions.length !== 1 ? "s" : ""}
            <ChevronRight className={cn("w-3 h-3 transition-transform", showVersions && "rotate-90")} />
          </button>
          {showVersions && (
            <div className="space-y-1.5 pl-4 border-l border-border">
              {versions.map(v => (
                <div key={v.id} className="text-xs font-body text-muted-foreground">
                  v{v.version_number} — {format(new Date(v.created_at), "MMM d, yyyy h:mm a")}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Convert to job (accepted quotes) */}
      {quote.status === "accepted" && (
        <div className="pt-2">
          <Button size="sm" className="w-full gap-1.5">
            <FileText className="w-4 h-4" /> Convert to Job
            <span className="text-[10px] opacity-70">(Phase 4)</span>
          </Button>
        </div>
      )}

      <div className="text-[10px] font-body text-muted-foreground/50">
        Created {format(new Date(quote.created_at), "MMM d, yyyy h:mm a")} · v{quote.version_number}
      </div>
    </div>
  );
}

function CreateQuoteForm({ businesses, selectedBusinessId, userId, onCreated }: {
  businesses: any[]; selectedBusinessId: string | null; userId: string | null; onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [bizId, setBizId] = useState(selectedBusinessId || businesses[0]?.id || "");
  const { customers } = usePlatformCustomers(bizId);
  const [customerId, setCustomerId] = useState("");
  const [depositRequired, setDepositRequired] = useState(true);
  const [depositType, setDepositType] = useState("percentage");
  const [depositValue, setDepositValue] = useState(50);
  const [taxRate, setTaxRate] = useState(7.5);
  const [internalNotes, setInternalNotes] = useState("");
  const [publicNotes, setPublicNotes] = useState("");
  const [lineItems, setLineItems] = useState<{
    description: string; quantity: number; unit: string; unit_price: number; discount_amount: number; taxable_flag: boolean;
  }[]>([
    { description: "", quantity: 1, unit: "each", unit_price: 0, discount_amount: 0, taxable_flag: true },
  ]);

  const { toast } = useToast();

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unit: "each", unit_price: 0, discount_amount: 0, taxable_flag: true }]);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const totals = calculateQuoteTotals(lineItems, taxRate);
  const depositCalc = depositRequired
    ? depositType === "percentage"
      ? totals.total * (depositValue / 100)
      : depositValue
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizId || lineItems.every(li => !li.description)) return;
    setSubmitting(true);

    try {
      const quoteNumber = await generateQuoteNumber(bizId);

      const { data: quote, error } = await supabase.from("platform_quotes").insert({
        business_id: bizId,
        quote_number: quoteNumber,
        customer_id: customerId || null,
        status: "draft",
        subtotal: totals.subtotal,
        discount_total: totals.discountTotal,
        tax_rate: taxRate,
        tax_total: totals.taxTotal,
        total: totals.total,
        deposit_required_flag: depositRequired,
        deposit_type: depositType,
        deposit_value: depositValue,
        deposit_amount_calculated: depositCalc,
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        internal_notes: internalNotes || null,
        public_notes: publicNotes || null,
        created_by_user_id: userId,
        last_modified_by_user_id: userId,
      }).select().single();

      if (error) throw error;

      // Insert line items
      const itemsToInsert = lineItems
        .filter(li => li.description)
        .map((li, i) => ({
          quote_id: quote.id,
          business_id: bizId,
          description: li.description,
          quantity: li.quantity,
          unit: li.unit,
          unit_price: li.unit_price,
          discount_amount: li.discount_amount,
          taxable_flag: li.taxable_flag,
          line_total: li.quantity * li.unit_price - li.discount_amount,
          sort_order: i,
        }));

      if (itemsToInsert.length > 0) {
        await supabase.from("platform_quote_line_items").insert(itemsToInsert);
      }

      // Save initial version
      await supabase.from("platform_quote_versions").insert({
        quote_id: quote.id,
        business_id: bizId,
        version_number: 1,
        snapshot_json: { quote, line_items: itemsToInsert },
        created_by_user_id: userId,
      });

      toast({ title: `Quote ${quoteNumber} created` });
      onCreated();
    } catch (err: any) {
      toast({ title: "Error creating quote", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6 pt-2">
      <SheetHeader>
        <SheetTitle className="font-display text-lg text-foreground">New Quote</SheetTitle>
      </SheetHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {businesses.length > 1 && (
          <div className="space-y-1.5">
            <label className="font-body text-xs text-muted-foreground">Business</label>
            <Select value={bizId} onValueChange={v => { setBizId(v); setCustomerId(""); }}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {businesses.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.public_brand_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="font-body text-xs text-muted-foreground">Customer</label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select customer..." /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Line items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Line Items</p>
            <Button type="button" size="sm" variant="ghost" onClick={addLineItem} className="text-primary text-xs gap-1">
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
          {lineItems.map((li, i) => (
            <div key={i} className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Description"
                  value={li.description}
                  onChange={e => updateLineItem(i, "description", e.target.value)}
                  className="bg-secondary border-border text-sm flex-1"
                />
                {lineItems.length > 1 && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeLineItem(i)} className="text-destructive px-2">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-body text-[10px] text-muted-foreground">Qty</label>
                  <Input
                    type="number" min={1} step={1}
                    value={li.quantity}
                    onChange={e => updateLineItem(i, "quantity", Number(e.target.value))}
                    className="bg-secondary border-border text-sm"
                  />
                </div>
                <div>
                  <label className="font-body text-[10px] text-muted-foreground">Unit Price</label>
                  <Input
                    type="number" min={0} step={0.01}
                    value={li.unit_price}
                    onChange={e => updateLineItem(i, "unit_price", Number(e.target.value))}
                    className="bg-secondary border-border text-sm"
                  />
                </div>
                <div>
                  <label className="font-body text-[10px] text-muted-foreground">Total</label>
                  <p className="font-mono text-sm text-foreground pt-2">
                    ${(li.quantity * li.unit_price - li.discount_amount).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tax */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-body text-xs text-muted-foreground">Tax Rate (%)</label>
            <Input
              type="number" min={0} step={0.1} value={taxRate}
              onChange={e => setTaxRate(Number(e.target.value))}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-body text-xs text-muted-foreground">Deposit</label>
            <div className="flex gap-1">
              <Select value={depositType} onValueChange={setDepositType}>
                <SelectTrigger className="bg-secondary border-border w-20"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="fixed">$</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number" min={0} value={depositValue}
                onChange={e => setDepositValue(Number(e.target.value))}
                className="bg-secondary border-border"
              />
            </div>
          </div>
        </div>

        {/* Totals preview */}
        <div className="bg-secondary rounded-lg p-3 space-y-1 text-sm font-body">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${totals.taxTotal.toFixed(2)}</span></div>
          <div className="flex justify-between font-medium border-t border-border pt-1 mt-1">
            <span>Total</span><span className="text-primary">${totals.total.toFixed(2)}</span>
          </div>
          {depositRequired && (
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Deposit</span><span>${depositCalc.toFixed(2)}</span></div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="font-body text-xs text-muted-foreground">Internal Notes</label>
          <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2}
            className="w-full rounded-md bg-secondary border border-border text-foreground font-body text-sm px-3 py-2 resize-none" />
        </div>

        <Button type="submit" className="w-full" disabled={submitting || lineItems.every(li => !li.description)}>
          {submitting ? "Creating..." : "Create Quote"}
        </Button>
      </form>
    </div>
  );
}
