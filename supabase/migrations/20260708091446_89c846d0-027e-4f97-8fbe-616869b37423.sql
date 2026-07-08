
-- Updated auto-flag: counts platform completed+scheduled PLUS phone-matched jobber history
CREATE OR REPLACE FUNCTION public.auto_flag_yearly_trimming()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pcount integer := 0;
  _jcount integer := 0;
  _cust   RECORD;
  _np     text;
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;
  IF lower(coalesce(NEW.status,'')) NOT IN ('completed','scheduled') THEN RETURN NEW; END IF;

  SELECT yearly_trimming, yearly_trimming_source, phone, business_id
    INTO _cust
    FROM public.platform_customers
   WHERE id = NEW.customer_id;

  IF _cust IS NULL THEN RETURN NEW; END IF;
  IF _cust.yearly_trimming = true AND _cust.yearly_trimming_source = 'manual' THEN
    RETURN NEW;
  END IF;
  IF _cust.yearly_trimming = true THEN RETURN NEW; END IF;
  -- respect manual off
  IF _cust.yearly_trimming = false AND _cust.yearly_trimming_source = 'manual' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO _pcount
    FROM public.platform_jobs
   WHERE customer_id = NEW.customer_id
     AND lower(coalesce(status,'')) IN ('completed','scheduled')
     AND deleted_at IS NULL;

  _np := right(regexp_replace(coalesce(_cust.phone,''), '\D','','g'), 10);
  IF length(_np) = 10 THEN
    SELECT count(*) INTO _jcount
      FROM public.jobber_jobs
     WHERE business_id = _cust.business_id
       AND right(regexp_replace(coalesce(client_phone,''), '\D','','g'), 10) = _np;
  END IF;

  IF (_pcount + _jcount) >= 2 THEN
    UPDATE public.platform_customers
       SET yearly_trimming = true,
           yearly_trimming_added_at = COALESCE(yearly_trimming_added_at, now()),
           yearly_trimming_source = 'auto',
           updated_at = now()
     WHERE id = NEW.customer_id
       AND yearly_trimming = false
       AND (yearly_trimming_source IS DISTINCT FROM 'manual');
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill V2
WITH cust AS (
  SELECT id, business_id,
         right(regexp_replace(coalesce(phone,''), '\D','','g'), 10) AS np,
         yearly_trimming, yearly_trimming_source
    FROM public.platform_customers
),
pj AS (
  SELECT customer_id, count(*) AS c
    FROM public.platform_jobs
   WHERE customer_id IS NOT NULL
     AND lower(coalesce(status,'')) IN ('completed','scheduled')
     AND deleted_at IS NULL
   GROUP BY customer_id
),
jj AS (
  SELECT business_id,
         right(regexp_replace(coalesce(client_phone,''), '\D','','g'), 10) AS np,
         count(*) AS c
    FROM public.jobber_jobs
   WHERE client_phone IS NOT NULL AND client_phone <> ''
   GROUP BY business_id, right(regexp_replace(coalesce(client_phone,''), '\D','','g'), 10)
),
totals AS (
  SELECT c.id,
         coalesce(pj.c, 0) + coalesce(CASE WHEN length(c.np)=10 THEN jj.c ELSE 0 END, 0) AS total
    FROM cust c
    LEFT JOIN pj ON pj.customer_id = c.id
    LEFT JOIN jj ON jj.business_id = c.business_id AND length(c.np)=10 AND jj.np = c.np
   WHERE c.yearly_trimming = false
     AND (c.yearly_trimming_source IS DISTINCT FROM 'manual')
)
UPDATE public.platform_customers pc
   SET yearly_trimming = true,
       yearly_trimming_added_at = COALESCE(pc.yearly_trimming_added_at, now()),
       yearly_trimming_source = 'auto',
       updated_at = now()
  FROM totals t
 WHERE pc.id = t.id
   AND t.total >= 2;
