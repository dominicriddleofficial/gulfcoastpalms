import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LeadStatus = "new" | "attempted_contact" | "contacted" | "estimate_scheduled" | "quoted" | "won" | "lost" | "dormant";

export const LEAD_STATUSES: { value: LeadStatus; label: string; color: string }[] = [
  { value: "new", label: "New", color: "var(--accent-color)" },
  { value: "attempted_contact", label: "Attempted", color: "#f59e0b" },
  { value: "contacted", label: "Contacted", color: "#3b82f6" },
  { value: "estimate_scheduled", label: "Estimate Scheduled", color: "#8b5cf6" },
  { value: "quoted", label: "Quoted", color: "#06b6d4" },
  { value: "won", label: "Won", color: "var(--accent-color)" },
  { value: "lost", label: "Lost", color: "#ef4444" },
  { value: "dormant", label: "Dormant", color: "#6b7280" },
];

export interface PlatformLead {
  id: string;
  business_id: string;
  source_name: string | null;
  website_origin: string | null;
  inquiry_name: string;
  inquiry_phone: string | null;
  inquiry_email: string | null;
  requested_service: string | null;
  requested_service_category: string | null;
  urgency_level: string;
  message: string | null;
  lead_status: string;
  assigned_to_user_id: string | null;
  next_follow_up_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  budget_range: string | null;
}

export function usePlatformLeads(businessId: string | null) {
  const [leads, setLeads] = useState<PlatformLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("platform_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (businessId) {
      query = query.eq("business_id", businessId);
    }
    if (statusFilter !== "all") {
      query = query.eq("lead_status", statusFilter);
    }

    const { data, error } = await query;
    if (!error && data) {
      setLeads(data as PlatformLead[]);
    }
    setLoading(false);
  }, [businessId, statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = searchQuery
    ? leads.filter(l =>
        l.inquiry_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.inquiry_phone?.includes(searchQuery) ||
        l.inquiry_email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : leads;

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    const { error } = await supabase
      .from("platform_leads")
      .update({ lead_status: newStatus })
      .eq("id", leadId);
    if (!error) fetchLeads();
    return !error;
  };

  const statusCounts = LEAD_STATUSES.reduce((acc, s) => {
    acc[s.value] = leads.filter(l => l.lead_status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  return {
    leads: filteredLeads,
    allLeads: leads,
    loading,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    statusCounts,
    updateLeadStatus,
    refetch: fetchLeads,
  };
}
