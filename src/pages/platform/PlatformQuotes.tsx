import { useState, useEffect } from "react";
import PlatformLayout from "@/components/platform/PlatformLayout";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import {
  usePlatformQuotes, QUOTE_STATUSES, fetchQuoteLineItems, fetchQuoteVersions,
  type PlatformQuote, type QuoteLineItem,
} from "@/hooks/usePlatformQuotes";
import { InlineBadge } from "@/components/platform/BusinessSwitcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search, Plus, FileText, DollarSign, Clock, Hash, Trash2,
  Send, CheckCircle, XCircle, History, ChevronRight, Receipt,
  Link2, MoreHorizontal, Copy, TrendingUp, Eye, Briefcase,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QuoteBuilder from "@/components/platform/billing/QuoteBuilder";
import { useCreateSheets } from "@/components/platform/CreateSheetsProvider";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";

function QuoteStatusBadge({ status }: { status: string }) {
  const s = QUOTE_STATUSES.find(qs => qs.value === status);
  if (!s) return <span className="text-xs text-muted-foreground">{status}</span>;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-body font-medium"
      style={{ backgroundColor: s.color + "20", color: s.color, border: `1px solid ${s.color}30` }}>
      {s.label}
    </span>
  );
}

function StatusPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-[11px] font-body font-medium whitespace-nowrap transition-all border",
        active ? "bg-primary/15 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border hover:text-foreground"
      )}>
      {label}
    </button>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-center">
      <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
      <p className="font-body text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className="font-display text-lg font-bold text-foreground">{value}</p>
    </div>
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

  // KPI calculations
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const totalQuotedThisMonth = quotes
    .filter(q => q.created_at >= startOfMonth)
    .reduce((sum, q) => sum + (q.total || 0), 0);
  const totalWon = quotes.filter(q => q.status === "approved" || q.status === "accepted" || q.status === "won")
    .reduce((sum, q) => sum + (q.total || 0), 0);
  const sentCount = quotes.filter(q => q.status !== "draft").length;
  const wonCount = quotes.filter(q => q.status === "approved" || q.status === "accepted" || q.status === "won").length;
  const conversionRate = sentCount > 0 ? Math.round((wonCount / sentCount) * 100) : 0;

  const getQuoteUrl = (q: PlatformQuote) => {
    const shortcode = q.quote_number?.split("-")[0]?.toLowerCase() || "gcp";
    return `${window.location.origin}/quote/${shortcode}/${q.id}`;
  };

  const getPreviewUrl = (q: PlatformQuote) => {
    const shortcode = q.quote_number?.split("-")[0]?.toLowerCase() || "gcp";
    return `${window.location.origin}/platform/quote-display/${shortcode}/${q.id}`;
  };

  const previewQuote = (q: PlatformQuote) => {
    window.open(getPreviewUrl(q), "_blank");
  };

  const copyQuoteLink = (q: PlatformQuote) => {
    navigator.clipboard.writeText(getQuoteUrl(q));
    toast.success("Quote link copied");
  };

  const deleteQuote = async (q: PlatformQuote) => {
    if (!confirm(`Delete quote ${q.quote_number}? This cannot be undone.`)) return;
    await supabase.from("platform_quote_line_items").delete().eq("quote_id", q.id);
    await supabase.from("platform_quote_versions").delete().eq("quote_id", q.id);
    await supabase.from("platform_quotes").delete().eq("id", q.id);
    toast.success("Quote deleted");
    refetch();
  };

  if (showCreate && selectedBusinessId) {
    return (
      <QuoteBuilder
        businessId={selectedBusinessId}
        businesses={businesses.map(b => ({
          id: b.id, public_brand_name: b.public_brand_name,
          shortcode: b.shortcode, logo_url: b.logo_url || null,
          default_business_color: (b as Record<string, unknown>).default_business_color as string | undefined,
        }))}
        userId={userId}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); refetch(); }}
      />
    );
  }

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight">Quotes</h1>
            <p className="font-body text-xs text-muted-foreground">{quotes.length} total</p>
          </div>
          <Button size="sm" className="font-body text-xs" onClick={() => setShowCreate(true)} disabled={!selectedBusinessId}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Quote
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-2">
          <KPICard icon={DollarSign} label="Quoted This Month" value={`$${totalQuotedThisMonth.toLocaleString()}`} color="text-[#3b82f6]" />
          <KPICard icon={CheckCircle} label="Won" value={`$${totalWon.toLocaleString()}`} color="text-[#22c55e]" />
          <KPICard icon={TrendingUp} label="Conversion" value={`${conversionRate}%`} color="text-[#8b5cf6]" />
        </div>

        {/* Status pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <StatusPill active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label={`All (${quotes.length})`} />
          {QUOTE_STATUSES.map(s => {
            const count = statusCounts[s.value] || 0;
            if (count === 0 && s.value !== statusFilter) return null;
            return (
              <button key={s.value} onClick={() => setStatusFilter(s.value)}
                className={cn("px-2.5 py-1 rounded-full text-[11px] font-body font-medium whitespace-nowrap transition-all border",
                  statusFilter === s.value ? "border-primary/30" : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                )}
                style={statusFilter === s.value ? { backgroundColor: s.color + "20", color: s.color, borderColor: s.color + "40" } : {}}>
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by quote # or customer…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-card border-border h-9 font-body text-sm" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : quotes.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-body text-muted-foreground text-sm">No quotes found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {quotes.map(q => {
              const biz = getBiz(q.business_id);
              const isApproved = q.status === "approved" || q.status === "accepted" || q.status === "won";
              return (
                <div key={q.id} className="bg-card border border-border rounded-xl p-3.5 hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => setSelectedQuote(q)} className="flex-1 min-w-0 text-left space-y-1">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-mono text-sm font-medium text-foreground">{q.quote_number}</span>
                        {biz && <InlineBadge shortcode={biz.shortcode} color={(biz as Record<string, unknown>).default_business_color as string | undefined} />}
                      </div>
                      <p className="font-body text-sm text-muted-foreground truncate">{q.customer_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-body">
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${q.total?.toFixed(2) || "0.00"}</span>
                        <span>{formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</span>
                      </div>
                    </button>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <QuoteStatusBadge status={q.status} />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); previewQuote(q); }}
                          className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-primary/10"
                          title="Preview Quote"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground p-1"><MoreHorizontal className="w-4 h-4" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuItem onClick={() => previewQuote(q)} className="text-xs gap-2">
                              <Eye className="w-3.5 h-3.5" /> Preview Quote
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyQuoteLink(q)} className="text-xs gap-2">
                              <Link2 className="w-3.5 h-3.5" /> Copy Link
                            </DropdownMenuItem>
                            {isApproved && (
                              <DropdownMenuItem onClick={() => handleConvertToInvoice(q, businesses, refetch)} className="text-xs gap-2">
                                <Receipt className="w-3.5 h-3.5" /> Convert to Invoice
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => deleteQuote(q)} className="text-xs gap-2 text-destructive">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          {selectedQuote && (
            <QuoteDetail
              quote={selectedQuote}
              biz={getBiz(selectedQuote.business_id)}
              businesses={businesses}
              onUpdate={() => { refetch(); }}
              onClose={() => setSelectedQuote(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </PlatformLayout>
  );
}

async function handleConvertToInvoice(quote: PlatformQuote, businesses: Array<Record<string, unknown>>, refetch: () => void) {
  try {
    // Generate invoice number
    const { data: invNum, error: numErr } = await supabase.rpc("generate_next_number", {
      _business_id: quote.business_id,
      _record_type: "invoice",
    });
    if (numErr) throw numErr;

    // Fetch quote line items
    const { data: lineItems } = await supabase.from("platform_quote_line_items").select("*").eq("quote_id", quote.id).order("sort_order");

    // Create invoice
    const { data: inv, error: invErr } = await supabase.from("platform_invoices").insert({
      business_id: quote.business_id,
      invoice_number: invNum as string,
      customer_id: quote.customer_id,
      quote_id: quote.id,
      status: "draft",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      terms: "Net 30",
      subtotal: quote.subtotal,
      tax_rate: quote.tax_rate,
      tax_total: quote.tax_total,
      discount_total: quote.discount_total,
      total: quote.total,
      balance_due: quote.total,
      amount_paid: 0,
      public_notes: quote.public_notes || null,
      internal_notes: `Converted from quote ${quote.quote_number}`,
    }).select().single();

    if (invErr || !inv) throw invErr || new Error("Failed to create invoice");

    // Copy line items
    if (lineItems && lineItems.length > 0) {
      await supabase.from("platform_invoice_line_items").insert(
        lineItems.map((li: Record<string, unknown>, i: number) => ({
          business_id: quote.business_id,
          invoice_id: inv.id,
          description: li.description as string,
          quantity: li.quantity as number,
          unit_price: li.unit_price as number,
          line_total: li.line_total as number,
          sort_order: i,
        }))
      );
    }

    // Update quote status
    await supabase.from("platform_quotes").update({ status: "won" }).eq("id", quote.id);

    toast.success(`Invoice ${invNum} created from quote ${quote.quote_number}`);
    refetch();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Conversion failed";
    toast.error(msg);
  }
}

function QuoteDetail({ quote, biz, businesses, onUpdate, onClose }: {
  quote: PlatformQuote; biz: Record<string, unknown> | undefined;
  businesses: Array<Record<string, unknown>>;
  onUpdate: () => void; onClose: () => void;
}) {
  const { open: openSheet } = useCreateSheets();
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [versions, setVersions] = useState<Array<Record<string, unknown>>>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [converting, setConverting] = useState(false);

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
    const updates: { status: string; sent_at?: string; accepted_at?: string; declined_at?: string } = { status: newStatus };
    if (newStatus === "sent") updates.sent_at = new Date().toISOString();
    if (newStatus === "accepted") updates.accepted_at = new Date().toISOString();
    if (newStatus === "declined") updates.declined_at = new Date().toISOString();
    await supabase.from("platform_quotes").update(updates).eq("id", quote.id);
    toast.success(`Quote marked as ${newStatus}`);
    onUpdate();
  };

  const isApproved = quote.status === "approved" || quote.status === "accepted" || quote.status === "won";

  const previewUrl = (() => {
    const sc = quote.quote_number?.split("-")[0]?.toLowerCase() || "gcp";
    return `${window.location.origin}/platform/quote-display/${sc}/${quote.id}`;
  })();

  return (
    <div className="space-y-6 pt-2">
      <SheetHeader>
        <div className="flex items-center gap-2">
          {biz && <InlineBadge shortcode={biz.shortcode as string} color={biz.default_business_color as string | undefined} />}
          <SheetTitle className="font-mono text-lg text-foreground">{quote.quote_number}</SheetTitle>
        </div>
        <p className="font-body text-sm text-muted-foreground">{quote.customer_name}</p>
      </SheetHeader>

      {/* Preview Quote button */}
      <Button size="sm" variant="outline" className="w-full gap-2 border-primary/30 text-primary text-xs mb-2" onClick={() => window.open(previewUrl, "_blank")}>
        <Eye className="w-3.5 h-3.5" /> Preview Quote (Customer View)
      </Button>

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
        {isApproved && (
          <>
          <Button size="sm" className="gap-1 text-xs" disabled={converting}
            onClick={async () => {
              setConverting(true);
              await handleConvertToInvoice(quote, businesses as Array<Record<string, unknown>>, onUpdate);
              setConverting(false);
              onClose();
            }}>
            <Receipt className="w-3 h-3" /> {converting ? "Converting..." : "Convert to Invoice"}
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs"
            onClick={() => {
              openSheet("job", {
                customer: quote.customer_id ? {
                  id: quote.customer_id,
                  display_name: quote.customer_name || "Customer",
                  phone: null,
                  email: null,
                } : null,
                title: `Quote ${quote.quote_number}`,
                description: lineItems.map(li => `• ${li.description} (${li.quantity} ${li.unit})`).join("\n") || undefined,
                total: quote.total ?? null,
                fromQuoteId: quote.id,
              });
              onClose();
            }}>
            <Briefcase className="w-3 h-3" /> Convert to Job
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
        {(quote.discount_total ?? 0) > 0 && (
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
            <span className="text-muted-foreground">Deposit ({quote.deposit_type === "percentage" ? `${quote.deposit_value}%` : `$${quote.deposit_value}`})</span>
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
            {lineItems.map(li => (
              <div key={li.id} className="bg-secondary/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between">
                  <p className="font-body text-sm text-foreground">{li.description}</p>
                  <p className="font-mono text-sm text-foreground font-medium">${li.line_total.toFixed(2)}</p>
                </div>
                <p className="font-body text-xs text-muted-foreground">
                  {li.quantity} {li.unit} × ${li.unit_price.toFixed(2)}
                  {li.discount_amount > 0 && <span className="text-destructive"> (-${li.discount_amount.toFixed(2)})</span>}
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

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        {quote.valid_until && (
          <div><p className="font-body text-[10px] text-muted-foreground">Valid Until</p>
            <p className="font-body text-sm text-foreground">{format(new Date(quote.valid_until), "MMM d, yyyy")}</p></div>
        )}
        {quote.sent_at && (
          <div><p className="font-body text-[10px] text-muted-foreground">Sent</p>
            <p className="font-body text-sm text-foreground">{format(new Date(quote.sent_at), "MMM d, h:mm a")}</p></div>
        )}
        {quote.accepted_at && (
          <div><p className="font-body text-[10px] text-muted-foreground">Accepted</p>
            <p className="font-body text-sm text-primary">{format(new Date(quote.accepted_at), "MMM d, h:mm a")}</p></div>
        )}
      </div>

      {/* Versions */}
      {versions.length > 0 && (
        <div className="space-y-2">
          <button onClick={() => setShowVersions(!showVersions)} className="flex items-center gap-1.5 font-body text-xs text-muted-foreground hover:text-foreground">
            <History className="w-3 h-3" /> {versions.length} version{versions.length !== 1 ? "s" : ""}
            <ChevronRight className={cn("w-3 h-3 transition-transform", showVersions && "rotate-90")} />
          </button>
          {showVersions && (
            <div className="space-y-1.5 pl-4 border-l border-border">
              {versions.map(v => (
                <div key={v.id as string} className="text-xs font-body text-muted-foreground">
                  v{v.version_number as number} — {format(new Date(v.created_at as string), "MMM d, yyyy h:mm a")}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] font-body text-muted-foreground/50">
        Created {format(new Date(quote.created_at), "MMM d, yyyy h:mm a")} · v{quote.version_number}
      </div>
    </div>
  );
}
