import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search, Plus, X, Calendar, User, Building2, FileText,
  Eye, Save, Send, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import QuotePreviewPanel from "./QuotePreviewPanel";
import SendQuoteModal from "./SendQuoteModal";
import { useQuery } from "@tanstack/react-query";
import { generateQuoteNumber, calculateQuoteTotals } from "@/hooks/usePlatformQuotes";
import { downloadElementAsPdf } from "@/lib/download-pdf";

interface LineItem {
  id: string;
  description: string;
  qty: string;
  price: string;
}

interface SavedItem {
  id: string;
  name: string;
  description: string | null;
  default_price: number;
}

interface CustomerResult {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  source?: string;
}

interface QuoteBuilderProps {
  businessId: string;
  businesses: Array<{
    id: string;
    public_brand_name: string;
    shortcode: string;
    logo_url: string | null;
    default_business_color?: string;
  }>;
  userId: string | null;
  onClose: () => void;
  onCreated: () => void;
}

let lineIdCounter = 0;
function newLineId() { return `qline-${++lineIdCounter}-${Date.now()}`; }

export default function QuoteBuilder({ businessId, businesses, userId, onClose, onCreated }: QuoteBuilderProps) {
  const [bizId, setBizId] = useState(businessId || businesses[0]?.id || "");
  const activeBiz = businesses.find(b => b.id === bizId);

  // Form state
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSource, setCustomerSource] = useState<"platform" | "jobber">("platform");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("Generating…");
  const [quoteDate, setQuoteDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ id: newLineId(), description: "", qty: "1", price: "" }]);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState("7");
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<"$" | "%">("$");
  const [discountValue, setDiscountValue] = useState("0");
  const [depositEnabled, setDepositEnabled] = useState(true);
  const [depositType, setDepositType] = useState<"%" | "$">("%");
  const [depositValue, setDepositValue] = useState("50");
  const [publicNotes, setPublicNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // UI state
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [showSavedItems, setShowSavedItems] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const mobilePreviewRef = useRef<HTMLDivElement>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch logo
  const { data: brandAssets } = useQuery({
    queryKey: ['brand-assets-quote', bizId],
    queryFn: async () => {
      const { data } = await supabase.from('business_brand_assets').select('file_url, asset_type').eq('business_id', bizId);
      return data || [];
    },
    enabled: !!bizId,
  });
  const logoUrl = brandAssets?.find(a => a.asset_type === 'logo')?.file_url || activeBiz?.logo_url || null;

  // Generate quote number
  useEffect(() => {
    (async () => {
      try {
        const num = await generateQuoteNumber(bizId);
        setQuoteNumber(num);
      } catch { setQuoteNumber("Q-ERROR"); }
    })();
  }, [bizId]);

  // Load saved items
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("platform_saved_items").select("id, name, description, default_price").eq("business_id", bizId).order("name");
      setSavedItems((data as SavedItem[]) || []);
    })();
  }, [bizId]);

  // Customer search — show recent customers on focus, filter on type.
  useEffect(() => {
    const timer = setTimeout(async () => {
      const hasQuery = customerSearch && customerSearch.length >= 1;
      const like = `%${customerSearch}%`;
      const [jobberRes, platformRes] = await Promise.all([
        hasQuery
          ? supabase.from("jobber_clients").select("id, display_name, email, phone, company_name").eq("business_id", bizId)
              .or(`display_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`).limit(20)
          : supabase.from("jobber_clients").select("id, display_name, email, phone, company_name").eq("business_id", bizId)
              .order("display_name", { ascending: true }).limit(20),
        hasQuery
          ? supabase.from("platform_customers").select("id, display_name, email, phone, company_name").eq("business_id", bizId)
              .or(`display_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`).limit(20)
          : supabase.from("platform_customers").select("id, display_name, email, phone, company_name").eq("business_id", bizId)
              .order("display_name", { ascending: true }).limit(20),
      ]);
      const seen = new Set<string>();
      const combined: CustomerResult[] = [];
      for (const c of (jobberRes.data || [])) { const k = c.display_name?.toLowerCase(); if (k && !seen.has(k)) { seen.add(k); combined.push({ ...c, source: "jobber" }); } }
      for (const c of (platformRes.data || [])) { const k = c.display_name?.toLowerCase(); if (k && !seen.has(k)) { seen.add(k); combined.push({ ...c, source: "platform" }); } }
      setCustomerResults(combined.slice(0, 25));
    }, 200);
    return () => clearTimeout(timer);
  }, [customerSearch, bizId]);

  // Set default notes
  useEffect(() => {
    if (!publicNotes) setPublicNotes(`Thank you for considering ${activeBiz?.public_brand_name || "us"}! We look forward to working with you.`);
  }, [activeBiz?.public_brand_name]);

  // Calculations
  const subtotal = useMemo(() => lineItems.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0), [lineItems]);
  const taxAmount = taxEnabled ? subtotal * (Number(taxRate) || 0) / 100 : 0;
  const discountAmount = discountEnabled ? discountType === "%" ? subtotal * (Number(discountValue) || 0) / 100 : Number(discountValue) || 0 : 0;
  const total = Math.max(0, subtotal + taxAmount - discountAmount);
  const depositAmount = depositEnabled ? depositType === "%" ? total * (Number(depositValue) || 0) / 100 : Number(depositValue) || 0 : 0;

  const addLine = () => setLineItems([...lineItems, { id: newLineId(), description: "", qty: "1", price: "" }]);
  const removeLine = (id: string) => setLineItems(lineItems.filter(l => l.id !== id));
  const updateLine = (id: string, field: keyof LineItem, val: string) =>
    setLineItems(lineItems.map(l => l.id === id ? { ...l, [field]: val } : l));

  const addSavedItem = (item: SavedItem) => {
    setLineItems([...lineItems, { id: newLineId(), description: item.description || item.name, qty: "1", price: String(item.default_price) }]);
    setShowSavedItems(false);
  };

  const selectCustomer = (c: CustomerResult) => {
    setCustomerId(c.id); setCustomerSource((c.source as "platform" | "jobber") || "platform");
    setCustomerName(c.display_name); setCustomerEmail(c.email || ""); setCustomerPhone(c.phone || "");
    setShowCustomerSearch(false); setCustomerSearch("");
  };

  const setQuickValid = (days: number) => {
    setValidUntil(format(addDays(new Date(quoteDate), days), "yyyy-MM-dd"));
  };

  // Preview data
  const previewData = useMemo(() => ({
    quoteNumber, quoteDate, validUntil,
    customerName: customerName || "Customer Name", customerEmail, customerPhone,
    lineItems: lineItems.filter(l => l.description.trim()).map(l => ({
      description: l.description, quantity: Number(l.qty) || 1,
      unit_price: Number(l.price) || 0, line_total: (Number(l.qty) || 1) * (Number(l.price) || 0),
    })),
    subtotal, taxRate: taxEnabled ? Number(taxRate) : 0, taxAmount, discountAmount, total,
    depositRequired: depositEnabled, depositAmount, scopeOfWork, publicNotes,
    businessName: activeBiz?.public_brand_name || "", shortcode: activeBiz?.shortcode || "gcp",
    isDraft: true, logoUrl,
  }), [quoteNumber, quoteDate, validUntil, customerName, customerEmail, customerPhone, lineItems, subtotal, taxEnabled, taxRate, taxAmount, discountAmount, total, depositEnabled, depositAmount, scopeOfWork, publicNotes, activeBiz, logoUrl]);

  // Save quote
  const handleSave = async (sendAfter: boolean = false, sendData: { email: string; subject: string; message: string; sendEmail: boolean; sendSms: boolean } | null = null) => {
    if (!bizId) return;
    if (!customerId) { toast.error("Please select a customer"); return; }
    const validLines = lineItems.filter(l => l.description.trim());
    if (validLines.length === 0) { toast.error("Add at least one line item"); return; }

    setSaving(true);

    // Resolve customer
    let resolvedCustomerId = customerId;
    if (customerSource === "jobber" && customerId) {
      const { data: existing } = await supabase.from("platform_customers").select("id")
        .eq("business_id", bizId).eq("source_system", "jobber").eq("source_record_id", customerId).maybeSingle();
      if (existing) { resolvedCustomerId = existing.id; }
      else {
        const { data: newCust, error: custErr } = await supabase.from("platform_customers").insert({
          business_id: bizId, display_name: customerName, email: customerEmail || null,
          phone: customerPhone || null, source_system: "jobber", source_record_id: customerId,
        }).select("id").single();
        if (custErr || !newCust) { toast.error("Failed to create customer record"); setSaving(false); return; }
        resolvedCustomerId = newCust.id;
      }
    }

    const { data: quote, error } = await supabase.from("platform_quotes").insert({
      business_id: bizId, quote_number: quoteNumber, customer_id: resolvedCustomerId,
      status: "draft", subtotal, discount_total: discountAmount,
      tax_rate: taxEnabled ? Number(taxRate) : 0, tax_total: taxAmount, total,
      deposit_required_flag: depositEnabled, deposit_type: depositType === "%" ? "percentage" : "fixed",
      deposit_value: Number(depositValue), deposit_amount_calculated: depositAmount,
      valid_until: validUntil, scope_of_work: scopeOfWork || null,
      internal_notes: internalNotes || null, public_notes: publicNotes || null,
      created_by_user_id: userId, last_modified_by_user_id: userId,
    }).select().single();

    if (error || !quote) { toast.error(error?.message || "Failed to create quote"); setSaving(false); return; }

    // Insert line items
    await supabase.from("platform_quote_line_items").insert(
      validLines.map((l, i) => ({
        business_id: bizId, quote_id: quote.id, description: l.description,
        quantity: Number(l.qty) || 1, unit: "each", unit_price: Number(l.price) || 0,
        discount_amount: 0, taxable_flag: true,
        line_total: (Number(l.qty) || 1) * (Number(l.price) || 0), sort_order: i,
      }))
    );

    // Save initial version
    await supabase.from("platform_quote_versions").insert([{
      quote_id: quote.id, business_id: bizId, version_number: 1,
      snapshot_json: JSON.parse(JSON.stringify({ quote, line_items: validLines })),
      created_by_user_id: userId,
    }]);

    if (sendAfter && sendData) {
      const shortcode = activeBiz?.shortcode || "gcp";
      const quoteUrl = `${window.location.origin}/quote/${shortcode}/${quote.id}`;

      // Send email
      if (sendData.sendEmail && sendData.email) {
        try {
          const { data: fnRes, error: fnErr } = await supabase.functions.invoke("send-quote-email", {
            body: {
              quoteId: quote.id, recipientEmail: sendData.email, recipientName: customerName,
              subject: sendData.subject, message: sendData.message,
              businessName: activeBiz?.public_brand_name || "", quoteNumber,
              quoteUrl,
              ownerEmail: "dominicriddleofficial@gmail.com",
            },
          });
          const functionError = fnErr?.message || fnRes?.error;
          if (functionError) { toast.error(`Quote created but email failed: ${functionError}`); }
          else { toast.success(`Quote sent to ${customerName} at ${sendData.email}`); }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          toast.error(`Quote created but email failed: ${msg}`);
        }
      }

      // Send SMS
      if (sendData.sendSms) {
        if (!customerPhone) {
          toast.error("SMS skipped: no phone number on file for this customer");
        } else {
          try {
            const smsMessage = `Hi ${customerName}, ${activeBiz?.public_brand_name || "Gulf Coast Palms"} has sent you a quote for $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}. View and approve here: ${quoteUrl} Reply STOP to unsubscribe.`;
            console.log("[SMS] sending quote text", { to: customerPhone, customerName, quoteUrl });
            const { error: smsErr } = await supabase.functions.invoke("send-sms", {
              body: { to: customerPhone, message: smsMessage },
            });
            if (smsErr) {
              console.error("[SMS] send error:", smsErr);
              toast.error(`SMS failed: ${smsErr.message || "Unknown error"}`);
            } else {
              toast.success(`Text sent to ${customerPhone}`);
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            console.error("[SMS] exception:", e);
            toast.error(`SMS error: ${msg}`);
          }
        }
      }

      // Update status to sent
      await supabase.from("platform_quotes").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", quote.id);
    } else {
      toast.success("Quote created");
    }

    setSaving(false);
    onCreated();
  };

  return (
    <>
      <div className="ops-theme fixed inset-0 z-50 bg-background text-foreground flex flex-col invoice-form">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors -ml-2 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight">New Quote</h1>
              <p className="font-mono text-xs text-muted-foreground tracking-tight">{quoteNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="font-body text-xs md:hidden" onClick={() => setShowMobilePreview(true)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="font-body text-xs hidden md:flex" onClick={() => setShowMobilePreview(true)}>
              <Eye className="w-3.5 h-3.5 mr-1" /> Full Preview
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Form */}
          <div className="flex-1 md:w-[60%] overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Business & Customer */}
            <section className="space-y-4">
              <SectionHeader title="Business & Customer" icon={Building2} />
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="font-body text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">From</p>
                <p className="font-body text-sm font-semibold text-foreground">{activeBiz?.public_brand_name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{activeBiz?.shortcode?.toUpperCase()}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-body text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Prepared For</p>
                  {customerId && (
                    <button className="font-body text-[10px] text-primary hover:underline" onClick={() => { setCustomerId(null); setCustomerName(""); setShowCustomerSearch(true); }}>Change</button>
                  )}
                </div>
                {customerId ? (
                  <div>
                    <p className="font-body text-sm font-semibold text-foreground">{customerName}</p>
                    {customerEmail && <p className="font-body text-xs text-muted-foreground">{customerEmail}</p>}
                    {customerPhone && <p className="font-body text-xs text-muted-foreground">{customerPhone}</p>}
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search customer…" value={customerSearch}
                      onChange={e => { setCustomerSearch(e.target.value); setShowCustomerSearch(true); }}
                      onFocus={() => setShowCustomerSearch(true)}
                      className="pl-8 bg-secondary/50 border-border font-body text-sm" />
                    {showCustomerSearch && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {customerResults.length > 0 ? customerResults.map(c => (
                          <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors" onClick={() => selectCustomer(c)}>
                            <p className="font-body text-sm font-medium text-foreground">{c.display_name}</p>
                            <p className="font-body text-[10px] text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
                          </button>
                        )) : (
                          <p className="px-3 py-3 font-body text-xs text-muted-foreground text-center">No customers found</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Quote Details */}
            <section className="space-y-3">
              <SectionHeader title="Quote Details" icon={FileText} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Quote #</label>
                  <span className="font-mono text-sm text-foreground">{quoteNumber}</span>
                </div>
                <div>
                  <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Quote Date</label>
                  <Input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} className="bg-card border-border font-body text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Valid Until</label>
                  <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="bg-card border-border font-body text-sm" />
                  <div className="flex gap-1.5 mt-1.5">
                    {[7, 14, 30].map(d => (
                      <button key={d} onClick={() => setQuickValid(d)}
                        className={cn("px-2.5 py-1 rounded-full text-[10px] font-body font-semibold border transition-all bg-secondary text-muted-foreground border-border hover:text-foreground")}>
                        {d} days
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Scope of Work</label>
                <Textarea value={scopeOfWork} onChange={e => setScopeOfWork(e.target.value)}
                  placeholder="Describe the full job scope shown to the customer…"
                  className="bg-card border-border font-body text-sm min-h-[80px]" />
              </div>
            </section>

            {/* Line Items */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <SectionHeader title="Line Items" icon={Package} />
                <div className="flex gap-1.5">
                  {savedItems.length > 0 && (
                    <div className="relative">
                      <Button size="sm" variant="ghost" className="font-body text-[10px] text-primary h-6 px-2" onClick={() => setShowSavedItems(!showSavedItems)}>
                        <Package className="w-3 h-3 mr-1" /> Saved Items
                      </Button>
                      {showSavedItems && (
                        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 w-56 max-h-48 overflow-y-auto">
                          {savedItems.map(item => (
                            <button key={item.id} className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors" onClick={() => addSavedItem(item)}>
                              <p className="font-body text-xs font-medium text-foreground">{item.name}</p>
                              <p className="font-body text-[10px] text-muted-foreground">{item.default_price > 0 ? `$${item.default_price}` : "Price varies"}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <Button size="sm" variant="ghost" className="font-body text-[10px] text-primary h-6 px-2" onClick={addLine}>
                    <Plus className="w-3 h-3 mr-1" /> Add Line
                  </Button>
                </div>
              </div>
              <div className="hidden md:grid md:grid-cols-[1fr_80px_100px_100px_32px] gap-2 px-1">
                <span className="font-body text-[10px] font-medium text-muted-foreground uppercase">Description</span>
                <span className="font-body text-[10px] font-medium text-muted-foreground uppercase text-center">Qty</span>
                <span className="font-body text-[10px] font-medium text-muted-foreground uppercase text-right">Unit Price</span>
                <span className="font-body text-[10px] font-medium text-muted-foreground uppercase text-right">Total</span>
                <span />
              </div>
              <div className="space-y-2">
                {lineItems.map(line => {
                  const lineTotal = (Number(line.qty) || 0) * (Number(line.price) || 0);
                  return (
                    <div key={line.id} className="grid grid-cols-1 md:grid-cols-[1fr_80px_100px_100px_32px] gap-2 bg-card border border-border rounded-lg p-2.5 md:p-2 md:rounded-none md:border-0 md:border-b md:bg-transparent">
                      <Input placeholder="Service description…" value={line.description} onChange={e => updateLine(line.id, "description", e.target.value)} className="bg-secondary/50 border-border font-body text-sm" />
                      <div className="flex gap-2 md:contents">
                        <div className="flex-1 md:flex-none">
                          <Input type="number" min="1" placeholder="Qty" value={line.qty} onChange={e => updateLine(line.id, "qty", e.target.value)} className="bg-secondary/50 border-border font-body text-sm text-center" />
                        </div>
                        <div className="flex-1 md:flex-none">
                          <Input type="number" step="0.01" placeholder="$0.00" value={line.price} onChange={e => updateLine(line.id, "price", e.target.value)} className="bg-secondary/50 border-border font-body text-sm text-right" />
                        </div>
                        <div className="flex items-center justify-end gap-2 md:contents">
                          <span className="font-body text-sm font-medium text-foreground md:text-right">${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          {lineItems.length > 1 && (
                            <button onClick={() => removeLine(line.id)} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Totals */}
            <section className="space-y-2">
              <div className="flex justify-end">
                <div className="w-full md:w-64 space-y-2">
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => setTaxEnabled(!taxEnabled)} className="flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-foreground">
                      <div className={cn("w-3.5 h-3.5 rounded border transition-colors", taxEnabled ? "bg-primary border-primary" : "border-border")} /> Tax
                    </button>
                    {taxEnabled && (
                      <div className="flex items-center gap-1">
                        <Input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="w-14 h-7 text-xs text-right bg-secondary/50 border-border" />
                        <span className="text-xs text-muted-foreground">%</span>
                        <span className="text-sm text-foreground ml-2">${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => setDiscountEnabled(!discountEnabled)} className="flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-foreground">
                      <div className={cn("w-3.5 h-3.5 rounded border transition-colors", discountEnabled ? "bg-primary border-primary" : "border-border")} /> Discount
                    </button>
                    {discountEnabled && (
                      <div className="flex items-center gap-1">
                        <Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="w-14 h-7 text-xs text-right bg-secondary/50 border-border" />
                        <button onClick={() => setDiscountType(discountType === "$" ? "%" : "$")} className="text-xs font-bold text-primary border border-primary/30 rounded px-1.5 py-0.5">{discountType}</button>
                        <span className="text-sm text-foreground ml-2">-${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-body text-base font-bold text-foreground">Total</span>
                    <span className="font-body text-xl font-bold text-primary">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => setDepositEnabled(!depositEnabled)} className="flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-foreground">
                      <div className={cn("w-3.5 h-3.5 rounded border transition-colors", depositEnabled ? "bg-primary border-primary" : "border-border")} /> Deposit Required
                    </button>
                    {depositEnabled && (
                      <div className="flex items-center gap-1">
                        <Input type="number" value={depositValue} onChange={e => setDepositValue(e.target.value)} className="w-14 h-7 text-xs text-right bg-secondary/50 border-border" />
                        <button onClick={() => setDepositType(depositType === "%" ? "$" : "%")} className="text-xs font-bold text-primary border border-primary/30 rounded px-1.5 py-0.5">{depositType}</button>
                        <span className="text-sm text-primary ml-2">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Notes */}
            <section className="space-y-3">
              <SectionHeader title="Notes & Terms" icon={FileText} />
              <div>
                <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Message to Customer</label>
                <Textarea value={publicNotes} onChange={e => setPublicNotes(e.target.value)} placeholder="Thank you for considering us!" className="bg-card border-border font-body text-sm min-h-[60px]" />
              </div>
              <div>
                <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Internal Notes (not visible to customer)</label>
                <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Internal notes…" className="bg-card border-border font-body text-sm min-h-[60px]" />
              </div>
            </section>

            {/* Actions */}
            <section className="flex flex-col sm:flex-row gap-2 pb-8">
              <Button variant="outline" className="flex-1 font-body text-sm" disabled={saving} onClick={() => handleSave(false)}>
                <Save className="w-4 h-4 mr-1.5" /> Save as Draft
              </Button>
              <Button className="flex-1 font-body text-sm" disabled={saving}
                onClick={() => {
                  if (!customerId) { toast.error("Please select a customer"); return; }
                  if (lineItems.filter(l => l.description.trim()).length === 0) { toast.error("Add at least one line item"); return; }
                  setShowSendModal(true);
                }}>
                <Send className="w-4 h-4 mr-1.5" /> Send Quote
              </Button>
            </section>
          </div>

          {/* Right: Live Preview */}
          <div className="hidden md:block w-[40%] border-l border-border overflow-y-auto bg-secondary/30">
            <div className="p-4">
              <p className="font-body text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Live Preview</p>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden transform scale-[0.75] origin-top">
                <QuotePreviewPanel data={previewData} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Preview */}
      <Sheet open={showMobilePreview} onOpenChange={setShowMobilePreview}>
        <SheetContent side="bottom" className="h-[95vh] p-0 bg-[#0a0f0a] border-t border-border overflow-hidden flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
            <SheetTitle className="text-foreground font-display text-base">Quote Preview</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="max-w-[480px] mx-auto" ref={mobilePreviewRef}><QuotePreviewPanel data={previewData} /></div>
          </div>
          <div className="shrink-0 px-4 py-3 border-t border-border bg-background flex gap-2">
            <Button variant="outline" className="flex-1 font-body text-sm" onClick={async () => {
              try {
                await downloadElementAsPdf(mobilePreviewRef.current, `Quote-${quoteNumber || "draft"}.pdf`);
              } catch (err) {
                console.error("PDF download failed", err);
                toast.error("Could not generate PDF");
              }
            }}>Download PDF</Button>
            <Button variant="ghost" className="font-body text-sm" onClick={() => setShowMobilePreview(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Send Modal */}
      {showSendModal && (
        <SendQuoteModal
          customerName={customerName} customerEmail={customerEmail} customerPhone={customerPhone}
          quoteNumber={quoteNumber} validUntil={validUntil}
          businessName={activeBiz?.public_brand_name || ""} shortcode={activeBiz?.shortcode || "gcp"}
          total={total} quoteUrl={`${window.location.origin}/quote/${activeBiz?.shortcode || "gcp"}/PENDING`}
          onSend={async (data) => { await handleSave(true, data); setShowSendModal(false); }}
          onClose={() => setShowSendModal(false)} saving={saving}
        />
      )}
    </>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <h3 className="font-display text-xs font-semibold text-foreground uppercase tracking-wider">{title}</h3>
    </div>
  );
}
