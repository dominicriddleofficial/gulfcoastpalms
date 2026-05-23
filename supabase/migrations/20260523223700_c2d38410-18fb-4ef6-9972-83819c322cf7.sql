
ALTER TABLE public.platform_clock_sessions
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_by uuid,
  ADD COLUMN IF NOT EXISTS close_reason text,
  ADD COLUMN IF NOT EXISTS gps_permission text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS auto_closed_at timestamptz;

ALTER TABLE public.platform_crew_settings
  ADD COLUMN IF NOT EXISTS allow_clock_in_without_gps boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_clock_sessions_needs_review
  ON public.platform_clock_sessions (business_id, needs_review)
  WHERE needs_review = true;

-- Admin force-close with reason; also writes a timesheet edit log entry.
CREATE OR REPLACE FUNCTION public.close_clock_session_with_reason(
  _session_id uuid,
  _clock_out_at timestamptz,
  _reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _biz uuid;
  _user uuid := auth.uid();
  _old_out timestamptz;
  _in timestamptz;
BEGIN
  SELECT business_id, clock_out_at, clock_in_at
    INTO _biz, _old_out, _in
  FROM public.platform_clock_sessions WHERE id = _session_id;

  IF _biz IS NULL THEN RAISE EXCEPTION 'session not found'; END IF;
  IF NOT public.user_has_any_role(_user, _biz, ARRAY['owner','manager']) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) = 0 THEN
    RAISE EXCEPTION 'reason required';
  END IF;
  IF _clock_out_at <= _in THEN
    RAISE EXCEPTION 'clock_out must be after clock_in';
  END IF;

  UPDATE public.platform_clock_sessions
     SET clock_out_at  = _clock_out_at,
         total_minutes = GREATEST(0, EXTRACT(EPOCH FROM (_clock_out_at - _in))::int / 60),
         status        = 'closed',
         needs_review  = true,
         closed_by     = _user,
         close_reason  = _reason,
         auto_closed_at= now(),
         updated_at    = now()
   WHERE id = _session_id;

  INSERT INTO public.platform_timesheet_edits
    (business_id, clock_session_id, edited_by, field_name, old_value, new_value, reason)
  VALUES
    (_biz, _session_id, _user, 'clock_out_at',
     COALESCE(_old_out::text, 'NULL'), _clock_out_at::text,
     'Admin close: ' || _reason);
END;
$$;

-- Flag prior-day still-open sessions as needing review (idempotent).
CREATE OR REPLACE FUNCTION public.flag_stale_clock_sessions(_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count integer;
BEGIN
  IF NOT public.has_business_access(auth.uid(), _business_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.platform_clock_sessions
     SET needs_review = true, updated_at = now()
   WHERE business_id = _business_id
     AND clock_out_at IS NULL
     AND schedule_date < (now() AT TIME ZONE 'America/Chicago')::date
     AND needs_review = false;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;
