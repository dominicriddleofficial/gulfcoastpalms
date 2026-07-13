
-- 1) Cleanup: identify survivors and soft-delete the rest
WITH ya AS (
  SELECT id, customer_id, scheduled_start::date AS d
  FROM public.platform_jobs
  WHERE origin='yearly_auto' AND deleted_at IS NULL
),
survivors AS (
  SELECT DISTINCT ya.id
  FROM ya
  JOIN public.platform_jobs p
    ON p.customer_id = ya.customer_id
   AND p.origin IS DISTINCT FROM 'yearly_auto'
   AND p.deleted_at IS NULL
   AND p.scheduled_start::date >= DATE '2026-07-01'
   AND p.scheduled_start::date BETWEEN (ya.d - INTERVAL '1 year' - INTERVAL '45 days')::date
                                    AND (ya.d - INTERVAL '1 year' + INTERVAL '45 days')::date
),
to_delete AS (
  SELECT id FROM ya WHERE id NOT IN (SELECT id FROM survivors)
),
del_visits AS (
  DELETE FROM public.platform_job_visits WHERE job_id IN (SELECT id FROM to_delete)
  RETURNING 1
)
UPDATE public.platform_jobs
SET deleted_at = now(), updated_at = now()
WHERE id IN (SELECT id FROM to_delete);

-- 2) Function update: source-date floor July 1, 2026
CREATE OR REPLACE FUNCTION public.create_yearly_auto_job(_source_job_id uuid)
 RETURNS TABLE(out_job_id uuid, out_scheduled_date date, out_created boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _src public.platform_jobs%ROWTYPE;
  _target date;
  _existing_id uuid;
  _existing_date date;
  _new_id uuid;
  _num text;
  _visit public.platform_job_visits%ROWTYPE;
BEGIN
  SELECT * INTO _src FROM public.platform_jobs
   WHERE id = _source_job_id AND deleted_at IS NULL;
  IF NOT FOUND OR _src.customer_id IS NULL OR _src.scheduled_start IS NULL THEN
    RETURN;
  END IF;

  -- Seasonal + forward-only rule: only sources dated July 1, 2026 or later
  -- (and month July or later) are eligible. No archaeology.
  IF _src.scheduled_start::date < DATE '2026-07-01' THEN
    RETURN;
  END IF;
  IF EXTRACT(MONTH FROM _src.scheduled_start) < 7 THEN
    RETURN;
  END IF;

  -- Roll +1 year at a time until strictly in the future.
  _target := (_src.scheduled_start + INTERVAL '1 year')::date;
  WHILE _target <= CURRENT_DATE LOOP
    _target := (_target + INTERVAL '1 year')::date;
  END LOOP;

  SELECT pj.id, pj.scheduled_start INTO _existing_id, _existing_date
  FROM public.platform_jobs pj
  WHERE pj.customer_id = _src.customer_id
    AND pj.deleted_at IS NULL
    AND pj.status IN ('scheduled','in_progress')
    AND pj.scheduled_start BETWEEN (_target - 45) AND (_target + 45)
  ORDER BY ABS(pj.scheduled_start - _target)
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    RETURN QUERY SELECT _existing_id, _existing_date, false;
    RETURN;
  END IF;

  _num := public.generate_next_number(_src.business_id, 'job');

  INSERT INTO public.platform_jobs (
    business_id, job_number, customer_id, property_id, title, description,
    job_type, status, priority, tags,
    scheduled_start, scheduled_end, estimated_duration_minutes,
    subtotal, tax_total, total,
    internal_notes, client_notes, origin, source, is_read_only
  ) VALUES (
    _src.business_id, _num, _src.customer_id, _src.property_id, _src.title, _src.description,
    COALESCE(_src.job_type,'one_time'), 'scheduled', COALESCE(_src.priority,'normal'), COALESCE(_src.tags,'[]'::jsonb),
    _target,
    CASE WHEN _src.scheduled_end IS NOT NULL
         THEN (_target + (_src.scheduled_end - _src.scheduled_start))
         ELSE NULL END,
    COALESCE(_src.estimated_duration_minutes, 60),
    COALESCE(_src.subtotal, 0), COALESCE(_src.tax_total, 0), COALESCE(_src.total, 0),
    _src.internal_notes, _src.client_notes, 'yearly_auto', 'platform', false
  ) RETURNING id INTO _new_id;

  SELECT * INTO _visit FROM public.platform_job_visits pv
    WHERE pv.job_id = _src.id
    ORDER BY pv.visit_number ASC NULLS LAST, pv.scheduled_date ASC NULLS LAST
    LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.platform_job_visits (
      business_id, job_id, visit_number, title, status,
      scheduled_date, scheduled_start_time, scheduled_end_time,
      property_id, internal_notes
    ) VALUES (
      _src.business_id, _new_id, 1,
      COALESCE(_visit.title, _src.title),
      'scheduled',
      _target,
      _visit.scheduled_start_time,
      _visit.scheduled_end_time,
      COALESCE(_visit.property_id, _src.property_id),
      NULL
    );
  ELSE
    INSERT INTO public.platform_job_visits (
      business_id, job_id, visit_number, title, status, scheduled_date, property_id
    ) VALUES (
      _src.business_id, _new_id, 1, _src.title, 'scheduled', _target, _src.property_id
    );
  END IF;

  RETURN QUERY SELECT _new_id, _target, true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_yearly_autoschedule()
 RETURNS TABLE(created_count integer, skipped_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        AND pj.origin IS DISTINCT FROM 'yearly_auto'
      ORDER BY pj.customer_id, pj.scheduled_start DESC
    )
    SELECT lp.customer_id, lp.job_id, lp.scheduled_start
    FROM last_past lp
    WHERE lp.scheduled_start::date >= DATE '2026-07-01'
      AND EXTRACT(MONTH FROM lp.scheduled_start) >= 7
      AND NOT EXISTS (
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
$function$;
