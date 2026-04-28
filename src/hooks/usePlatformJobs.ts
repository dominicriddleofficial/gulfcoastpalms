import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const JOB_STATUSES = [
  { value: "draft", label: "Draft", color: "#6b7280" },
  { value: "scheduled", label: "Scheduled", color: "#2563eb" },
  { value: "in_progress", label: "In Progress", color: "#f59e0b" },
  { value: "completed", label: "Completed", color: "var(--accent-color)" },
  { value: "invoiced", label: "Invoiced", color: "#8b5cf6" },
  { value: "closed", label: "Closed", color: "#64748b" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444" },
] as const;

export type PlatformJob = {
  id: string;
  business_id: string;
  job_number: string;
  customer_id: string | null;
  property_id: string | null;
  lead_id: string | null;
  quote_id: string | null;
  title: string | null;
  description: string | null;
  job_type: string | null;
  status: string;
  priority: string | null;
  tags: any;
  scheduled_start: string | null;
  scheduled_end: string | null;
  estimated_duration_minutes: number | null;
  total_visits_planned: number | null;
  total_visits_completed: number | null;
  subtotal: number | null;
  tax_total: number | null;
  total: number | null;
  deposit_collected: number | null;
  internal_notes: string | null;
  client_notes: string | null;
  assigned_crew_member_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // joined
  customer_name?: string;
  property_address?: string;
  crew_member_name?: string;
};

export type PlatformJobVisit = {
  id: string;
  business_id: string;
  job_id: string;
  visit_number: number;
  title: string | null;
  status: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  duration_minutes: number | null;
  route_order: number | null;
  property_id: string | null;
  internal_notes: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  job_number?: string;
  job_title?: string;
  customer_name?: string;
  property_address?: string;
  crew_names?: string[];
};

export type PlatformCrewMember = {
  id: string;
  business_id: string;
  user_id: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  color: string | null;
  hourly_rate: number | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export function usePlatformJobs(businessId: string | null) {
  const [jobs, setJobs] = useState<PlatformJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("platform_jobs")
      .select("*, platform_customers(display_name), platform_properties(address_1, city), platform_crew_members(display_name)")
      .order("created_at", { ascending: false });

    if (businessId) query = query.eq("business_id", businessId);

    const { data, error } = await query;
    if (!error && data) {
      setJobs(data.map((j: any) => ({
        ...j,
        customer_name: j.platform_customers?.display_name || null,
        property_address: j.platform_properties ? `${j.platform_properties.address_1}, ${j.platform_properties.city}` : null,
        crew_member_name: j.platform_crew_members?.display_name || null,
      })));
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const filtered = useMemo(() => {
    let result = jobs;
    if (statusFilter !== "all") result = result.filter(j => j.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(j =>
        j.job_number.toLowerCase().includes(q) ||
        j.title?.toLowerCase().includes(q) ||
        j.customer_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [jobs, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: jobs.length };
    JOB_STATUSES.forEach(s => { counts[s.value] = jobs.filter(j => j.status === s.value).length; });
    return counts;
  }, [jobs]);

  return {
    jobs: filtered, allJobs: jobs, loading, statusFilter, setStatusFilter,
    searchQuery, setSearchQuery, statusCounts, refetch: fetchJobs,
  };
}

export function usePlatformCrewMembers(businessId: string | null) {
  const [crew, setCrew] = useState<PlatformCrewMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase.from("platform_crew_members").select("*").eq("status", "active").order("display_name");
      if (businessId) query = query.eq("business_id", businessId);
      const { data } = await query;
      if (data) setCrew(data as PlatformCrewMember[]);
      setLoading(false);
    };
    fetch();
  }, [businessId]);

  return { crew, loading };
}

export function usePlatformSchedule(businessId: string | null, selectedDate: Date) {
  const [visits, setVisits] = useState<PlatformJobVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    const dateStr = selectedDate.toISOString().split("T")[0];

    let query = supabase
      .from("platform_job_visits")
      .select("*, platform_jobs(job_number, title, customer_id, platform_customers(display_name)), platform_properties(address_1, city, state, latitude, longitude)")
      .eq("scheduled_date", dateStr)
      .order("route_order", { ascending: true });

    if (businessId) query = query.eq("business_id", businessId);

    const { data, error } = await query;
    if (!error && data) {
      // Get crew assignments for these visits
      const visitIds = data.map((v: any) => v.id);
      let crewMap: Record<string, string[]> = {};
      if (visitIds.length > 0) {
        const { data: assignments } = await supabase
          .from("platform_visit_assignments")
          .select("visit_id, platform_crew_members(display_name)")
          .in("visit_id", visitIds);
        if (assignments) {
          assignments.forEach((a: any) => {
            if (!crewMap[a.visit_id]) crewMap[a.visit_id] = [];
            if (a.platform_crew_members?.display_name) crewMap[a.visit_id].push(a.platform_crew_members.display_name);
          });
        }
      }

      setVisits(data.map((v: any) => ({
        ...v,
        job_number: v.platform_jobs?.job_number || null,
        job_title: v.platform_jobs?.title || null,
        customer_name: v.platform_jobs?.platform_customers?.display_name || null,
        property_address: v.platform_properties ? `${v.platform_properties.address_1}, ${v.platform_properties.city}` : null,
        crew_names: crewMap[v.id] || [],
        lat: v.platform_properties?.latitude || null,
        lng: v.platform_properties?.longitude || null,
      })));
    }
    setLoading(false);
  }, [businessId, selectedDate]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  const crewNames = useMemo(() => {
    const names = new Set<string>();
    visits.forEach(v => {
      if (v.crew_names && v.crew_names.length > 0) {
        v.crew_names.forEach(n => names.add(n));
      } else {
        names.add("Unassigned");
      }
    });
    return [...names];
  }, [visits]);

  return { visits, loading, refetch: fetchVisits, crewNames };
}
