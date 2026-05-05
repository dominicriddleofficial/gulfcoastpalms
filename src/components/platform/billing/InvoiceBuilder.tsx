import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search, Plus, X, ChevronDown, Calendar, User, Building2, FileText,
  Eye, Save, Send, Trash2, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import InvoicePreviewPanel from "./InvoicePreviewPanel";
import SendInvoiceModal from "./SendInvoiceModal";
import { useQuery } from "@tanstack/react-query";

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
  address?: string;
  source?: string;
}

interface SendInvoiceData {
  email: string;
  subject: string;
  message: string;
  ccEmail: string;
  sendEmail: boolean;
  sendSms: boolean;
}

interface InvoiceBuilderProps {
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
function newLineId() { return `line-${++lineIdCounter}-${Date.now()}`; }

export default function InvoiceBuilder({ businessId, businesses, userId, onClose, onCreated }: InvoiceBuilderProps) {
  const biz = businesses.find(b => b.id === businessId);

  // Form state
  const [bizId, setBizId] = useState(businessId || businesses[0]?.id || "");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSource, setCustomerSource] = useState<"platform" | "jobber">("platform");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("Generating…");
  const [invoiceNumberOverride, setInvoiceNumberOverride] = useState(false);
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [poNumber, setPoNumber] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ id: newLineId(), description: "", qty: "1", price: "" }]);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState("7");
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<"$" | "%">("$");
  const [discountValue, setDiscountValue] = useState("0");
  const [publicNotes, setPublicNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [terms, setTerms] = useState("Due on receipt");

  // UI state
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [showSavedItems, setShowSavedItems] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeBiz = businesses.find(b => b.id === bizId);

  // Fetch logo for invoice preview
  const { data: brandAssets } = useQuery({
    queryKey: ['brand-assets-invoice', bizId],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_brand_assets')
        .select('file_url, asset_type, usage_context')
        .eq('business_id', bizId);
      return data || [];
    },
    enabled: !!bizId,
  });
  const logoAsset = brandAssets?.find(a => a.asset_type === 'logo');
  const logoUrl = logoAsset?.file_url || activeBiz?.logo_url || null;

  // Generate invoice number on mount
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("generate_next_number", {
        _business_id: bizId,
        _record_type: "invoice",
      });
      if (!error && data) setInvoiceNumber(data);
      else setInvoiceNumber("INV-ERROR");
    })();
  }, [bizId]);

  // Load saved items
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_saved_items")
        .select("id, name, description, default_price")
        .eq("business_id", bizId)
        .order("name");
      setSavedItems((data as SavedItem[]) || []);
    })();
  }, [bizId]);

  // Customer search — searches both jobber_clients and platform_customers.
  // When the search is empty, show the first batch of customers so the list
  // is never blank on focus.
  useEffect(() => {
    const timer = setTimeout(async () => {
      const hasQuery = customerSearch && customerSearch.length >= 1;
      const like = `%${customerSearch}%`;
      const baseJobber = supabase
        .from("jobber_clients")
        .select("id, display_name, email, phone, company_name")
        .eq("business_id", bizId)
        .order("display_name", { ascending: true })
        .limit(20);
      const basePlatform = supabase
        .from("platform_customers")
        .select("id, display_name, email, phone, company_name")
        .eq("business_id", bizId)
        .order("display_name", { ascending: true })
        .limit(20);
      const [jobberRes, platformRes] = await Promise.all([
        hasQuery
          ? supabase
              .from("jobber_clients")
              .select("id, display_name, email, phone, company_name")
              .eq("business_id", bizId)
              .or(`display_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
              .limit(20)
          : baseJobber,
        hasQuery
          ? supabase
              .from("platform_customers")
              .select("id, display_name, email, phone, company_name")
              .eq("business_id", bizId)
              .or(`display_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
              .limit(20)
          : basePlatform,
      ]);
      const seen = new Set<string>();
      const combined: CustomerResult[] = [];
      for (const c of (jobberRes.data || [])) {
        const key = c.display_name?.toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          combined.push({ ...c, source: "jobber" } as CustomerResult);
        }
      }
      for (const c of (platformRes.data || [])) {
        const key = c.display_name?.toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          combined.push({ ...c, source: "platform" } as CustomerResult);
        }
      }
      setCustomerResults(combined.slice(0, 25));
    }, 200);
    return () => clearTimeout(timer);
  }, [customerSearch, bizId]);

  // Set default public notes
  useEffect(() => {
    if (!publicNotes) {
      setPublicNotes(`Thank you for choosing ${activeBiz?.public_brand_name || "us"}! We appreciate your business.`);
    }
  }, [activeBiz?.public_brand_name]);

  // Calculations
  const subtotal = useMemo(() =>
    lineItems.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0),
    [lineItems]
  );
  const taxAmount = taxEnabled ? subtotal * (Number(taxRate) || 0) / 100 : 0;
  const discountAmount = discountEnabled
    ? discountType === "%" ? subtotal * (Number(discountValue) || 0) / 100 : Number(discountValue) || 0
    : 0;
  const total = Math.max(0, subtotal + taxAmount - discountAmount);

  // Line item helpers
  const addLine = () => setLineItems([...lineItems, { id: newLineId(), description: "", qty: "1", price: "" }]);
  const removeLine = (id: string) => setLineItems(lineItems.filter(l => l.id !== id));
  const updateLine = (id: string, field: keyof LineItem, val: string) =>
    setLineItems(lineItems.map(l => l.id === id ? { ...l, [field]: val } : l));

  const addSavedItem = (item: SavedItem) => {
    setLineItems([...lineItems, {
      id: newLineId(),
      description: item.description || item.name,
      qty: "1",
      price: String(item.default_price),
    }]);
    setShowSavedItems(false);
  };

  const selectCustomer = (c: CustomerResult) => {
    setCustomerId(c.id);
    setCustomerSource((c.source as "platform" | "jobber") || "platform");
    setCustomerName(c.display_name);
    setCustomerEmail(c.email || "");
    setCustomerPhone(c.phone || "");
    setShowCustomerSearch(false);
    setCustomerSearch("");
  };

  const setQuickTerms = (days: number | null) => {
    if (days === null) {
      setTerms("Due on receipt");
      setDueDate(format(new Date(), "yyyy-MM-dd"));
    } else {
      setTerms(`Net ${days}`);
      setDueDate(format(addDays(new Date(issueDate), days), "yyyy-MM-dd"));
    }
  };

  // Preview data
  const previewData = useMemo(() => ({
    invoiceNumber,
    issueDate,
    dueDate,
    customerName: customerName || "Customer Name",
    customerEmail,
    customerPhone,
    lineItems: lineItems.filter(l => l.description.trim()).map(l => ({
      description: l.description,
      quantity: Number(l.qty) || 1,
      unit_price: Number(l.price) || 0,
      line_total: (Number(l.qty) || 1) * (Number(l.price) || 0),
    })),
    subtotal,
    taxRate: taxEnabled ? Number(taxRate) : 0,
    taxAmount,
    discountAmount,
    total,
    publicNotes,
    businessName: activeBiz?.public_brand_name || "",
    shortcode: activeBiz?.shortcode || "gcp",
    isDraft: true,
    logoUrl: logoUrl,
  }), [invoiceNumber, issueDate, dueDate, customerName, customerEmail, customerPhone, lineItems, subtotal, taxEnabled, taxRate, taxAmount, discountAmount, total, publicNotes, activeBiz, logoUrl]);

  // Save invoice
  const handleSave = async (sendAfter: boolean = false, sendData: SendInvoiceData | null = null) => {
    if (!bizId) return;
    if (!customerId) { toast.error("Please select a customer"); return; }
    const validLines = lineItems.filter(l => l.description.trim());
    if (validLines.length === 0) { toast.error("Add at least one line item"); return; }

    setSaving(true);

    // If customer came from jobber_clients, find or create a platform_customer
    let resolvedCustomerId = customerId;
    if (customerSource === "jobber" && customerId) {
      const { data: existing } = await supabase
        .from("platform_customers")
        .select("id")
        .eq("business_id", bizId)
        .eq("source_system", "jobber")
        .eq("source_record_id", customerId)
        .maybeSingle();
      if (existing) {
        resolvedCustomerId = existing.id;
      } else {
        const { data: newCust, error: custErr } = await supabase
          .from("platform_customers")
          .insert({
            business_id: bizId,
            display_name: customerName,
            email: customerEmail || null,
            phone: customerPhone || null,
            source_system: "jobber",
            source_record_id: customerId,
          })
          .select("id")
          .single();
        if (custErr || !newCust) {
          toast.error("Failed to create customer record");
          setSaving(false);
          return;
        }
        resolvedCustomerId = newCust.id;
      }
    }

    const { data: inv, error } = await supabase.from("platform_invoices").insert({
      business_id: bizId,
      invoice_number: invoiceNumber,
      customer_id: resolvedCustomerId,
      status: "draft",
      terms,
      issue_date: issueDate,
      due_date: dueDate,
      subtotal,
      tax_rate: taxEnabled ? Number(taxRate) : 0,
      tax_total: taxAmount,
      discount_total: discountAmount,
      total,
      balance_due: total,
      amount_paid: 0,
      public_notes: publicNotes || null,
      internal_notes: internalNotes || null,
      created_by_user_id: userId,
    }).select().single();

    if (error || !inv) {
      toast.error(error?.message || "Failed to create invoice");
      setSaving(false);
      return;
    }

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

    if (sendAfter && sendData) {
      const shortcode = activeBiz?.shortcode || "gcp";
      const paymentUrl = `${window.location.origin}/pay/${shortcode}/${inv.id}`;

      // Send email if enabled
      if (sendData.sendEmail && sendData.email) {
        try {
          const { data: fnRes, error: fnErr } = await supabase.functions.invoke("send-invoice-email", {
            body: {
              invoiceId: inv.id,
              recipientEmail: sendData.email,
              recipientName: customerName,
              subject: sendData.subject,
              message: sendData.message,
              businessName: activeBiz?.public_brand_name || "",
              invoiceNumber,
              total,
              dueDate,
              paymentUrl,
              ccEmail: sendData.ccEmail || null,
              ownerEmail: "dominicriddleofficial@gmail.com",
            },
          });
          const deliveryStatus = fnRes?.deliveryStatus;
          const deliveryError = fnRes?.deliveryError || fnErr?.message || fnRes?.error;
          if (fnRes?.ownerNotificationWarning) {
            console.warn("send-invoice-email owner notification warning:", fnRes.ownerNotificationWarning);
          }
          if (deliveryStatus === "sent") {
            toast.success(`Invoice sent to ${customerName} at ${sendData.email}`);
          } else if (deliveryStatus === "pending" || (!deliveryStatus && !deliveryError)) {
            toast.warning(
              `Invoice queued — delivery is taking longer than usual. Check Email Activity in a few minutes.`,
            );
          } else {
            console.error("send-invoice-email error:", fnErr || fnRes);
            toast.error(
              `Email failed: ${deliveryError || "Unknown error"}. Customer was NOT notified.`,
            );
          }
        } catch (e: any) {
          console.error("send-invoice-email exception:", e);
          toast.error(`Invoice created but email failed: ${e.message}`);
        }
      }

      // Send SMS if toggled on
      if (sendData.sendSms) {
        if (!customerPhone) {
          toast.error("SMS skipped: no phone number on file for this customer");
        } else {
          try {
            const smsMessage = `Hi ${customerName}, your invoice from ${activeBiz?.public_brand_name || "us"} is ready. Total: $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Pay online here: ${paymentUrl} Reply STOP to unsubscribe.`;
            console.log("[SMS] sending invoice text", { to: customerPhone, customerName, paymentUrl });
            const { error: smsErr } = await supabase.functions.invoke("send-sms", {
              body: { to: customerPhone, message: smsMessage },
            });
            if (smsErr) {
              console.error("[SMS] send error:", smsErr);
              toast.error(`SMS failed: ${smsErr.message || "Unknown error"}`);
            } else {
              toast.success(`Text sent to ${customerPhone}`);
            }
          } catch (e: any) {
            console.error("[SMS] exception:", e);
            toast.error(`SMS error: ${e.message}`);
          }
        }
      }

      if (!sendData.sendEmail && !sendData.sendSms) {
        toast.success("Invoice created");
      }
    } else {
      toast.success("Invoice created");
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
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight">New Invoice</h1>
              <p className="font-mono text-xs text-muted-foreground tracking-tight">{invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="font-body text-xs hidden md:flex" onClick={() => setShowMobilePreview(true)}>
              <Eye className="w-3.5 h-3.5 mr-1" /> Full Preview
            </Button>
            <Button variant="outline" size="sm" className="font-body text-xs md:hidden" onClick={() => setShowMobilePreview(true)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Main content — side by side on desktop */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Form */}
          <div className="flex-1 md:w-[60%] overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Section A — Business & Customer */}
            <section className="space-y-4">
              <SectionHeader title="Business & Customer" icon={Building2} />

              {/* From (Business) */}
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="font-body text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">From</p>
                <p className="font-body text-sm font-semibold text-foreground">{activeBiz?.public_brand_name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{activeBiz?.shortcode?.toUpperCase()}</p>
              </div>

              {/* Bill To */}
              <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-body text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Bill To</p>
                  {customerId && (
                    <button className="font-body text-[10px] text-primary hover:underline" onClick={() => { setCustomerId(null); setCustomerName(""); setShowCustomerSearch(true); }}>
                      Change
                    </button>
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
                    <Input
                      placeholder="Search customer by name, phone, or email…"
                      value={customerSearch}
                      onChange={e => { setCustomerSearch(e.target.value); setShowCustomerSearch(true); }}
                      onFocus={() => setShowCustomerSearch(true)}
                      className="pl-8 bg-secondary/50 border-border font-body text-sm"
                    />
                    {showCustomerSearch && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {customerResults.length > 0 ? customerResults.map(c => (
                          <button
                            key={c.id}
                            className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors"
                            onClick={() => selectCustomer(c)}
                          >
                            <p className="font-body text-sm font-medium text-foreground">{c.display_name}</p>
                            <p className="font-body text-[10px] text-muted-foreground">
                              {[c.phone, c.email].filter(Boolean).join(" · ")}
                            </p>
                          </button>
                        )) : (
                          <p className="px-3 py-3 font-body text-xs text-muted-foreground text-center">
                            No customers found — try a phone number or email
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Section B — Invoice Details */}
            <section className="space-y-3">
              <SectionHeader title="Invoice Details" icon={FileText} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Invoice #</label>
                  {invoiceNumberOverride ? (
                    <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                      className="bg-card border-border font-mono text-sm" />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm text-foreground">{invoiceNumber}</span>
                      <button className="text-muted-foreground hover:text-foreground" onClick={() => setInvoiceNumberOverride(true)}>
                        <FileText className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">P.O. # (optional)</label>
                  <Input value={poNumber} onChange={e => setPoNumber(e.target.value)}
                    placeholder="PO-1234" className="bg-card border-border font-body text-sm" />
                </div>
                <div>
                  <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Invoice Date</label>
                  <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                    className="bg-card border-border font-body text-sm" />
                </div>
                <div>
                  <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Due Date</label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="bg-card border-border font-body text-sm" />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { label: "Due on Receipt", days: null },
                  { label: "Net 7", days: 7 },
                  { label: "Net 15", days: 15 },
                  { label: "Net 30", days: 30 },
                ].map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => setQuickTerms(opt.days)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-body font-semibold border transition-all",
                      terms === (opt.days === null ? "Due on receipt" : `Net ${opt.days}`)
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Section C — Line Items */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <SectionHeader title="Line Items" icon={Package} />
                <div className="flex gap-1.5">
                  {savedItems.length > 0 && (
                    <div className="relative">
                      <Button size="sm" variant="ghost" className="font-body text-[10px] text-primary h-6 px-2"
                        onClick={() => setShowSavedItems(!showSavedItems)}>
                        <Package className="w-3 h-3 mr-1" /> Saved Items
                      </Button>
                      {showSavedItems && (
                        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 w-56 max-h-48 overflow-y-auto">
                          {savedItems.map(item => (
                            <button key={item.id} className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors"
                              onClick={() => addSavedItem(item)}>
                              <p className="font-body text-xs font-medium text-foreground">{item.name}</p>
                              <p className="font-body text-[10px] text-muted-foreground">
                                {item.default_price > 0 ? `$${item.default_price}` : "Price varies"}
                              </p>
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

              {/* Table header */}
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
                      <Input
                        placeholder="Service description…"
                        value={line.description}
                        onChange={e => updateLine(line.id, "description", e.target.value)}
                        className="bg-secondary/50 border-border font-body text-sm"
                      />
                      <div className="flex gap-2 md:contents">
                        <div className="flex-1 md:flex-none">
                          <Input
                            type="number" min="1" placeholder="Qty"
                            value={line.qty}
                            onChange={e => updateLine(line.id, "qty", e.target.value)}
                            className="bg-secondary/50 border-border font-body text-sm text-center"
                          />
                        </div>
                        <div className="flex-1 md:flex-none">
                          <Input
                            type="number" step="0.01" placeholder="$0.00"
                            value={line.price}
                            onChange={e => updateLine(line.id, "price", e.target.value)}
                            className="bg-secondary/50 border-border font-body text-sm text-right"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 md:contents">
                          <span className="font-body text-sm font-medium text-foreground md:text-right">${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          {lineItems.length > 1 && (
                            <button onClick={() => removeLine(line.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section D — Totals */}
            <section className="space-y-2">
              <div className="flex justify-end">
                <div className="w-full md:w-64 space-y-2">
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Tax toggle */}
                  <div className="flex items-center justify-between">
                    <button onClick={() => setTaxEnabled(!taxEnabled)} className="flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-foreground">
                      <div className={cn("w-3.5 h-3.5 rounded border transition-colors", taxEnabled ? "bg-primary border-primary" : "border-border")} />
                      Tax
                    </button>
                    {taxEnabled && (
                      <div className="flex items-center gap-1">
                        <Input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)}
                          className="w-14 h-7 text-xs text-right bg-secondary/50 border-border" />
                        <span className="text-xs text-muted-foreground">%</span>
                        <span className="text-sm text-foreground ml-2">${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>

                  {/* Discount toggle */}
                  <div className="flex items-center justify-between">
                    <button onClick={() => setDiscountEnabled(!discountEnabled)} className="flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-foreground">
                      <div className={cn("w-3.5 h-3.5 rounded border transition-colors", discountEnabled ? "bg-primary border-primary" : "border-border")} />
                      Discount
                    </button>
                    {discountEnabled && (
                      <div className="flex items-center gap-1">
                        <Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                          className="w-14 h-7 text-xs text-right bg-secondary/50 border-border" />
                        <button onClick={() => setDiscountType(discountType === "$" ? "%" : "$")}
                          className="text-xs font-bold text-primary border border-primary/30 rounded px-1.5 py-0.5">
                          {discountType}
                        </button>
                        <span className="text-sm text-foreground ml-2">-${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-body text-base font-bold text-foreground">Total Due</span>
                    <span className="font-body text-xl font-bold text-primary">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section E — Notes */}
            <section className="space-y-3">
              <SectionHeader title="Notes & Terms" icon={FileText} />
              <div>
                <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Message to Customer</label>
                <Textarea value={publicNotes} onChange={e => setPublicNotes(e.target.value)}
                  placeholder="Thank you for your business!"
                  className="bg-card border-border font-body text-sm min-h-[60px]" />
              </div>
              <div>
                <label className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Internal Notes (not visible to customer)</label>
                <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)}
                  placeholder="Internal notes…"
                  className="bg-card border-border font-body text-sm min-h-[60px]" />
              </div>
            </section>

            {/* Section F — Actions */}
            <section className="flex flex-col sm:flex-row gap-2 pb-8">
              <Button variant="outline" className="flex-1 font-body text-sm" disabled={saving}
                onClick={() => handleSave(false)}>
                <Save className="w-4 h-4 mr-1.5" /> Save as Draft
              </Button>
              <Button className="flex-1 font-body text-sm" disabled={saving}
                onClick={() => {
                  if (!customerId) { toast.error("Please select a customer"); return; }
                  if (lineItems.filter(l => l.description.trim()).length === 0) { toast.error("Add at least one line item"); return; }
                  setShowSendModal(true);
                }}>
                <Send className="w-4 h-4 mr-1.5" /> Send Invoice
              </Button>
            </section>
          </div>

          {/* Right: Live Preview (desktop only) */}
          <div className="hidden md:block w-[40%] border-l border-border overflow-y-auto bg-secondary/30">
            <div className="p-4">
              <p className="font-body text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Live Preview</p>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden transform scale-[0.75] origin-top">
                <InvoicePreviewPanel data={previewData} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Preview — full-screen bottom sheet */}
      <Sheet open={showMobilePreview} onOpenChange={setShowMobilePreview}>
        <SheetContent side="bottom" className="h-[95vh] p-0 bg-[#0a0f0a] border-t border-border overflow-hidden flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
            <SheetTitle className="text-foreground font-display text-base">Invoice Preview</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="max-w-[480px] mx-auto">
              <InvoicePreviewPanel data={previewData} />
            </div>
          </div>
          <div className="shrink-0 px-4 py-3 border-t border-border bg-background flex gap-2">
            <Button variant="outline" className="flex-1 font-body text-sm" onClick={() => window.print()}>
              Download PDF
            </Button>
            <Button variant="ghost" className="font-body text-sm" onClick={() => setShowMobilePreview(false)}>
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Send Modal */}
      {showSendModal && (
        <SendInvoiceModal
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          invoiceNumber={invoiceNumber}
          dueDate={dueDate}
          businessName={activeBiz?.public_brand_name || ""}
          shortcode={activeBiz?.shortcode || "gcp"}
          onSend={async (emailData) => {
            await handleSave(true, emailData);
            setShowSendModal(false);
          }}
          onClose={() => setShowSendModal(false)}
          saving={saving}
        />
      )}
    </>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <h3 className="font-display text-xs font-semibold text-foreground uppercase tracking-wider">{title}</h3>
    </div>
  );
}
