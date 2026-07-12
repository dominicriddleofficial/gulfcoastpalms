
CREATE OR REPLACE FUNCTION public.get_yearly_trimming_for_job(
  _jobber_job_id uuid,
  _customer_id uuid
) RETURNS TABLE (customer_id uuid, enabled boolean, source text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid uuid := _customer_id;
  _biz uuid;
BEGIN
  IF _cid IS NULL AND _jobber_job_id IS NOT NULL THEN
    SELECT pc.id INTO _cid
    FROM public.jobber_jobs jj
    JOIN public.jobber_clients jc ON jc.id = jj.client_id
    JOIN public.platform_customers pc
      ON pc.business_id = jj.business_id
     AND pc.source_system = 'jobber'
     AND pc.source_record_id = jc.jobber_id
    WHERE jj.id = _jobber_job_id
    LIMIT 1;
  END IF;

  IF _cid IS NULL THEN
    RETURN;
  END IF;

  SELECT business_id INTO _biz FROM public.platform_customers WHERE id = _cid;
  IF _biz IS NULL OR NOT public.has_business_access(auth.uid(), _biz) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT pc.id,
           COALESCE(pc.yearly_trimming, false),
           pc.yearly_trimming_source::text
    FROM public.platform_customers pc
    WHERE pc.id = _cid;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_yearly_trimming_for_job(
  _jobber_job_id uuid,
  _customer_id uuid,
  _value boolean
) RETURNS TABLE (customer_id uuid, enabled boolean, source text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid uuid := _customer_id;
  _biz uuid;
BEGIN
  IF _cid IS NULL AND _jobber_job_id IS NOT NULL THEN
    SELECT pc.id, pc.business_id INTO _cid, _biz
    FROM public.jobber_jobs jj
    JOIN public.jobber_clients jc ON jc.id = jj.client_id
    JOIN public.platform_customers pc
      ON pc.business_id = jj.business_id
     AND pc.source_system = 'jobber'
     AND pc.source_record_id = jc.jobber_id
    WHERE jj.id = _jobber_job_id
    LIMIT 1;
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

  RETURN QUERY
    SELECT _cid, _value, 'manual'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_yearly_trimming_for_job(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_yearly_trimming_for_job(uuid, uuid, boolean) TO authenticated;
