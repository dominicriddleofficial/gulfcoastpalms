import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, addDays } from "date-fns";

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
  const [jobs, setJobs] = useState<JobberJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("jobber_jobs")
      .select("*")
      .order("scheduled_start", { ascending: true });

    if (!error && data) {
      setJobs(data as unknown as JobberJob[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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