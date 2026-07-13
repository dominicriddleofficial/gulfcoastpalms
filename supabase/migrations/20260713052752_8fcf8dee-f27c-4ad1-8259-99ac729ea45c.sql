
CREATE OR REPLACE FUNCTION public.process_yearly_autoschedule()
RETURNS TABLE(created_count int, skipped_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rec RECORD;
  _res RECORD;
  _created int := 0;
  _skipped int := 0;
BEGIN
  FOR _rec IN
    WITH last_past AS (
      SELECT DISTINCT ON (pj.customer_id)
        pj.customer_id, pj.id AS job_id, pj.scheduled_start
      FROM public.platform_jobs pj
      JOIN public.platform_customers c
        ON c.id = pj.customer_id AND c.yearly_trimming = true
      WHERE pj.deleted_at IS NULL
        AND pj.status NOT IN ('canceled','cancelled')
        AND pj.scheduled_start IS NOT NULL
        AND pj.scheduled_start <= CURRENT_DATE - 1
      ORDER BY pj.customer_id, pj.scheduled_start DESC
    )
    SELECT lp.customer_id, lp.job_id, lp.scheduled_start
    FROM last_past lp
    WHERE NOT EXISTS (
      SELECT 1 FROM public.platform_jobs f
      WHERE f.customer_id = lp.customer_id
        AND f.deleted_at IS NULL
        AND f.status IN ('scheduled','in_progress')
        AND f.scheduled_start > CURRENT_DATE
    )
  LOOP
    BEGIN
      SELECT * INTO _res FROM public.create_yearly_auto_job(_rec.job_id);
      IF _res.out_created THEN
        _created := _created + 1;
      ELSE
        _skipped := _skipped + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      _skipped := _skipped + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT _created, _skipped;
END;
$$;

REVOKE ALL ON FUNCTION public.process_yearly_autoschedule() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_yearly_autoschedule() TO service_role;

-- Nightly cron at 08:00 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('yearly-autoschedule-nightly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'yearly-autoschedule-nightly',
  '0 8 * * *',
  $$SELECT public.process_yearly_autoschedule();$$
);
