import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired" | "archived";

export const QUOTE_STATUSES: { value: QuoteStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "#6b7280" },
  { value: "sent", label: "Sent", color: "#3b82f6" },
  { value: "viewed", label: "Viewed", color: "#8b5cf6" },
  { value: "accepted", label: "Accepted", color: "#22c55e" },
  { value: "declined", label: "Declined", color: "#ef4444" },
  { value: "expired", label: "Expired", color: "#f59e0b" },
  { value: "archived", label: "Archived", color: "#6b7280" },
];

export interface PlatformQuote {
  id: string;
  business_id: string;
  quote_number: string;
  customer_id: string | null;
  property_id: string | null;
  lead_id: string | null;
  status: string;
  subtotal: number;
  discount_total: number;
  tax_rate: number;
  tax_total: number;
  total: number;
  deposit_required_flag: boolean;
  deposit_type: string;
  deposit_value: number;
  deposit_amount_calculated: number;
  valid_until: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  internal_notes: string | null;
  public_notes: string | null;
  version_number: number;
  created_at: string;
  updated_at: string;
  // joined
  customer_name?: string;
  property_address?: string;
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  business_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_amount: number;
  taxable_flag: boolean;
  line_total: number;
  sort_order: number;
}

export function usePlatformQuotes(businessId: string | null) {
  const [quotes, setQuotes] = useState<PlatformQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("platform_quotes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (businessId) query = query.eq("business_id", businessId);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const { data } = await query;
    if (data) {
      // Enrich with customer names
      const customerIds = [...new Set((data as any[]).map(q => q.customer_id).filter(Boolean))];
      let customerMap = new Map<string, string>();
      if (customerIds.length > 0) {
        const { data: custs } = await supabase
          .from("platform_customers")
          .select("id, display_name")
          .in("id", customerIds);
        customerMap = new Map((custs || []).map(c => [c.id, c.display_name]));
      }

      setQuotes((data as any[]).map(q => ({
        ...q,
        customer_name: customerMap.get(q.customer_id) || "Unknown",
      })));
    }
    setLoading(false);
  }, [businessId, statusFilter]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const filtered = searchQuery
    ? quotes.filter(q =>
        q.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : quotes;

  const statusCounts = QUOTE_STATUSES.reduce((acc, s) => {
    acc[s.value] = quotes.filter(q => q.status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  return {
    quotes: filtered,
    loading,
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    statusCounts,
    refetch: fetchQuotes,
  };
}

export async function fetchQuoteLineItems(quoteId: string): Promise<QuoteLineItem[]> {
  const { data } = await supabase
    .from("platform_quote_line_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("sort_order");
  return (data || []) as QuoteLineItem[];
}

export async function fetchQuoteVersions(quoteId: string) {
  const { data } = await supabase
    .from("platform_quote_versions")
    .select("*")
    .eq("quote_id", quoteId)
    .order("version_number", { ascending: false });
  return data || [];
}

export async function generateQuoteNumber(businessId: string): Promise<string> {
  const { data, error } = await supabase.rpc("generate_next_number", {
    _business_id: businessId,
    _record_type: "quote",
  });
  if (error) throw error;
  return data as string;
}

export function calculateQuoteTotals(
  lineItems: { quantity: number; unit_price: number; discount_amount: number; taxable_flag: boolean }[],
  taxRate: number
) {
  const subtotal = lineItems.reduce((sum, li) => sum + (li.quantity * li.unit_price - li.discount_amount), 0);
  const discountTotal = lineItems.reduce((sum, li) => sum + li.discount_amount, 0);
  const taxableAmount = lineItems
    .filter(li => li.taxable_flag)
    .reduce((sum, li) => sum + (li.quantity * li.unit_price - li.discount_amount), 0);
  const taxTotal = taxableAmount * (taxRate / 100);
  const total = subtotal + taxTotal;
  return { subtotal, discountTotal, taxTotal, total };
}
