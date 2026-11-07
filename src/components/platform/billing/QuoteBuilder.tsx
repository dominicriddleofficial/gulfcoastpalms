import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { editorDeposit } from "@/lib/quote-editor-deposit";
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
import { DISPOSAL_GROUP, disposalAmounts, type DisposalDraft, type ArboristDraftLine } from "@/lib/arborist-to-quote";
import { priceCents } from "@/lib/arborist-quotes";
import { QUOTE_UNITS, normalizeUnit } from "@/lib/quote-units";
import { aiLineProblem, builderHasWork, builderLineCents, parseQty, type AppliedLine } from "@/lib/quote-ai";
import QuoteAssistant from "./QuoteAssistant";
import { WorkspaceThemeProvider, getWorkspaceThemeFromBusiness, workspaceThemeVars } from "@/contexts/WorkspaceThemeContext";
import { Sparkles } from "lucide-react";

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
  /** Billing unit label ("each", "sq ft", …); persisted to the line's unit column. */
  unit?: string;
  /** Line came from an AI draft: it blocks saving until it has a valid quantity AND an explicit positive rate. */
  aiOrigin?: boolean;
  /** The AI's original note about a missing/unclear value (shown until resolved). */
  aiIssue?: string | null;
}

export interface ArboristQuoteSource {
  reportId: string;
  customerName: string;
  propertyAddress: string;
  scope: string;
  lines: ArboristDraftLine[];
  disposal?: DisposalDraft;
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
  /** Open "Describe your quote" immediately (from the Quotes page shortcut). */
  startWithAssistant?: boolean;
}

function newLineId() { return crypto.randomUUID(); }
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
/** Exact-cents line amount (same calculation as the AI review); persisted line_total uses this too. */
const lineAmount = (line: LineItem) => builderLineCents(line.qty, line.price, line.original?.discount_amount ?? 0) / 100;
const lineAiProblem = (line: LineItem) => (line.aiOrigin ? aiLineProblem(line.qty, line.price, line.aiIssue) : null);

/** Grouped prices must not replace customer-visible work. Only copy descriptions,
 * never arborist suggestions; normalize whitespace to recognize structured scope. */
function disposalWorkScope(scope: string, required: LineItem[]) {
  let result = scope;
  const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
  for (const line of required) {
    const description = line.description.trim();
    // These are this toggle's pricing labels, not original work descriptions.
    if (!description || description === "Tree work — required base" || description === "Tree work with haul-away — complete job") continue;
    if (!normalize(result).includes(normalize(description))) {
      result = [result, description].filter(Boolean).join("\n");
    }
  }
  return result;
}

export default function QuoteBuilder({ businessId, businesses, userId, onClose, onCreated, editingQuote, arboristSource, startWithAssistant }: QuoteBuilderProps) {
  const existing = editingQuote?.quote;
  const editSnapshot = useRef(editingQuote);
  const editSavingRef = useRef(false);
  const [bizId] = useState(existing?.business_id || businessId || businesses[0]?.id || "");
  const activeBiz = businesses.find(b => b.id === bizId);
  const optionsEnabled = activeBiz?.shortcode?.toUpperCase() === "GCP";
  /** Lines counted in the proposed total: required work plus proposed options. */
  /** Customer can be chosen on a new quote, or once on an unassigned unsent draft (server enforces this too). */
  const canAssignCustomer = !existing || (!existing.customer_id && existing.status === "draft" && !existing.sent_at && !existing.accepted_snapshot);
  const [assistantOpen, setAssistantOpen] = useState(!!startWithAssistant);
  const inProposedTotal = (l: LineItem) => !optionsEnabled || l.kind === "required" || l.proposed;

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
  const [scopeOfWork, setScopeOfWork] = useState(existing?.scope_of_work ?? arboristSource?.scope ?? "");
  const [lineItems, setLineItems] = useState<LineItem[]>(editingQuote?.items.length
    ? editingQuote.items.map(item => ({ id: item.id, description: item.description, qty: String(item.quantity), price: String(item.unit_price), original: item, unit: normalizeUnit(item.unit),
        kind: (item.option_kind === "optional" || item.option_kind === "alternative" ? item.option_kind : "required") as OptionKind,
        group: item.option_group ?? "", proposed: item.option_kind === "required" ? true : !!item.default_selected }))
    : arboristSource?.lines.length
    ? arboristSource.lines.map(line => ({ id: newLineId(), description: line.description, qty: "1", price: line.fixedPrice ?? "", kind: "required" as OptionKind, group: "", proposed: true, arborist: line, priceConfirmed: line.fixedPrice !== null }))
    : [{ id: newLineId(), description: "", qty: "1", price: "", kind: "required", group: "", proposed: true }]);
  const [taxEnabled, setTaxEnabled] = useState(existing ? Number(existing.tax_rate) > 0 : !arboristSource);
  const [taxRate, setTaxRate] = useState(String(existing?.tax_rate ?? 7));
  const [discountEnabled, setDiscountEnabled] = useState(Number(existing?.discount_total ?? 0) > 0);
  const [discountType, setDiscountType] = useState<"$" | "%">("$");
  const [discountValue, setDiscountValue] = useState(String(existing?.discount_total ?? 0));
  const [depositEnabled, setDepositEnabled] = useState(existing ? !!existing.deposit_required_flag : !arboristSource);
  const [depositType, setDepositType] = useState<"%" | "$">(existing?.deposit_type === "fixed" ? "$" : "%");
  const [depositValue, setDepositValue] = useState(String(existing?.deposit_value ?? 50));
  const [publicNotes, setPublicNotes] = useState(existing?.public_notes ?? "");
  const [internalNotes, setInternalNotes] = useState(existing?.internal_notes ?? "");
  const disposalActive = lineItems.some(l => l.kind === "alternative" && l.group === DISPOSAL_GROUP);
  const [roadsidePrice, setRoadsidePrice] = useState(arboristSource?.disposal?.road === null || arboristSource?.disposal?.road === undefined ? "" : (arboristSource.disposal.road / 100).toFixed(2));
  const toggleDisposal = () => {
    if (disposalActive) {
      if (lineItems.some(l => l.kind === "alternative" && l.group !== DISPOSAL_GROUP)) {
        toast.error("Resolve other choice groups before turning disposal alternatives off: remove those choices or change them to required work or optional add-ons.");
        return;
      }
      const required = lineItems.filter(l => l.kind === "required");
      const haul = lineItems.find(l => l.group === DISPOSAL_GROUP && l.description === "Haul-away");
      if (!haul) return;
      const road = lineItems.find(l => l.group === DISPOSAL_GROUP && l.description.startsWith("Roadside placement"));
      if (road) setRoadsidePrice((required.reduce((s, l) => s + lineAmount(l), 0) + lineAmount(road)).toFixed(2));
      const amount = required.reduce((s, l) => s + lineAmount(l), 0) + lineAmount(haul);
      setScopeOfWork(scope => disposalWorkScope(scope, required));
      setLineItems([{ id: newLineId(), description: "Tree work with haul-away — complete job", qty: "1", price: amount.toFixed(2), kind: "required", group: "", proposed: true }, ...lineItems.filter(l => l.kind === "optional")]);
      return;
    }
    const road = priceCents(roadsidePrice);
    const haul = Math.round(lineItems.filter(l => l.kind === "required").reduce((s, l) => s + lineAmount(l), 0) * 100);
    if (road === null || road <= 0 || haul <= 0 || lineItems.some(l => l.kind === "required" && l.price.trim() === "")) { toast.error("Enter valid complete haul-away and roadside prices first."); return; }
    if (lineItems.some(l => l.kind === "alternative")) { toast.error("Review existing choice groups before offering disposal alternatives."); return; }
    const amounts = disposalAmounts(haul, road);
    setScopeOfWork(scope => disposalWorkScope(scope, lineItems.filter(l => l.kind === "required")));
    setLineItems([
      { id: newLineId(), description: "Tree work — required base", qty: "1", price: (amounts.base / 100).toFixed(2), kind: "required", group: "", proposed: true },
      { id: newLineId(), description: "Haul-away", qty: "1", price: (amounts.haulDelta / 100).toFixed(2), kind: "alternative", group: DISPOSAL_GROUP, proposed: true },
      { id: newLineId(), description: `Roadside placement${arboristSource?.disposal?.conditions ? ` — ${arboristSource.disposal.conditions}` : ""}`, qty: "1", price: (amounts.roadDelta / 100).toFixed(2), kind: "alternative", group: DISPOSAL_GROUP, proposed: false },
      ...lineItems.filter(l => l.kind === "optional"),
    ]);
  };

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
  const [saveError, setSaveError] = useState<string | null>(null);
  const reportSaveError = (message: string) => { setSaveError(message); toast.error(message); };
  const scopeRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const textarea = scopeRef.current;
    if (!textarea) return;
    const resize = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(192, textarea.scrollHeight + 2)}px`;
    };
    resize();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (width !== lastWidth) { lastWidth = width; resize(); }
    });
    let lastWidth: number | undefined;
    observer?.observe(textarea);
    return () => observer?.disconnect();
  }, [scopeOfWork]);
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
  // Footer contact comes from the workspace's saved contact details, never hardcoded.
  const { data: bizContact } = useQuery({
    queryKey: ['business-contact-quote', bizId],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('support_phone, support_email').eq('id', bizId).maybeSingle();
      return data ?? null;
    },
    enabled: !!bizId,
  });

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
  const subtotal = useMemo(() => lineItems.filter(inProposedTotal).reduce((s, l) => s + Math.round(lineAmount(l) * 100), 0) / 100, [lineItems, optionsEnabled]);
  const taxableSubtotal = lineItems.filter(inProposedTotal).filter(l => l.original?.taxable_flag !== false).reduce((s, l) => s + lineAmount(l), 0);
  const taxAmount = taxEnabled ? roundMoney(taxableSubtotal * (Number(taxRate) || 0) / 100) : 0;
  const discountAmount = discountEnabled ? roundMoney(discountType === "%" ? subtotal * (Number(discountValue) || 0) / 100 : Number(discountValue) || 0) : 0;
  const total = Math.max(0, roundMoney(subtotal + taxAmount - discountAmount));
  const deposit = editorDeposit(total, depositEnabled, depositType, depositValue);
  const depositAmount = deposit.amount;

  const addLine = () => setLineItems([...lineItems, { id: newLineId(), description: "", qty: "1", price: "", kind: "required", group: "", proposed: true }]);
  const removeLine = (id: string) => setLineItems(lineItems.filter(l => l.id !== id));
  const updateLine = (id: string, field: "description" | "qty" | "price" | "unit", val: string) =>
    setLineItems(lineItems.map(l => l.id === id ? { ...l, [field]: val, ...(field === "price" ? { priceConfirmed: true } : {}),
 } : l));
  /** Replace scope + lines with a reviewed AI draft. Tax, discount, deposit and customer are untouched. */
  const applyAiDraft = (draft: { scope: string; lines: AppliedLine[] }) => {
    setScopeOfWork(draft.scope);
    setLineItems(draft.lines.length ? draft.lines.map(l => ({ id: newLineId(), description: l.description, qty: l.qty, price: l.price, unit: l.unit,
      aiOrigin: true, aiIssue: l.issue, kind: "required" as OptionKind, group: "", proposed: true }))
      : [{ id: newLineId(), description: "", qty: "1", price: "", kind: "required", group: "", proposed: true }]);
    toast.success("Draft applied — review it, then choose a customer and save.");
  };
  const updateOption = (id: string, patch: Partial<Pick<LineItem, "kind" | "group" | "proposed">>) =>
    setLineItems(current => {
      const target = current.find(l => l.id === id);
      const next = current.map(l => l.id === id ? { ...l, ...patch } : l);
      // Proposing one choice in a pick-one group un-proposes the others in that group.
      if (target && patch.proposed && (patch.kind ?? target.kind) === "alternative") {
        const group = (patch.group ?? target.group).trim();
        return next.map(l => l.id !== id && l.kind === "alternative" && l.group.trim() === group ? { ...l, proposed: false } : l);
      }
      return next;
    });


  const addSavedItem = (item: SavedItem) => {
    setLineItems([...lineItems, { id: newLineId(), description: item.description || item.name, qty: "1", price: String(item.default_price), kind: "required", group: "", proposed: true }]);
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
      description: l.description, quantity: Number(l.qty) || 1, unit: l.unit ?? "each",
      unit_price: Number(l.price) || 0, line_total: lineAmount(l),
      optionLabel: optionsEnabled && l.kind !== "required"
        ? `${l.kind === "alternative" ? `${l.group.trim() || "Choice"} — pick one` : "Optional add-on"}${l.proposed ? " · proposed" : " · not in total"}` : undefined,
      excluded: !inProposedTotal(l),
    })),
    subtotal, taxRate: taxEnabled ? Number(taxRate) : 0, taxAmount, discountAmount, total,
    depositRequired: depositEnabled, depositAmount, scopeOfWork, publicNotes,
    businessName: activeBiz?.public_brand_name || "", shortcode: activeBiz?.shortcode || "gcp",
    isDraft: existing ? existing.status === "draft" : true, logoUrl,
    businessPhone: bizContact?.support_phone ?? null, businessEmail: bizContact?.support_email ?? null,
  }), [bizContact, quoteNumber, quoteDate, validUntil, displayToName, customerEmail, customerPhone, lineItems, subtotal, taxEnabled, taxRate, taxAmount, discountAmount, total, depositEnabled, depositAmount, scopeOfWork, publicNotes, activeBiz, logoUrl, existing]);

  /**
   * Persist the quote (draft) and return the saved row. The quote MUST exist
   * before any share link is generated — the old flow built the link from a
   * "PENDING" placeholder and could text a dead URL.
   */
  /** Option + arborist price checks shared by create and edit. Returns false (with a message) when blocked. */
  const checkOptionsAndPrices = (validLines: LineItem[]) => {
    if (validLines.some(l => lineAiProblem(l) !== null || (l.unit && l.unit !== "each" && parseQty(l.qty) === null))) {
      reportSaveError("Enter the missing quantity or price on each flagged line before saving."); return false;
    }
    if (validLines.some(l => l.arborist && (!l.priceConfirmed || l.price.trim() === "" || !(Number(l.price) >= 0)))) {
      reportSaveError("Enter an exact price for each missing or ambiguous recommendation before saving."); return false;
    }
    if (!optionsEnabled) return true;
    if (validLines.some(l => l.kind !== "required") && discountEnabled && discountType === "%" && Number(discountValue) > 0) {
      reportSaveError("Quotes with customer choices use a fixed-dollar discount. Switch the discount to $ before saving."); return false;
    }
    const problems = builderOptionErrors(validLines.map(l => ({ id: l.id, description: l.description, quantity: Number(l.qty), unit_price: Number(l.price),
      option_kind: l.kind, option_group: l.kind === "alternative" ? l.group.trim() : null, default_selected: l.kind === "required" ? true : l.proposed })));
    if (problems.length) { reportSaveError(problems[0]); return false; }
    return true;
  };
  const optionFields = (l: LineItem) => optionsEnabled
    ? { option_kind: l.kind, option_group: l.kind === "alternative" ? l.group.trim() : null, default_selected: l.kind === "required" ? true : l.proposed }
    : { option_kind: "required", option_group: null, default_selected: true };

  /** Jobber picks become a same-workspace platform customer; returns the platform customer id. */
  const resolveCustomer = async (): Promise<string | null> => {
    if (!customerId) return null;
    if (customerSource !== "jobber") return customerId;
    const { data: found } = await supabase.from("platform_customers").select("id")
      .eq("business_id", bizId).eq("source_system", "jobber").eq("source_record_id", customerId).maybeSingle();
    if (found) return found.id;
    const { data: newCust, error: custErr } = await supabase.from("platform_customers").insert({
      business_id: bizId, display_name: customerName, email: customerEmail || null,
      phone: customerPhone || null, source_system: "jobber", source_record_id: customerId,
    }).select("id").single();
    if (custErr || !newCust) { toast.error("Failed to create customer record"); return null; }
    return newCust.id;
  };

  const persistQuote = async (): Promise<{ id: string; quote_number: string } | null> => {
    setSaveError(null);
    const pricedLines = lineItems.filter(l => l.description.trim());
    if (!checkOptionsAndPrices(pricedLines)) return null;
    if (deposit.error) { reportSaveError(deposit.error); return null; }
    if (editingQuote && editSnapshot.current) {
      if (editSavingRef.current) return null;
      if (!userId) { reportSaveError("Sign in before saving the quote"); return null; }
      const validLines = lineItems.filter(l => l.description.trim());
      if (!validLines.length) { reportSaveError("Add at least one line item"); return null; }
      if (lineItems.some(l => !l.description.trim() && (l.price !== "" || l.original))) {
        reportSaveError("Enter a description or remove the empty line"); return null;
      }
      if (![taxRate, discountValue, depositValue].every(v => Number.isFinite(Number(v)) && Number(v) >= 0) ||
        Number(taxRate) > 100 || (discountEnabled && discountAmount > subtotal) ||
        (depositEnabled && depositAmount > total)) {
        reportSaveError("Check the tax, discount, and deposit amounts"); return null;
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
          unit: l.unit ?? l.original?.unit ?? "each", discount_amount: l.original?.discount_amount ?? 0,
          taxable_flag: l.original?.taxable_flag ?? true, line_type: l.original?.line_type ?? "service",
          service_catalog_id: l.original?.service_catalog_id ?? null,
          line_total: lineAmount(l), sort_order: i, ...optionFields(l),
        })), userId);
        editSnapshot.current = result;
        if (result.historyWarning) toast.warning(result.historyWarning);
        if (canAssignCustomer && customerId && !result.quote.customer_id) {
          const resolved = await resolveCustomer();
          if (!resolved) return null;
          const { data: assigned, error: assignErr } = await supabase.from("platform_quotes").update({ customer_id: resolved, last_modified_by_user_id: userId })
            .eq("id", result.quote.id).eq("business_id", bizId).is("customer_id", null).eq("status", "draft").select("*").single();
          if (assignErr || !assigned) { reportSaveError(`Changes saved, but the customer couldn't be attached: ${assignErr?.message ?? "not confirmed"}`); return null; }
          editSnapshot.current = { ...result, quote: assigned };
        }
        const saved = { id: result.quote.id, quote_number: result.quote.quote_number };
        setSavedQuote(saved);
        return saved;
      } catch (error) {
        reportSaveError(error instanceof Error ? error.message : "Could not save quote changes. Check your connection and retry; your work is still here.");
        return null;
      } finally {
        editSavingRef.current = false;
        setSaving(false);
      }
    }
    if (savedQuote) return savedQuote;
    if (!bizId) return null;
    const validLines = lineItems.filter(l => l.description.trim());
    if (validLines.length === 0) { reportSaveError("Add at least one line item"); return null; }
    if (arboristSource) {
      // Never create a second customer quote for the same arborist report.
      const { data: prior } = await supabase.from("platform_quotes").select("id, quote_number")
        .eq("source_arborist_quote_id", arboristSource.reportId).maybeSingle();
      if (prior) { toast.error(`Quote ${prior.quote_number} already exists for this arborist report — opening it.`); window.location.assign(`/platform/quotes/${prior.id}/edit`); return null; }
    }

    setSaving(true);

    // Resolve customer (none is allowed: an unassigned draft gets its customer later, before sending)
    const resolvedCustomerId = customerId ? await resolveCustomer() : null;
    if (customerId && !resolvedCustomerId) { setSaving(false); return null; }

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
      ...(arboristSource ? { source_arborist_quote_id: arboristSource.reportId } : {}),
    }).select().single();

    if (error && arboristSource && error.code === "23505") {
      setSaving(false);
      const { data: prior } = await supabase.from("platform_quotes").select("id").eq("source_arborist_quote_id", arboristSource.reportId).maybeSingle();
      toast.error("A customer quote already exists for this arborist report — opening it.");
      if (prior) window.location.assign(`/platform/quotes/${prior.id}/edit`);
      return null;
    }
    if (error || !quote) { reportSaveError(error?.message || "Failed to create quote. Check your connection and retry."); setSaving(false); return null; }

    // Insert line items
    const { error: lineErr } = await supabase.from("platform_quote_line_items").insert(
      validLines.map((l, i) => ({
        business_id: bizId, quote_id: quote.id, description: l.description,
        quantity: Number(l.qty) || 1, unit: l.unit ?? "each", unit_price: Number(l.price) || 0,
        discount_amount: 0, taxable_flag: true,
        line_total: lineAmount(l), sort_order: i, ...optionFields(l),
      }))
    );
    if (lineErr) {
      reportSaveError(`Quote saved but line items failed to save: ${lineErr.message}. Not sending — fix the quote before it goes out.`);
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
      reportSaveError("Could not confirm the quote saved. Nothing was sent — please retry.");
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

  const workspaceTheme = getWorkspaceThemeFromBusiness(activeBiz);
  return (
    <WorkspaceThemeProvider shortcode={workspaceTheme.shortcode}>
      <div className="ops-theme fixed inset-0 z-50 bg-background text-foreground flex flex-col invoice-form" style={workspaceThemeVars(workspaceTheme)} data-workspace={workspaceTheme.shortcode}>
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
            {!existing?.accepted_snapshot && (
              <Button size="sm" className="font-body text-xs" onClick={() => setAssistantOpen(true)} data-testid="quote-ai-open" aria-label="Describe your quote">
                <Sparkles className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">Describe your quote</span>
              </Button>
            )}
            <Button aria-label="Quote Preview" variant="outline" size="sm" className="font-body text-xs md:hidden" onClick={() => setShowMobilePreview(true)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="font-body text-xs hidden md:flex" onClick={() => setShowMobilePreview(true)}>
              <Eye className="w-3.5 h-3.5 mr-1" /> Full Preview
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left: Form */}
          <fieldset disabled={saving} className="flex-1 min-h-0 min-w-0 md:w-[60%] overflow-y-auto overscroll-contain p-4 md:p-6 space-y-6">
            {/* Business & Customer */}
            <section className="space-y-4">
              <SectionHeader title="Business & Customer" icon={Building2} />
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="font-body text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">From</p>
                <p className="font-body text-sm font-semibold text-foreground">{activeBiz?.public_brand_name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{activeBiz?.shortcode?.toUpperCase()}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                {arboristSource && (
                  <div className="rounded-md border border-primary/25 bg-primary/5 p-2 space-y-1" data-testid="arborist-customer-hint">
                    <p className="font-body text-[11px] text-foreground">From arborist report: <span className="font-semibold">{arboristSource.customerName || "No name"}</span>{arboristSource.propertyAddress ? ` · ${arboristSource.propertyAddress}` : ""}</p>
                    <p className="font-body text-[10px] text-muted-foreground">Choose the matching customer, or add a new one. Nothing is matched automatically.</p>
                    <div className="flex flex-wrap gap-3">
                      {arboristSource.customerName && !customerId && (
                        <button type="button" className="font-body text-[10px] text-primary hover:underline" onClick={() => { setCustomerSearch(arboristSource.customerName); setShowCustomerSearch(true); }}>Search “{arboristSource.customerName}”</button>
                      )}
                      <a className="font-body text-[10px] text-primary hover:underline" href={`/platform/arborist-quotes?report=${arboristSource.reportId}`} target="_blank" rel="noreferrer">View arborist report & photos</a>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <p className="font-body text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Prepared For</p>
                  <div className="flex items-center gap-3">
                    {customerId && canAssignCustomer && (
                      <button className="font-body text-[10px] text-primary hover:underline" onClick={() => { setCustomerId(null); setCustomerName(""); setRecipientName(""); setEditingRecipientName(false); setShowCustomerSearch(true); }}>Change</button>
                    )}
                    {canAssignCustomer && (
                      <Button type="button" size="sm" variant="outline" data-testid="quote-new-customer"
                        className="h-7 px-2 text-xs border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => { setShowCustomerSearch(false); setNewCustomerOpen(true); }}>
                        <UserPlus className="w-3.5 h-3.5 mr-1" />New customer
                      </Button>
                    )}
                  </div>
                </div>
                {!customerId && !canAssignCustomer ? (
                  <p className="font-body text-xs text-muted-foreground">No customer on this quote.</p>
                ) : customerId ? (
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
                  <div>
                  <p className="font-body text-[11px] text-muted-foreground mb-1.5" data-testid="quote-unassigned-note">You can save a draft without a customer. Choose one before sending or sharing.</p>
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
                <label htmlFor="quote-scope" className="font-body text-[10px] font-medium text-muted-foreground mb-1 block">Scope of Work</label>
                <Textarea id="quote-scope" ref={scopeRef} value={scopeOfWork} onChange={e => setScopeOfWork(e.target.value)}
                  placeholder="Describe the full job scope shown to the customer…"
                  className="bg-card border-border font-body text-base leading-relaxed min-h-48 resize-none overflow-hidden" />
              </div>
            </section>

            {/* Line Items */}
            {optionsEnabled && (arboristSource || existing?.source_arborist_quote_id) && <section className="space-y-3 border border-border rounded-lg p-4">
              {!disposalActive && <label className="block space-y-2 text-sm">Complete roadside job price ($)<Input aria-label="Complete roadside job price" inputMode="decimal" value={roadsidePrice} onChange={e => setRoadsidePrice(e.target.value)} /></label>}
              {arboristSource?.disposal?.reference && <p className="text-sm text-muted-foreground">Staff only · {arboristSource.disposal.reference}</p>}
              <Button variant="outline" disabled={saving || !!existing?.accepted_snapshot} onClick={toggleDisposal}>{disposalActive ? "Turn alternatives off — keep haul-away" : "Offer haul-away / roadside options"}</Button>
            </section>}
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
              <div className="hidden md:grid md:grid-cols-[1fr_70px_90px_100px_100px_32px] gap-2 px-1">
                <span className="font-body text-[10px] font-medium text-muted-foreground uppercase">Description</span>
                <span className="font-body text-[10px] font-medium text-muted-foreground uppercase text-center">Qty</span>
                <span className="font-body text-[10px] font-medium text-muted-foreground uppercase text-center">Unit</span>
                <span className="font-body text-[10px] font-medium text-muted-foreground uppercase text-right">Unit Price</span>
                <span className="font-body text-[10px] font-medium text-muted-foreground uppercase text-right">Total</span>
                <span />
              </div>
              <div className="space-y-2">
                {lineItems.map(line => {
                  const lineTotal = lineAmount(line);
                  return (
                    <div key={line.id} className="grid grid-cols-1 md:grid-cols-[1fr_70px_90px_100px_100px_32px] gap-2 bg-card border border-border rounded-lg p-2.5 md:p-2 md:rounded-none md:border-0 md:border-b md:bg-transparent">
                      <Input aria-label="Line description" placeholder="Service description…" value={line.description} onChange={e => updateLine(line.id, "description", e.target.value)} className="bg-secondary/50 border-border font-body text-sm" />
                      <div className="flex gap-2 md:contents">
                        <div className="flex-1 md:flex-none">
                          <Input aria-label="Quantity" type="number" min="0.01" step="any" placeholder="Qty" value={line.qty} onChange={e => updateLine(line.id, "qty", e.target.value)} className="bg-secondary/50 border-border font-body text-sm text-center" />
                        </div>
                        <div className="flex-1 md:flex-none">
                          <select aria-label="Unit" value={line.unit ?? "each"} onChange={e => updateLine(line.id, "unit", e.target.value)}
                            className="h-10 w-full rounded-md border border-border bg-secondary/50 px-1.5 font-body text-sm text-foreground">
                            {[...new Set([...QUOTE_UNITS, line.unit ?? "each"])].map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
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
                      {lineAiProblem(line) && (
                        <p className="md:col-span-6 font-body text-xs text-amber-400" data-testid="ai-line-issue">Needs attention: {lineAiProblem(line)}</p>
                      )}
                      {line.arborist && (
                        <div className="md:col-span-6 flex flex-wrap items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5" data-testid="arborist-price-reference">
                          <span className="font-body text-sm text-muted-foreground">Staff only · {line.arborist.suggestion}</span>
                          {line.arborist.fixedPrice && !line.priceConfirmed && (
                            <button type="button" className="font-body text-[11px] font-semibold text-primary underline"
                              onClick={() => updateLine(line.id, "price", line.arborist?.fixedPrice ?? "")}>Use ${line.arborist.fixedPrice}</button>
                          )}
                          {!line.priceConfirmed && <span className="font-body text-[11px] text-muted-foreground">Price not confirmed</span>}
                        </div>
                      )}
                      {optionsEnabled && (
                        <div className="md:col-span-6 flex flex-wrap items-center gap-2" data-testid="line-option-controls">
                          <select aria-label="Line type" value={line.kind}
                            onChange={e => updateOption(line.id, { kind: e.target.value as OptionKind, proposed: e.target.value === "required" ? true : line.kind === "required" ? false : line.proposed })}
                            className="h-8 rounded-md border border-border bg-secondary/50 px-2 font-body text-xs text-foreground">
                            {(Object.keys(OPTION_KIND_LABELS) as OptionKind[]).map(k => <option key={k} value={k}>{OPTION_KIND_LABELS[k]}</option>)}
                          </select>
                          {line.kind === "alternative" && (
                            <Input aria-label="Choice group name" placeholder="Group, e.g. Debris handling" maxLength={120} value={line.group}
                              onChange={e => updateOption(line.id, { group: e.target.value })} className="h-8 w-48 bg-secondary/50 border-border font-body text-xs" />
                          )}
                          {line.kind !== "required" && (
                            <label className="flex items-center gap-1.5 font-body text-xs text-muted-foreground">
                              <input type={line.kind === "alternative" ? "radio" : "checkbox"} aria-label="Proposed choice" checked={line.proposed}
                                onChange={e => updateOption(line.id, { proposed: line.kind === "alternative" ? true : e.target.checked })} className="accent-primary" />
                              {line.kind === "alternative" ? "Proposed choice" : "Pre-selected for customer"}
                            </label>
                          )}
                        </div>
                      )}
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
                        {optionsEnabled && lineItems.some(l => l.kind !== "required") && <span className="font-body text-[10px] text-muted-foreground" data-testid="fixed-discount-note">Fixed $ only with customer choices</span>}
                        <span className="text-sm text-foreground ml-2">-${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-body text-base font-bold text-foreground">Total</span>
                    <span className="font-body text-xl font-bold text-primary">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="space-y-3 border-t border-border pt-3">
                    <label htmlFor="quote-deposit-required" className="flex min-h-12 items-center gap-3 cursor-pointer font-body text-sm text-foreground">
                      <Checkbox id="quote-deposit-required" checked={depositEnabled} className="h-6 w-6" onCheckedChange={value => setDepositEnabled(value === true)} />
                      Deposit Required
                    </label>
                    {depositEnabled && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant={depositType === "%" && depositValue === "25" ? "default" : "outline"} className="min-h-11" onClick={() => { setDepositType("%"); setDepositValue("25"); }}>25%</Button>
                          <Button type="button" variant="outline" className="min-h-11" aria-pressed={depositType === "%"} onClick={() => setDepositType("%")}>Custom %</Button>
                          <Button type="button" variant="outline" className="min-h-11" aria-pressed={depositType === "$"} onClick={() => setDepositType("$")}>Fixed $</Button>
                        </div>
                        <label className="block text-sm text-muted-foreground">{depositType === "%" ? "Deposit percentage" : "Deposit amount ($)"}
                          <Input aria-label={depositType === "%" ? "Deposit percentage" : "Deposit amount ($)"} type="number" inputMode="decimal" min="0.01" max={depositType === "%" ? 100 : total} step="0.01" value={depositValue} onChange={e => setDepositValue(e.target.value)} className="mt-1 h-12 text-base bg-secondary/50 border-border" aria-invalid={!!deposit.error} aria-describedby={deposit.error ? "quote-deposit-error" : undefined} />
                        </label>
                        {deposit.error && <p id="quote-deposit-error" className="text-sm text-destructive">{deposit.error}</p>}
                        <div className="flex justify-between gap-2 text-sm"><span className="text-muted-foreground">Required deposit</span><span className="text-primary">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between gap-2 text-sm"><span className="text-muted-foreground">Remaining balance</span><span className="text-foreground">${deposit.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
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
        <footer className="shrink-0 border-t border-border bg-background px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {saveError && <p role="alert" className="text-sm text-destructive mb-3">{saveError}</p>}
          <div className="flex gap-2">
            <Button className="flex-1 min-h-12 font-body text-sm" disabled={saving} onClick={() => { void handleSaveDraft(); }}>
              <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving…" : editingQuote ? "Save Changes" : "Save as Draft"}
            </Button>
            {!editingQuote && <Button variant="outline" className="flex-1 min-h-12" disabled={saving} onClick={() => {
              if (!customerId) { reportSaveError("Choose a customer before sending. You can save this as a draft without one."); return; }
              void openSendModal();
            }}><Send className="w-4 h-4 mr-1.5" /> Send Quote</Button>}
          </div>
        </footer>
      </div>

      {/* Mobile Preview */}
      <Sheet open={showMobilePreview} onOpenChange={setShowMobilePreview}>
        <SheetContent side="bottom" className="h-[95dvh] p-0 bg-background border-t border-border overflow-hidden flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
            <SheetTitle className="text-foreground font-display text-base">Quote Preview</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
            <div className="max-w-[480px] mx-auto" ref={mobilePreviewRef}><QuotePreviewPanel data={previewData} /></div>
          </div>
          <div className="shrink-0 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-border bg-background flex gap-2">
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
      {canAssignCustomer && (
        <NewCustomerSheet open={newCustomerOpen} businessId={bizId} onOpenChange={setNewCustomerOpen} onCreated={handleNewCustomerCreated} />
      )}
      <QuoteAssistant open={assistantOpen} onOpenChange={setAssistantOpen} businessId={bizId}
        hasExistingWork={builderHasWork(scopeOfWork, lineItems)}
        settingsSummary={`tax ${taxEnabled ? `on at ${taxRate}%` : "off"}, discount ${discountEnabled ? "on" : "off"}, deposit ${depositEnabled ? `on (${depositType === "%" ? `${depositValue}%` : `$${depositValue}`})` : "off"}`}
        onApply={applyAiDraft} />
    </WorkspaceThemeProvider>
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
