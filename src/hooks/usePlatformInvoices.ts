import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const INVOICE_STATUSES = [
  { value: "draft", label: "Draft", color: "#6b7280" },
  { value: "sent", label: "Sent", color: "#2563eb" },
  { value: "viewed", label: "Viewed", color: "#8b5cf6" },
  { value: "partial", label: "Partial", color: "#f59e0b" },
  { value: "paid", label: "Paid", color: "#22c55e" },
  { value: "overdue", label: "Overdue", color: "#ef4444" },
  { value: "void", label: "Void", color: "#64748b" },
] as const;

export const PAYMENT_METHODS = [
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "transfer", label: "Transfer" },
  { value: "other", label: "Other" },
] as const;

export type PlatformInvoice = {
  id: string;
  business_id: string;
  invoice_number: string;
  customer_id: string | null;
  property_id: string | null;
  job_id: string | null;
  quote_id: string | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  terms: string | null;
  subtotal: number | null;
  discount_total: number | null;
  tax_rate: number | null;
  tax_total: number | null;
  total: number | null;
  amount_paid: number | null;
  balance_due: number | null;
  deposit_required: boolean | null;
  deposit_amount: number | null;
  deposit_paid: boolean | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  public_notes: string | null;
  internal_notes: string | null;
  payment_instructions: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  property_address?: string;
  job_number?: string;
};

export type PlatformPayment = {
  id: string;
  business_id: string;
  payment_number: string;
  invoice_id: string | null;
  customer_id: string | null;
  amount: number;
  method: string | null;
  reference_number: string | null;
  status: string;
  payment_date: string | null;
  is_deposit: boolean | null;
  is_refund: boolean | null;
  notes: string | null;
  created_at: string;
  customer_name?: string;
  invoice_number?: string;
};

export type InvoiceLineItem = {
  id: string;
  invoice_id: string;
  business_id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  discount_amount: number | null;
  taxable_flag: boolean | null;
  line_total: number;
  sort_order: number | null;
};

export function usePlatformInvoices(businessId: string | null) {
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("platform_invoices")
      .select("*, platform_customers(display_name), platform_properties(address_1, city), platform_jobs(job_number)")
      .order("created_at", { ascending: false });

    if (businessId) query = query.eq("business_id", businessId);

    const { data, error } = await query;
    if (!error && data) {
      setInvoices(data.map((inv: any) => ({
        ...inv,
        customer_name: inv.platform_customers?.display_name || null,
        property_address: inv.platform_properties ? `${inv.platform_properties.address_1}, ${inv.platform_properties.city}` : null,
        job_number: inv.platform_jobs?.job_number || null,
      })));
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const filtered = useMemo(() => {
    let result = invoices;
    if (statusFilter !== "all") result = result.filter(i => i.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.invoice_number.toLowerCase().includes(q) ||
        i.customer_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [invoices, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: invoices.length };
    INVOICE_STATUSES.forEach(s => { counts[s.value] = invoices.filter(i => i.status === s.value).length; });
    return counts;
  }, [invoices]);

  const totals = useMemo(() => {
    const outstanding = invoices.filter(i => !["paid", "void"].includes(i.status));
    return {
      totalOutstanding: outstanding.reduce((s, i) => s + (Number(i.balance_due) || 0), 0),
      totalCollected: invoices.reduce((s, i) => s + (Number(i.amount_paid) || 0), 0),
      overdueCount: invoices.filter(i => i.status === "overdue").length,
    };
  }, [invoices]);

  return {
    invoices: filtered, allInvoices: invoices, loading, statusFilter, setStatusFilter,
    searchQuery, setSearchQuery, statusCounts, totals, refetch: fetchInvoices,
  };
}

export function usePlatformPayments(businessId: string | null) {
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("platform_payments")
      .select("*, platform_customers(display_name), platform_invoices(invoice_number)")
      .order("created_at", { ascending: false });

    if (businessId) query = query.eq("business_id", businessId);

    const { data, error } = await query;
    if (!error && data) {
      setPayments(data.map((p: any) => ({
        ...p,
        customer_name: p.platform_customers?.display_name || null,
        invoice_number: p.platform_invoices?.invoice_number || null,
      })));
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filtered = useMemo(() => {
    if (!searchQuery) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter(p =>
      p.payment_number.toLowerCase().includes(q) ||
      p.customer_name?.toLowerCase().includes(q) ||
      p.invoice_number?.toLowerCase().includes(q)
    );
  }, [payments, searchQuery]);

  const totals = useMemo(() => ({
    totalReceived: payments.filter(p => !p.is_refund).reduce((s, p) => s + Number(p.amount), 0),
    totalRefunded: payments.filter(p => p.is_refund).reduce((s, p) => s + Number(p.amount), 0),
    count: payments.length,
  }), [payments]);

  return { payments: filtered, allPayments: payments, loading, searchQuery, setSearchQuery, totals, refetch: fetchPayments };
}
