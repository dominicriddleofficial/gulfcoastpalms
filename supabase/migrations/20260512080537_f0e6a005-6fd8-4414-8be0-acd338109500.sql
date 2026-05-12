CREATE OR REPLACE FUNCTION public.get_email_send_log_filtered(
  _status text DEFAULT NULL,
  _template text DEFAULT NULL,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _limit int DEFAULT 100,
  _offset int DEFAULT 0
)
RETURNS SETOF public.email_send_log
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.is_workspace_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT * FROM public.email_send_log
  WHERE (_status IS NULL OR status = _status)
    AND (_template IS NULL OR template_name = _template)
    AND (_from IS NULL OR created_at >= _from)
    AND (_to   IS NULL OR created_at <  _to)
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 500))
  OFFSET GREATEST(0, _offset);
END;
$$;