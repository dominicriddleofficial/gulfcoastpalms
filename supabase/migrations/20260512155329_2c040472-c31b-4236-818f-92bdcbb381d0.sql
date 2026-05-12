
CREATE INDEX IF NOT EXISTS idx_platform_jobs_source_record
  ON public.platform_jobs (source_system, source_record_id);

CREATE OR REPLACE FUNCTION public.backfill_jobber_to_platform()
RETURNS TABLE(jobs_inserted integer, visits_inserted integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _jobs integer := 0;
  _visits integer := 0;
BEGIN
  -- Insert platform_jobs for each jobber_jobs row not yet imported
  WITH ins AS (
    INSERT INTO public.platform_jobs (
      business_id, job_number, title, status,
      scheduled_start, scheduled_end,
      total, subtotal, internal_notes,
      source, source_system, source_record_id, source_last_synced_at, is_read_only
    )
    SELECT
      jj.business_id,
      'JB-' || COALESCE(NULLIF(jj.job_number, ''), left(jj.id::text, 8)),
      jj.title,
      CASE
        WHEN lower(coalesce(jj.status,'')) IN ('archived','canceled','cancelled','deleted') THEN 'cancelled'
        WHEN lower(coalesce(jj.visit_status,'')) IN ('completed','complete') THEN 'completed'
        WHEN lower(coalesce(jj.visit_status,'')) IN ('in_progress','on_site','on_my_way') THEN 'in_progress'
        ELSE 'scheduled'
      END,
      jj.scheduled_start::date,
      jj.scheduled_end::date,
      coalesce(jj.total_amount, 0),
      coalesce(jj.total_amount, 0),
      jj.internal_notes,
      'jobber', 'jobber', jj.id::text, jj.synced_at, true
    FROM public.jobber_jobs jj
    WHERE jj.scheduled_start IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.platform_jobs pj
        WHERE pj.source_system = 'jobber' AND pj.source_record_id = jj.id::text
      )
    ON CONFLICT (business_id, job_number) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO _jobs FROM ins;

  -- Insert one visit per backfilled job that has none
  WITH insv AS (
    INSERT INTO public.platform_job_visits (
      business_id, job_id, visit_number, title, status,
      scheduled_date, scheduled_start_time, scheduled_end_time
    )
    SELECT
      pj.business_id, pj.id, 1, jj.title,
      CASE
        WHEN pj.status = 'completed' THEN 'completed'
        WHEN pj.status = 'cancelled' THEN 'cancelled'
        WHEN pj.status = 'in_progress' THEN 'in_progress'
        ELSE 'scheduled'
      END,
      jj.scheduled_start::date,
      (jj.scheduled_start AT TIME ZONE 'UTC')::time,
      CASE WHEN jj.scheduled_end IS NOT NULL
           THEN (jj.scheduled_end AT TIME ZONE 'UTC')::time
           ELSE NULL END
    FROM public.platform_jobs pj
    JOIN public.jobber_jobs jj ON jj.id::text = pj.source_record_id
    WHERE pj.source_system = 'jobber'
      AND NOT EXISTS (
        SELECT 1 FROM public.platform_job_visits pv WHERE pv.job_id = pj.id
      )
    RETURNING 1
  )
  SELECT count(*) INTO _visits FROM insv;

  RETURN QUERY SELECT _jobs, _visits;
END;
$$;
