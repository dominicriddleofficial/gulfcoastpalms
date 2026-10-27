import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search, Plus, X, Calendar, User, Building2, FileText,
  Eye, Save, Send, Package, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import QuotePreviewPanel from "./QuotePreviewPanel";
import SendQuoteModal from "./SendQuoteModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import NewCustomerSheet, { type CreatedCustomer } from "./NewCustomerSheet";
import { generateQuoteNumber } from "@/hooks/usePlatformQuotes";
import { downloadElementAsPdf } from "@/lib/download-pdf";
import { buildQuoteMessage, getQuotePublicUrl } from "@/lib/quote-message";
import { saveEditedQuote, type QuoteEditData } from "@/lib/edit-quote";
import { OPTION_KIND_LABELS, builderOptionErrors, type OptionKind } from "@/lib/quote-options";
import type { ArboristDraftLine } from "@/lib/arborist-to-quote";

interface LineItem {
  id: string;
  description: string;
  qty: string;
  price: string;
  original?: QuoteEditData["items"][number];
  /** GCP customer options: required work, optional add-on, or one choice in a named pick-one group. */
  kind: OptionKind;
  group: string;
  /** Proposed default selection for optional/pick-one lines. */
  proposed: boolean;
  /** Staff-only arborist price reference; the line price must be entered/confirmed explicitly. */
  arborist?: ArboristDraftLine;
  priceConfirmed?: boolean;
}

export interface ArboristQuoteSource {
  reportId: string;
  customerName: string;
  propertyAddress: string;
  scope: string;
  lines: ArboristDraftLine[];
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
  editingQuote?: QuoteEditData;
  /** Prefill from a submitted arborist report (GCP); creates a traceable draft on save only. */
  arboristSource?: ArboristQuoteSource;
}

function newLineId() { return crypto.randomUUID(); }
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const lineAmount = (line: LineItem) => roundMoney((Number(line.qty) || 0) * (Number(line.price) || 0) - (line.original?.discount_amount ?? 0));

export default function QuoteBuilder({ businessId, businesses, userId, onClose, onCreated, editingQuote, arboristSource }: QuoteBuilderProps) {
  const existing = editingQuote?.quote;
  const editSnapshot = useRef(editingQuote);
  const editSavingRef = useRef(false);
  const [bizId] = useState(existing?.business_id || businessId || businesses[0]?.id || "");
  const activeBiz = businesses.find(b => b.id === bizId);
  const optionsEnabled = activeBiz?.shortcode?.toUpperCase() === "GCP";

  // Form state
  const [customerId, setCustomerId] = useState<string | null>(existing?.customer_id ?? null);
  const [customerSource, setCustomerSource] = useState<"platform" | "jobber">("platform");
  const [customerName, setCustomerName] = useState(editingQuote?.customer?.display_name ?? "");
  const [customerEmail, setCustomerEmail] = useState(editingQuote?.customer?.email ?? "");
  const [customerPhone, setCustomerPhone] = useState(editingQuote?.customer?.phone ?? "");
  /** Recipient ("To") name override saved on the quote only — mirrors the
   *  invoice Bill To override. The customer record is never modified. */
  const [recipientName, setRecipientName] = useState(existing?.billing_name ?? editingQuote?.customer?.display_name ?? "");
  const [editingRecipientName, setEditingRecipientName] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState(existing?.quote_number ?? "Generating…");
  const [quoteDate, setQuoteDate] = useState(format(existing ? new Date(existing.created_at) : new Date(), "yyyy-MM-dd"));
  const [validUntil, setValidUntil] = useState(existing ? existing.valid_until ?? "" : format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [scopeOfWork, setScopeOfWork] = useState(existing?.scope_of_work ?? "");
  const [lineItems, setLineItems] = useState<LineItem[]>(editingQuote?.items.length
    ? editingQuote.items.map(item => ({ id: item.id, description: item.description, qty: String(item.quantity), price: String(item.unit_price), original: item,
        kind: (item.option_kind === "optional" || item.option_kind === "alternative" ? item.option_kind : "required") as OptionKind,
        group: item.option_group ?? "", proposed: item.option_kind === "required" ? true : !!item.default_selected }))
    : arboristSource?.lines.length
    ? arboristSource.lines.map(line => ({ id: newLineId(), description: line.description, qty: "1", price: "", kind: "required" as OptionKind, group: "", proposed: true, arborist: line, priceConfirmed: false }))
    : [{ id: newLineId(), description: "", qty: "1", price: "" }]);
  const [taxEnabled, setTaxEnabled] = useState(existing ? Number(existing.tax_rate) > 0 : true);
  const [taxRate, setTaxRate] = useState(String(existing?.tax_rate ?? 7));
  const [discountEnabled, setDiscountEnabled] = useState(Number(existing?.discount_total ?? 0) > 0);
  const [discountType, setDiscountType] = useState<"$" | "%">("$");
  const [discountValue, setDiscountValue] = useState(String(existing?.discount_total ?? 0));
  const [depositEnabled, setDepositEnabled] = useState(existing ? !!existing.deposit_required_flag : true);
  const [depositType, setDepositType] = useState<"%" | "$">(existing?.deposit_type === "fixed" ? "$" : "%");
  const [depositValue, setDepositValue] = useState(String(existing?.deposit_value ?? 50));
  const [publicNotes, setPublicNotes] = useState(existing?.public_notes ?? "");
  const [internalNotes, setInternalNotes] = useState(existing?.internal_notes ?? "");

  // UI state
  const [customerSearch, setCustomerSearch] = useState("");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const searchSeqRef = useRef(0);
  /** Customers created in this builder; kept at the top of the picker so Change can reselect them. */
  const pinnedCustomersRef = useRef<CustomerResult[]>([]);
  const queryClient = useQueryClient();
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [showSavedItems, setShowSavedItems] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const mobilePreviewRef = useRef<HTMLDivElement>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [saving, setSaving] = useState(false);
  /** The persisted quote, available only AFTER a successful save. The public
   *  link is derived from this — never from an unsaved placeholder. */
  const [savedQuote, setSavedQuote] = useState<{ id: string; quote_number: string } | null>(null);
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);
  const [savedCopyQuoteNumber, setSavedCopyQuoteNumber] = useState<string | null>(null);

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

  // Generate a number only for new quotes; edits retain the original public link.
  useEffect(() => {
    if (existing) return;
    (async () => {
      try {
        const num = await generateQuoteNumber(bizId);
        setQuoteNumber(num);
      } catch { setQuoteNumber("Q-ERROR"); }
    })();
  }, [bizId, existing]);

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
      const reqId = ++searchSeqRef.current;
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
      if (reqId !== searchSeqRef.current) return; // a newer search or a just-created customer supersedes this
      const q = customerSearch.trim().toLowerCase();
      // Query-matching pinned entries stay first; only drop combined rows that duplicate a pinned
      // source+id (a new customer can land late in combined, since jobber rows precede platform rows).
      const pinned = pinnedCustomersRef.current.filter(p => (!q || [p.display_name, p.phone, p.email].some(v => v?.toLowerCase().includes(q))));
      const pinnedKeys = new Set(pinned.map(p => `${p.source}:${p.id}`));
      const rest = combined.filter(c => !pinnedKeys.has(`${c.source}:${c.id}`));
      setCustomerResults([...pinned, ...rest].slice(0, 25));
    }, 200);
    return () => clearTimeout(timer);
  }, [customerSearch, bizId]);

  // Set default notes
  useEffect(() => {
    if (!existing && !publicNotes) setPublicNotes(`Thank you for considering ${activeBiz?.public_brand_name || "us"}! We look forward to working with you.`);
  }, [activeBiz?.public_brand_name, existing]);

  // Calculations
  const subtotal = useMemo(() => roundMoney(lineItems.reduce((s, l) => s + lineAmount(l), 0)), [lineItems]);
  const taxableSubtotal = lineItems.filter(l => l.original?.taxable_flag !== false).reduce((s, l) => s + lineAmount(l), 0);
  const taxAmount = taxEnabled ? roundMoney(taxableSubtotal * (Number(taxRate) || 0) / 100) : 0;
  const discountAmount = discountEnabled ? roundMoney(discountType === "%" ? subtotal * (Number(discountValue) || 0) / 100 : Number(discountValue) || 0) : 0;
  const total = Math.max(0, roundMoney(subtotal + taxAmount - discountAmount));
  const depositAmount = depositEnabled ? roundMoney(depositType === "%" ? total * (Number(depositValue) || 0) / 100 : Number(depositValue) || 0) : 0;

  const addLine = () => setLineItems([...lineItems, { id: newLineId(), description: "", qty: "1", price: "" }]);
  const removeLine = (id: string) => setLineItems(lineItems.filter(l => l.id !== id));
  const updateLine = (id: string, field: "description" | "qty" | "price", val: string) =>
    setLineItems(lineItems.map(l => l.id === id ? { ...l, [field]: val } : l));

  const addSavedItem = (item: SavedItem) => {
    setLineItems([...lineItems, { id: newLineId(), description: item.description || item.name, qty: "1", price: String(item.default_price) }]);
    setShowSavedItems(false);
  };

  const selectCustomer = (c: CustomerResult) => {
    setCustomerId(c.id); setCustomerSource((c.source as "platform" | "jobber") || "platform");
    setCustomerName(c.display_name); setCustomerEmail(c.email || ""); setCustomerPhone(c.phone || "");
    setRecipientName(c.display_name); setEditingRecipientName(false);
    setShowCustomerSearch(false); setCustomerSearch("");
  };

  const handleNewCustomerCreated = (c: CreatedCustomer, opts: { addressSaved: boolean }) => {
    const entry: CustomerResult = { ...c, company_name: null, source: "platform" };
    searchSeqRef.current++; // drop any in-flight search response
    pinnedCustomersRef.current = [entry, ...pinnedCustomersRef.current.filter(p => !(p.source === "platform" && p.id === c.id))];
    setCustomerResults(prev => [entry, ...prev.filter(p => !(p.source === "platform" && p.id === c.id))].slice(0, 25));
    selectCustomer(entry);
    // Refresh any customer lists/search caches elsewhere in the platform.
    void queryClient.invalidateQueries({
      predicate: (q) => q.queryKey.some((k) => typeof k === "string" && k.toLowerCase().includes("customer")),
    });
    if (opts.addressSaved) toast.success(`${c.display_name} added to customers`);
    else toast.warning(`${c.display_name} added to customers — address was not saved`);
  };

  const setQuickValid = (days: number) => {
    setValidUntil(format(addDays(new Date(quoteDate), days), "yyyy-MM-dd"));
  };

  /** The name the customer actually sees. Override wins, customer record is fallback. */
  const displayToName = recipientName.trim() || customerName;
  /** Only persist an override when it differs from the customer's own name. */
  const billingNameToSave = displayToName && displayToName !== customerName ? displayToName : null;

  // Preview data
  const previewData = useMemo(() => ({
    quoteNumber, quoteDate, validUntil,
    customerName: displayToName || "Customer Name", customerEmail, customerPhone,
    lineItems: lineItems.filter(l => l.description.trim()).map(l => ({
      description: l.description, quantity: Number(l.qty) || 1,
      unit_price: Number(l.price) || 0, line_total: lineAmount(l),
    })),
    subtotal, taxRate: taxEnabled ? Number(taxRate) : 0, taxAmount, discountAmount, total,
    depositRequired: depositEnabled, depositAmount, scopeOfWork, publicNotes,
    businessName: activeBiz?.public_brand_name || "", shortcode: activeBiz?.shortcode || "gcp",
    isDraft: existing ? existing.status === "draft" : true, logoUrl,
  }), [quoteNumber, quoteDate, validUntil, displayToName, customerEmail, customerPhone, lineItems, subtotal, taxEnabled, taxRate, taxAmount, discountAmount, total, depositEnabled, depositAmount, scopeOfWork, publicNotes, activeBiz, logoUrl, existing]);

  /**
   * Persist the quote (draft) and return the saved row. The quote MUST exist
   * before any share link is generated — the old flow built the link from a
   * "PENDING" placeholder and could text a dead URL.
   */
  const persistQuote = async (): Promise<{ id: string; quote_number: string } | null> => {
    if (editingQuote && editSnapshot.current) {
      if (editSavingRef.current) return null;
      if (!userId) { toast.error("Sign in before saving the quote"); return null; }
      const validLines = lineItems.filter(l => l.description.trim());
      if (!validLines.length) { toast.error("Add at least one line item"); return null; }
      if (lineItems.some(l => !l.description.trim() && (l.price !== "" || l.original))) {
        toast.error("Enter a description or remove the empty line"); return null;
      }
      if (![taxRate, discountValue, depositValue].every(v => Number.isFinite(Number(v)) && Number(v) >= 0) ||
        Number(taxRate) > 100 || (discountEnabled && discountAmount > subtotal) ||
        (depositEnabled && depositAmount > total)) {
        toast.error("Check the tax, discount, and deposit amounts"); return null;
      }
      editSavingRef.current = true;
      setSaving(true);
      try {
        const result = await saveEditedQuote(editSnapshot.current, {
          billing_name: billingNameToSave, subtotal, discount_total: discountAmount,
          tax_rate: taxEnabled ? Number(taxRate) : 0, tax_total: taxAmount, total,
          deposit_required_flag: depositEnabled, deposit_type: depositType === "%" ? "percentage" : "fixed",
          deposit_value: Number(depositValue), deposit_amount_calculated: depositAmount,
          valid_until: validUntil || null, scope_of_work: scopeOfWork || null,
          internal_notes: internalNotes || null, public_notes: publicNotes || null,
        }, validLines.map((l, i) => ({
          ...l.original, id: l.id, quote_id: editingQuote.quote.id, business_id: bizId,
          description: l.description, quantity: Number(l.qty), unit_price: Number(l.price),
          unit: l.original?.unit ?? "each", discount_amount: l.original?.discount_amount ?? 0,
          taxable_flag: l.original?.taxable_flag ?? true, line_type: l.original?.line_type ?? "service",
          service_catalog_id: l.original?.service_catalog_id ?? null,
          line_total: lineAmount(l), sort_order: i,
        })), userId);
        editSnapshot.current = result;
        if (result.historyWarning) toast.warning(result.historyWarning);
        const saved = { id: result.quote.id, quote_number: result.quote.quote_number };
        setSavedQuote(saved);
        return saved;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save quote changes");
        return null;
      } finally {
        editSavingRef.current = false;
        setSaving(false);
      }
    }
    if (savedQuote) return savedQuote;
    if (!bizId) return null;
    if (!customerId) { toast.error("Please select a customer"); return null; }
    const validLines = lineItems.filter(l => l.description.trim());
    if (validLines.length === 0) { toast.error("Add at least one line item"); return null; }

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
        if (custErr || !newCust) { toast.error("Failed to create customer record"); setSaving(false); return null; }
        resolvedCustomerId = newCust.id;
      }
    }

    const { data: quote, error } = await supabase.from("platform_quotes").insert({
      business_id: bizId, quote_number: quoteNumber, customer_id: resolvedCustomerId,
      billing_name: billingNameToSave,
      status: "draft", subtotal, discount_total: discountAmount,
      tax_rate: taxEnabled ? Number(taxRate) : 0, tax_total: taxAmount, total,
      deposit_required_flag: depositEnabled, deposit_type: depositType === "%" ? "percentage" : "fixed",
      deposit_value: Number(depositValue), deposit_amount_calculated: depositAmount,
      valid_until: validUntil, scope_of_work: scopeOfWork || null,
      internal_notes: internalNotes || null, public_notes: publicNotes || null,
      created_by_user_id: userId, last_modified_by_user_id: userId,
    }).select().single();

    if (error || !quote) { toast.error(error?.message || "Failed to create quote"); setSaving(false); return null; }

    // Insert line items
    const { error: lineErr } = await supabase.from("platform_quote_line_items").insert(
      validLines.map((l, i) => ({
        business_id: bizId, quote_id: quote.id, description: l.description,
        quantity: Number(l.qty) || 1, unit: "each", unit_price: Number(l.price) || 0,
        discount_amount: 0, taxable_flag: true,
        line_total: (Number(l.qty) || 1) * (Number(l.price) || 0), sort_order: i,
      }))
    );
    if (lineErr) {
      toast.error(`Quote saved but line items failed to save: ${lineErr.message}. Not sending — fix the quote before it goes out.`);
      setSaving(false);
      return null;
    }

    // Save initial version
    const { error: versionErr } = await supabase.from("platform_quote_versions").insert([{
      quote_id: quote.id, business_id: bizId, version_number: 1,
      snapshot_json: JSON.parse(JSON.stringify({ quote, line_items: validLines })),
      created_by_user_id: userId,
    }]);
    if (versionErr) {
      console.error("[Quote] version snapshot failed:", versionErr);
      toast.error(`Quote and line items saved, but the version history snapshot failed: ${versionErr.message}`);
    }

    // Confirm the row really persisted before anyone builds a link to it.
    const { data: verified, error: verifyErr } = await supabase
      .from("platform_quotes")
      .select("id, quote_number")
      .eq("id", quote.id)
      .single();
    if (verifyErr || !verified?.id) {
      toast.error("Could not confirm the quote saved. Nothing was sent — please retry.");
      setSaving(false);
      return null;
    }

    const saved = { id: verified.id, quote_number: verified.quote_number || quoteNumber };
    setSavedQuote(saved);
    setSaving(false);
    return saved;
  };

  const handleSaveDraft = async () => {
    const saved = await persistQuote();
    if (!saved) return;
    toast.success(editingQuote ? "Quote updated" : "Quote created");
    onCreated();
  };

  const openSendModal = async () => {
    const saved = await persistQuote();
    if (!saved) return;
    setShowSendModal(true);
  };

  /** Send an already-saved quote. Only marks it sent when a channel succeeded. */
  const sendQuote = async (
    saved: { id: string; quote_number: string },
    sendData: { email: string; subject: string; message: string; sendEmail: boolean; sendSms: boolean; smsMessage?: string },
  ) => {
      setSaving(true);
      let quoteUrl: string;
      try {
        quoteUrl = getQuotePublicUrl({ quoteId: saved.id, quoteNumber: saved.quote_number, shortcode: activeBiz?.shortcode });
      } catch {
        toast.error("The quote link isn't ready yet — nothing was sent. Save the quote and try again.");
        setSaving(false);
        return false;
      }
      if (/\/(pending|undefined|null)\b/i.test(quoteUrl)) {
        toast.error("Refusing to send: the quote link is incomplete.");
        setSaving(false);
        return false;
      }
      let anySuccess = false;

      // Send email
      if (sendData.sendEmail && sendData.email) {
        try {
          const { data: fnRes, error: fnErr } = await supabase.functions.invoke("send-quote-email", {
            body: {
              quoteId: saved.id, recipientEmail: sendData.email, recipientName: displayToName,
              subject: sendData.subject, message: sendData.message,
              businessName: activeBiz?.public_brand_name || "", quoteNumber: saved.quote_number,
              quoteUrl,
              ownerEmail: "dominicriddleofficial@gmail.com",
            },
          });
          const functionError = fnErr?.message || fnRes?.error;
          if (functionError) { toast.error(`Quote created but email failed: ${functionError}`); }
          else { anySuccess = true; toast.success(`Quote sent to ${displayToName} at ${sendData.email}`); }
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
            const smsMessage = sendData.smsMessage?.trim()
              ? sendData.smsMessage
              : `Hi ${displayToName}, ${activeBiz?.public_brand_name || "Gulf Coast Palms"} has sent you a quote for $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}. View and approve here: ${quoteUrl} Reply STOP to unsubscribe.`;
            console.log("[SMS] sending quote text", { to: customerPhone, name: displayToName, quoteUrl });
            const { error: smsErr } = await supabase.functions.invoke("send-sms", {
              body: { to: customerPhone, message: smsMessage },
            });
            if (smsErr) {
              console.error("[SMS] send error:", smsErr);
              toast.error(`SMS failed: ${smsErr.message || "Unknown error"}`);
            } else {
              anySuccess = true;
              toast.success(`Text sent to ${customerPhone}`);
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            console.error("[SMS] exception:", e);
            toast.error(`SMS error: ${msg}`);
          }
        }
      }

      // Only mark sent when a channel actually succeeded.
      if (anySuccess) {
        await supabase.from("platform_quotes").update({ status: "sent", sent_at: new Date().toISOString(), billing_name: billingNameToSave }).eq("id", saved.id);
      }

      setSaving(false);
      if (anySuccess) onCreated();
      return anySuccess;
  };

  /**
   * Copy path — the quote is already saved, so promote it to "sent" and hand the
   * message to an iOS-safe confirmation sheet (clipboard write happens on a fresh
   * tap, never after an await).
   */
  const handleSaveAndCopy = async () => {
    const saved = savedQuote ?? await persistQuote();
    if (!saved) return;
    setSaving(true);
    const { error: statusErr } = await supabase
      .from("platform_quotes")
      .update({ status: "sent", sent_at: new Date().toISOString(), billing_name: billingNameToSave })
      .eq("id", saved.id);
    if (statusErr) {
      toast.error(`Could not mark the quote as sent — nothing copied. ${statusErr.message}`);
      setSaving(false);
      return;
    }
    let message: string;
    try {
      message = buildQuoteMessage({
        quoteId: saved.id,
        quoteNumber: saved.quote_number,
        customerName: displayToName,
        useFullName: !!billingNameToSave,
        total,
        businessName: activeBiz?.public_brand_name,
        shortcode: activeBiz?.shortcode,
      });
    } catch {
      toast.error("The quote link isn't ready yet — nothing copied.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setShowSendModal(false);
    setSavedCopyQuoteNumber(saved.quote_number);
    setManualCopyText(message);
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
              disabled={saving}
              aria-label="Close"
              className="flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors -ml-2 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight">{editingQuote ? "Edit Quote" : "New Quote"}</h1>
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
          <fieldset disabled={saving} className="flex-1 min-w-0 md:w-[60%] overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Business & Customer */}
            <section className="space-y-4">
              <SectionHeader title="Business & Customer" icon={Building2} />
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="font-body text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">From</p>
                <p className="font-body text-sm font-semibold text-foreground">{activeBiz?.public_brand_name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{activeBiz?.shortcode?.toUpperCase()}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-body text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Prepared For</p>
                  <div className="flex items-center gap-3">
                    {customerId && !editingQuote && (
                      <button className="font-body text-[10px] text-primary hover:underline" onClick={() => { setCustomerId(null); setCustomerName(""); setRecipientName(""); setEditingRecipientName(false); setShowCustomerSearch(true); }}>Change</button>
                    )}
                    {!editingQuote && (
                      <Button type="button" size="sm" variant="outline" data-testid="quote-new-customer"
                        className="h-7 px-2 text-xs border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => { setShowCustomerSearch(false); setNewCustomerOpen(true); }}>
                        <UserPlus className="w-3.5 h-3.5 mr-1" />New customer
                      </Button>
                    )}
                  </div>
                </div>
                {customerId || editingQuote ? (
                  <div>
                    <div className="space-y-1">
                      <label className="font-body text-[10px] font-medium text-muted-foreground uppercase tracking-wider">To</label>
                      {editingRecipientName ? (
                        <Input
                          autoFocus
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          onBlur={() => setEditingRecipientName(false)}
                          placeholder={customerName}
                          className="bg-secondary/50 border-border font-body text-sm"
                          data-testid="quote-recipient-name-input"
                        />
                      ) : (
                        <button
                          type="button"
                          data-testid="quote-recipient-name-edit"
                          onClick={() => setEditingRecipientName(true)}
                          className="w-full flex items-center gap-2 text-left group"
                        >
                          <span className="font-body text-sm font-semibold text-foreground">{displayToName}</span>
                          <Pencil className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" />
                        </button>
                      )}
                      <p className="font-body text-[10px] text-muted-foreground">
                        Saved with this quote — customer record unchanged
                      </p>
                    </div>
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
                          <div className="px-3 py-3 text-center space-y-1">
                            <p className="font-body text-xs text-muted-foreground">No customers found</p>
                            <button type="button" className="font-body text-xs text-primary hover:underline" onClick={() => { setShowCustomerSearch(false); setNewCustomerOpen(true); }}>+ New customer</button>
                          </div>
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
                  <Input type="date" disabled={!!editingQuote} value={quoteDate} onChange={e => setQuoteDate(e.target.value)} className="bg-card border-border font-body text-sm" />
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
                  const lineTotal = lineAmount(line);
                  return (
                    <div key={line.id} className="grid grid-cols-1 md:grid-cols-[1fr_80px_100px_100px_32px] gap-2 bg-card border border-border rounded-lg p-2.5 md:p-2 md:rounded-none md:border-0 md:border-b md:bg-transparent">
                      <Input aria-label="Line description" placeholder="Service description…" value={line.description} onChange={e => updateLine(line.id, "description", e.target.value)} className="bg-secondary/50 border-border font-body text-sm" />
                      <div className="flex gap-2 md:contents">
                        <div className="flex-1 md:flex-none">
                          <Input aria-label="Quantity" type="number" min="0.01" step="any" placeholder="Qty" value={line.qty} onChange={e => updateLine(line.id, "qty", e.target.value)} className="bg-secondary/50 border-border font-body text-sm text-center" />
                        </div>
                        <div className="flex-1 md:flex-none">
                          <Input aria-label="Unit price" type="number" min="0" step="0.01" placeholder="$0.00" value={line.price} onChange={e => updateLine(line.id, "price", e.target.value)} className="bg-secondary/50 border-border font-body text-sm text-right" />
                        </div>
                        <div className="flex items-center justify-end gap-2 md:contents">
                          <span className="font-body text-sm font-medium text-foreground md:text-right">${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          {lineItems.length > 1 && (
                            <button aria-label="Remove line" onClick={() => removeLine(line.id)} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
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
              <Button variant="outline" className="flex-1 font-body text-sm" disabled={saving} onClick={() => { void handleSaveDraft(); }}>
                <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving…" : editingQuote ? "Save Changes" : "Save as Draft"}
              </Button>
              {!editingQuote && <Button className="flex-1 font-body text-sm" disabled={saving}
                onClick={() => {
                  if (!customerId) { toast.error("Please select a customer"); return; }
                  if (lineItems.filter(l => l.description.trim()).length === 0) { toast.error("Add at least one line item"); return; }
                  // Save first — the send sheet needs the real quote link.
                  void openSendModal();
                }}>
                <Send className="w-4 h-4 mr-1.5" /> {saving && !showSendModal ? "Saving…" : "Send Quote"}
              </Button>}
            </section>
          </fieldset>

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
      {showSendModal && savedQuote && (
        <SendQuoteModal
          customerName={displayToName} customerEmail={customerEmail} customerPhone={customerPhone}
          quoteNumber={savedQuote.quote_number} validUntil={validUntil}
          businessName={activeBiz?.public_brand_name || ""} shortcode={activeBiz?.shortcode || "gcp"}
          total={total}
          quoteUrl={getQuotePublicUrl({ quoteId: savedQuote.id, quoteNumber: savedQuote.quote_number, shortcode: activeBiz?.shortcode })}
          onSend={async (data) => { const ok = await sendQuote(savedQuote, data); if (ok) setShowSendModal(false); }}
          onCopy={handleSaveAndCopy}
          onClose={() => setShowSendModal(false)} saving={saving}
        />
      )}

      {/* Post-save copy sheet — iOS-safe: the clipboard write happens inside a
          fresh tap on "Copy message", never after an awaited save. */}
      <Sheet
        open={!!manualCopyText}
        onOpenChange={(open) => {
          if (!open) {
            const wasOpen = !!manualCopyText;
            setManualCopyText(null);
            setSavedCopyQuoteNumber(null);
            if (wasOpen) onCreated();
          }
        }}
      >
        <SheetContent side="bottom" className="ops-theme bg-background border-border max-w-md mx-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-display text-foreground">
              {savedCopyQuoteNumber ? `Quote ${savedCopyQuoteNumber} saved` : "Copy quote message"}
            </SheetTitle>
          </SheetHeader>
          <p className="font-body text-xs text-muted-foreground mt-1" data-testid="quote-copy-sheet-hint">
            Tap “Copy message”, then paste anywhere (Messenger, email, notes).
          </p>
          <Textarea
            data-testid="copy-quote-textarea"
            value={manualCopyText || ""}
            readOnly
            rows={6}
            className="bg-card border-border font-body text-sm text-foreground mt-3"
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="flex gap-2 mt-3">
            <Button
              data-testid="copy-quote-copy-btn"
              className="flex-1 font-body text-sm"
              onClick={async () => {
                const text = manualCopyText || "";
                try {
                  if (navigator?.clipboard?.writeText) {
                    await navigator.clipboard.writeText(text);
                    toast.success("Copied — paste it anywhere");
                    return;
                  }
                } catch {
                  /* fall through */
                }
                try {
                  const ta = document.createElement("textarea");
                  ta.value = text;
                  ta.style.position = "fixed";
                  ta.style.opacity = "0";
                  document.body.appendChild(ta);
                  ta.focus();
                  ta.select();
                  const ok = document.execCommand("copy");
                  document.body.removeChild(ta);
                  if (ok) toast.success("Copied — paste it anywhere");
                  else toast.error("Couldn't copy — long-press the message to copy manually");
                } catch {
                  toast.error("Couldn't copy — long-press the message to copy manually");
                }
              }}
            >
              Copy message
            </Button>
            <Button
              variant="outline"
              className="font-body text-sm"
              onClick={() => { setManualCopyText(null); setSavedCopyQuoteNumber(null); onCreated(); }}
            >
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      {!editingQuote && (
        <NewCustomerSheet open={newCustomerOpen} businessId={bizId} onOpenChange={setNewCustomerOpen} onCreated={handleNewCustomerCreated} />
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
