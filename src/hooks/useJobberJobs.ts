import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { useBusinessContext } from "@/contexts/BusinessContext";

export type JobberJob = {
  id: string;
  jobber_id: string;
  title: string | null;
  status: string;
  visit_status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  client_name: string | null;
  client_phone: string | null;
  property_address: string | null;
  assigned_employee_names: string[] | null;
  internal_notes: string | null;
  job_number: string | null;
  service_items: any[] | null;
  total_amount: number | null;
  crew_id: string | null;
};

export function useJobberJobs() {
  const { selectedBusinessId } = useBusinessContext();
  const queryClient = useQueryClient();

  // Workspace-scoped + cached. Switching workspaces swaps to the other slice
  // instantly; React Query refetches in the background if data is stale.
  const { data: jobs = [], isLoading: loading } = useQuery({
    queryKey: ["jobber-jobs", selectedBusinessId],
    queryFn: async (): Promise<JobberJob[]> => {
      let q = supabase
        .from("jobber_jobs")
        .select("*")
        .order("scheduled_start", { ascending: true });
      if (selectedBusinessId) q = q.eq("business_id", selectedBusinessId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as JobberJob[];
    },
  });

  const fetchJobs = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ["jobber-jobs", selectedBusinessId] });
  }, [queryClient, selectedBusinessId]);

  const getJobsForDate = useCallback(
    (date: Date) => {
      const dayStart = startOfDay(date).toISOString();
      const dayEnd = endOfDay(date).toISOString();
      return jobs.filter(
        (j) =>
          j.scheduled_start &&
          j.scheduled_start >= dayStart &&
          j.scheduled_start <= dayEnd
      );
    },
    [jobs]
  );

  const getJobsForWeek = useCallback(
    (weekStartDate: Date) => {
      const wStart = startOfDay(weekStartDate).toISOString();
      const wEnd = endOfDay(addDays(weekStartDate, 6)).toISOString();
      return jobs.filter(
        (j) =>
          j.scheduled_start &&
          j.scheduled_start >= wStart &&
          j.scheduled_start <= wEnd
      );
    },
    [jobs]
  );

  const getJobById = useCallback(
    (id: string) => jobs.find((j) => j.id === id) || null,
    [jobs]
  );

  return { jobs, loading, fetchJobs, getJobsForDate, getJobsForWeek, getJobById };
}