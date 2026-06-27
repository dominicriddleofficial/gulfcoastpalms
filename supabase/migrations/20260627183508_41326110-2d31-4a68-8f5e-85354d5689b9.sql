
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
  p_business_id uuid,
  p_week_start date,
  p_week_end date,
  p_month_start date,
  p_month_end date
)
RETURNS TABLE(
  revenue_week numeric,
  jobs_week bigint,
  revenue_month numeric,
  jobs_month bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH bounds AS (
  SELECT
    LEAST(p_week_start, p_month_start) AS lo,
    GREATEST(p_week_end, p_month_end) AS hi
),
-- Visits joined to their platform_jobs, filtered & deduped just like buildPlatformItem
visit_items AS (
  SELECT
    v.scheduled_date,
    COALESCE(j.total, 0)::numeric AS amount,
    j.id AS job_id,
    j.source_system,
    j.source,
    j.source_record_id
  FROM public.platform_job_visits v
  JOIN public.platform_jobs j ON j.id = v.job_id
  CROSS JOIN bounds
  WHERE v.business_id = p_business_id
    AND v.scheduled_date IS NOT NULL
    AND v.scheduled_date >= bounds.lo
    AND v.scheduled_date <= bounds.hi
    AND j.deleted_at IS NULL
    AND lower(COALESCE(j.status, 'scheduled')) NOT IN ('archived','canceled','cancelled','deleted')
    AND lower(COALESCE(v.status, 'scheduled')) NOT IN ('archived','canceled','cancelled','deleted')
),
-- Platform jobs that have NO visit rows at all (mirrors platformJobIdsWithVisits skip).
-- JS only skips a platform_job if it appeared in visitRows; visitRows are filtered
-- by scheduled_date NOT NULL, so any visit on that job (any date) would dedupe.
job_items AS (
  SELECT
    j.scheduled_start::date AS scheduled_date,
    COALESCE(j.total, 0)::numeric AS amount,
    j.id AS job_id,
    j.source_system,
    j.source,
    j.source_record_id
  FROM public.platform_jobs j
  CROSS JOIN bounds
  WHERE j.business_id = p_business_id
    AND j.scheduled_start IS NOT NULL
    AND j.scheduled_start::date >= bounds.lo
    AND j.scheduled_start::date <= bounds.hi
    AND j.deleted_at IS NULL
    AND lower(COALESCE(j.status, 'scheduled')) NOT IN ('archived','canceled','cancelled','deleted')
    AND NOT EXISTS (
      SELECT 1 FROM public.platform_job_visits v2
      WHERE v2.job_id = j.id
        AND v2.scheduled_date IS NOT NULL
    )
),
-- importedJobberIds in JS: source_record_id collected from non-excluded items that
-- buildPlatformItem produced (visit_items or job_items above).
imported_ids AS (
  SELECT DISTINCT source_record_id AS sid
  FROM (
    SELECT source_system, source, source_record_id FROM visit_items
    UNION ALL
    SELECT source_system, source, source_record_id FROM job_items
  ) x
  WHERE source_record_id IS NOT NULL
    AND (source_system = 'jobber' OR source = 'jobber')
),
jobber_items AS (
  SELECT
    jj.scheduled_start::date AS scheduled_date,
    COALESCE(jj.total_amount, 0)::numeric AS amount
  FROM public.jobber_jobs jj
  CROSS JOIN bounds
  WHERE jj.business_id = p_business_id
    AND jj.scheduled_start IS NOT NULL
    AND jj.scheduled_start::date >= bounds.lo
    AND jj.scheduled_start::date <= bounds.hi
    AND lower(COALESCE(jj.status, '')) NOT IN ('archived','canceled','cancelled','deleted')
    AND lower(COALESCE(jj.visit_status, '')) NOT IN ('archived','canceled','cancelled','deleted')
    AND NOT EXISTS (
      SELECT 1 FROM imported_ids ii WHERE ii.sid = jj.id::text
    )
),
all_items AS (
  SELECT scheduled_date, amount FROM visit_items
  UNION ALL
  SELECT scheduled_date, amount FROM job_items
  UNION ALL
  SELECT scheduled_date, amount FROM jobber_items
)
SELECT
  COALESCE(SUM(amount) FILTER (WHERE scheduled_date BETWEEN p_week_start AND p_week_end), 0)::numeric,
  COUNT(*)              FILTER (WHERE scheduled_date BETWEEN p_week_start AND p_week_end)::bigint,
  COALESCE(SUM(amount) FILTER (WHERE scheduled_date BETWEEN p_month_start AND p_month_end), 0)::numeric,
  COUNT(*)              FILTER (WHERE scheduled_date BETWEEN p_month_start AND p_month_end)::bigint
FROM all_items;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis(uuid, date, date, date, date) TO authenticated;
