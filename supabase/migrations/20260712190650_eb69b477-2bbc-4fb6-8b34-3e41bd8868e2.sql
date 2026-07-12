-- 1) origin column on platform_jobs
ALTER TABLE public.platform_jobs ADD COLUMN IF NOT EXISTS origin text DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_jobs_yearly_auto
  ON public.platform_jobs (scheduled_start)
  WHERE origin = 'yearly_auto' AND deleted_at IS NULL;

-- 2) reminder log
CREATE TABLE IF NOT EXISTS public.yearly_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.platform_jobs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('30d','14d')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  phone text,
  error text,
  UNIQUE(job_id, kind)
);
GRANT SELECT ON public.yearly_reminder_log TO authenticated;
GRANT ALL ON public.yearly_reminder_log TO service_role;
ALTER TABLE public.yearly_reminder_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read yearly reminder log" ON public.yearly_reminder_log;
CREATE POLICY "staff read yearly reminder log"
  ON public.yearly_reminder_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_jobs j
      WHERE j.id = yearly_reminder_log.job_id
        AND public.has_business_access(auth.uid(), j.business_id)
    )
  );

-- 3) Helper: clone a job forward one year
DROP FUNCTION IF EXISTS public.create_yearly_auto_job(uuid);
CREATE OR REPLACE FUNCTION public.create_yearly_auto_job(_source_job_id uuid)
RETURNS TABLE(out_job_id uuid, out_scheduled_date date, out_created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  _target := (_src.scheduled_start + INTERVAL '1 year')::date;

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
         THEN (_src.scheduled_end + INTERVAL '1 year')::date
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
$$;
GRANT EXECUTE ON FUNCTION public.create_yearly_auto_job(uuid) TO authenticated, service_role;

-- 4) Extended set_yearly_trimming_for_job
DROP FUNCTION IF EXISTS public.set_yearly_trimming_for_job(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.set_yearly_trimming_for_job(uuid, uuid, boolean, uuid);
CREATE OR REPLACE FUNCTION public.set_yearly_trimming_for_job(
  _jobber_job_id uuid,
  _customer_id uuid,
  _value boolean,
  _source_job_id uuid DEFAULT NULL
) RETURNS TABLE(
  out_customer_id uuid,
  out_enabled boolean,
  out_source text,
  out_next_job_id uuid,
  out_next_visit_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid uuid := _customer_id;
  _biz uuid;
  _src_job uuid := _source_job_id;
  _nj uuid;
  _nd date;
BEGIN
  IF _cid IS NULL AND _jobber_job_id IS NOT NULL THEN
    SELECT pc.id, pc.business_id INTO _cid, _biz
    FROM public.jobber_jobs jj
    JOIN public.jobber_clients jc ON jc.id = jj.client_id
    JOIN public.platform_customers pc
      ON pc.business_id = jj.business_id
     AND pc.source_system = 'jobber'
     AND pc.source_record_id = jc.jobber_id
    WHERE jj.id = _jobber_job_id LIMIT 1;
  ELSIF _cid IS NOT NULL THEN
    SELECT business_id INTO _biz FROM public.platform_customers WHERE id = _cid;
  END IF;

  IF _cid IS NULL OR _biz IS NULL THEN
    RAISE EXCEPTION 'Customer not found for job';
  END IF;
  IF NOT public.has_business_access(auth.uid(), _biz) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.platform_customers
     SET yearly_trimming = _value,
         yearly_trimming_source = 'manual',
         yearly_trimming_added_at = CASE
           WHEN _value THEN COALESCE(yearly_trimming_added_at, now())
           ELSE NULL
         END,
         updated_at = now()
   WHERE id = _cid;

  IF _value THEN
    IF _src_job IS NULL AND _jobber_job_id IS NOT NULL THEN
      SELECT pj.id INTO _src_job
      FROM public.platform_jobs pj
      WHERE pj.source_system = 'jobber'
        AND pj.source_record_id = _jobber_job_id::text
        AND pj.deleted_at IS NULL
      LIMIT 1;
    END IF;
    IF _src_job IS NULL THEN
      SELECT pj.id INTO _src_job
      FROM public.platform_jobs pj
      WHERE pj.customer_id = _cid
        AND pj.deleted_at IS NULL
        AND pj.scheduled_start IS NOT NULL
      ORDER BY pj.scheduled_start DESC
      LIMIT 1;
    END IF;

    IF _src_job IS NOT NULL THEN
      SELECT c.out_job_id, c.out_scheduled_date INTO _nj, _nd
        FROM public.create_yearly_auto_job(_src_job) c;
    END IF;
  END IF;

  RETURN QUERY SELECT _cid, _value, 'manual'::text, _nj, _nd;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_yearly_trimming_for_job(uuid, uuid, boolean, uuid) TO authenticated;

-- 5) Trigger on completion
CREATE OR REPLACE FUNCTION public.auto_schedule_next_year_on_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _yt boolean;
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;
  IF lower(coalesce(NEW.status,'')) <> 'completed' THEN RETURN NEW; END IF;
  IF lower(coalesce(OLD.status,'')) = 'completed' THEN RETURN NEW; END IF;

  SELECT COALESCE(yearly_trimming, false) INTO _yt
  FROM public.platform_customers WHERE id = NEW.customer_id;

  IF _yt THEN
    BEGIN
      PERFORM public.create_yearly_auto_job(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'auto_schedule_next_year_on_complete failed for job %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_schedule_next_year ON public.platform_jobs;
CREATE TRIGGER trg_auto_schedule_next_year
  AFTER UPDATE OF status ON public.platform_jobs
  FOR EACH ROW EXECUTE FUNCTION public.auto_schedule_next_year_on_complete();

-- 6) Backfill Kelly Gates
DO $$
DECLARE _kelly_src uuid;
BEGIN
  SELECT pj.id INTO _kelly_src
  FROM public.platform_jobs pj
  WHERE pj.customer_id = 'dd260ea3-4007-4dcb-a71e-f00e785b5994'
    AND pj.deleted_at IS NULL
    AND pj.scheduled_start IS NOT NULL
  ORDER BY pj.scheduled_start DESC
  LIMIT 1;
  IF _kelly_src IS NOT NULL THEN
    PERFORM public.create_yearly_auto_job(_kelly_src);
  END IF;
END $$;

-- 7) Daily reminder cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-yearly-reminders-daily') THEN
    PERFORM cron.unschedule('process-yearly-reminders-daily');
  END IF;
  PERFORM cron.schedule(
    'process-yearly-reminders-daily',
    '0 15 * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://qczcwyqpnxknqbmwpvna.supabase.co/functions/v1/process-yearly-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1
        )
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
END $$;