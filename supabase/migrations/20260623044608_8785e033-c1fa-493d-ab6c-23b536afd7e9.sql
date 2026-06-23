
-- 1. Add source-tracking columns to platform_properties so we can match on re-sync
ALTER TABLE public.platform_properties
  ADD COLUMN IF NOT EXISTS source_system text,
  ADD COLUMN IF NOT EXISTS source_record_id text,
  ADD COLUMN IF NOT EXISTS source_last_synced_at timestamptz;

-- 2. Idempotency: unique indexes for future syncs
CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_customers_source
  ON public.platform_customers (business_id, source_system, source_record_id)
  WHERE source_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_properties_source
  ON public.platform_properties (business_id, source_system, source_record_id)
  WHERE source_record_id IS NOT NULL;

-- 3. Drop old signature (return type is changing)
DROP FUNCTION IF EXISTS public.backfill_jobber_to_platform();

-- 4. Rewrite the backfill function
CREATE OR REPLACE FUNCTION public.backfill_jobber_to_platform()
RETURNS TABLE(
  customers_inserted integer,
  properties_inserted integer,
  jobs_inserted integer,
  visits_inserted integer,
  jobs_relinked integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cust integer := 0;
  _props integer := 0;
  _jobs integer := 0;
  _visits integer := 0;
  _relinked integer := 0;
BEGIN
  -- STEP 1b: stamp source on existing platform_customers that already match a
  -- jobber_client by phone+name or email (do NOT create new duplicates).
  WITH candidates AS (
    SELECT jc.id AS jc_id, jc.jobber_id, jc.business_id, jc.email,
           lower(jc.display_name) AS lname, jc.phone
    FROM public.jobber_clients jc
    WHERE NOT EXISTS (
      SELECT 1 FROM public.platform_customers pc
      WHERE pc.business_id = jc.business_id
        AND pc.source_system = 'jobber'
        AND pc.source_record_id = jc.jobber_id
    )
  ),
  matched AS (
    SELECT DISTINCT ON (c.jc_id)
      c.jc_id, c.jobber_id, pc.id AS pc_id
    FROM candidates c
    JOIN public.platform_customers pc
      ON pc.business_id = c.business_id
     AND (
       (c.phone IS NOT NULL AND c.phone <> '' AND pc.phone = c.phone
         AND lower(pc.display_name) = c.lname)
       OR (c.email IS NOT NULL AND c.email <> '' AND lower(pc.email) = lower(c.email))
     )
     AND (pc.source_record_id IS NULL OR pc.source_system IS NULL OR pc.source_system <> 'jobber')
    ORDER BY c.jc_id, pc.created_at ASC
  )
  UPDATE public.platform_customers pc
     SET source_system = 'jobber',
         source_record_id = m.jobber_id,
         source_last_synced_at = now(),
         updated_at = now()
    FROM matched m
   WHERE pc.id = m.pc_id;

  -- STEP 1c: insert genuinely new platform_customers for any jobber_client
  -- still without a match.
  WITH ins AS (
    INSERT INTO public.platform_customers (
      business_id, display_name, first_name, last_name, company_name,
      email, phone, secondary_phone, source, source_system, source_record_id,
      source_last_synced_at
    )
    SELECT
      jc.business_id, jc.display_name, jc.first_name, jc.last_name, jc.company_name,
      NULLIF(jc.email,''), NULLIF(jc.phone,''), NULLIF(jc.secondary_phone,''),
      'jobber', 'jobber', jc.jobber_id, now()
    FROM public.jobber_clients jc
    WHERE NOT EXISTS (
      SELECT 1 FROM public.platform_customers pc
      WHERE pc.business_id = jc.business_id
        AND pc.source_system = 'jobber'
        AND pc.source_record_id = jc.jobber_id
    )
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO _cust FROM ins;

  -- STEP 2: insert/link platform_properties from jobber_properties
  WITH ins AS (
    INSERT INTO public.platform_properties (
      business_id, customer_id, address_1, address_2, city, state, zip,
      country, latitude, longitude, formatted_address, map_place_id, county,
      source_system, source_record_id, source_last_synced_at
    )
    SELECT
      jp.business_id,
      pc.id,
      jp.street1, NULLIF(jp.street2,''),
      jp.city, COALESCE(NULLIF(jp.state,''),'FL'), jp.zip,
      COALESCE(jp.country,'US'),
      jp.lat, jp.lng,
      jp.formatted_address, jp.place_id, jp.county,
      'jobber', jp.jobber_id, now()
    FROM public.jobber_properties jp
    JOIN public.jobber_clients jc ON jc.id = jp.client_id
    JOIN public.platform_customers pc
      ON pc.business_id = jp.business_id
     AND pc.source_system = 'jobber'
     AND pc.source_record_id = jc.jobber_id
    WHERE jp.street1 IS NOT NULL AND jp.street1 <> ''
      AND jp.city    IS NOT NULL AND jp.city    <> ''
      AND jp.zip     IS NOT NULL AND jp.zip     <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.platform_properties pp
        WHERE pp.business_id = jp.business_id
          AND pp.source_system = 'jobber'
          AND pp.source_record_id = jp.jobber_id
      )
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO _props FROM ins;

  -- STEP 3: insert new platform_jobs with customer + property already linked
  WITH ins AS (
    INSERT INTO public.platform_jobs (
      business_id, job_number, title, status,
      scheduled_start, scheduled_end,
      total, subtotal, internal_notes,
      customer_id, property_id,
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
      pc.id,
      pp.id,
      'jobber', 'jobber', jj.id::text, jj.synced_at, true
    FROM public.jobber_jobs jj
    LEFT JOIN public.jobber_clients    jc ON jc.id = jj.client_id
    LEFT JOIN public.platform_customers pc
      ON pc.business_id = jj.business_id
     AND pc.source_system = 'jobber'
     AND pc.source_record_id = jc.jobber_id
    LEFT JOIN public.jobber_properties jp ON jp.id = jj.property_id
    LEFT JOIN public.platform_properties pp
      ON pp.business_id = jj.business_id
     AND pp.source_system = 'jobber'
     AND pp.source_record_id = jp.jobber_id
    WHERE jj.scheduled_start IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.platform_jobs pjx
        WHERE pjx.source_system = 'jobber' AND pjx.source_record_id = jj.id::text
      )
    ON CONFLICT (business_id, job_number) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO _jobs FROM ins;

  -- STEP 4: relink existing jobber-sourced platform_jobs whose FKs are NULL.
  -- COALESCE ensures we NEVER overwrite an existing non-null link.
  WITH upd AS (
    UPDATE public.platform_jobs pj
       SET customer_id = COALESCE(pj.customer_id, pc.id),
           property_id = COALESCE(pj.property_id, pp.id),
           updated_at  = now()
      FROM public.jobber_jobs jj
      LEFT JOIN public.jobber_clients    jc ON jc.id = jj.client_id
      LEFT JOIN public.platform_customers pc
        ON pc.business_id = jj.business_id
       AND pc.source_system = 'jobber'
       AND pc.source_record_id = jc.jobber_id
      LEFT JOIN public.jobber_properties jp ON jp.id = jj.property_id
      LEFT JOIN public.platform_properties pp
        ON pp.business_id = jj.business_id
       AND pp.source_system = 'jobber'
       AND pp.source_record_id = jp.jobber_id
     WHERE pj.source_system = 'jobber'
       AND pj.source_record_id = jj.id::text
       AND (pj.customer_id IS NULL OR pj.property_id IS NULL)
       AND (pc.id IS NOT NULL OR pp.id IS NOT NULL)
    RETURNING 1
  )
  SELECT count(*) INTO _relinked FROM upd;

  -- STEP 5 (unchanged): one visit per backfilled job that has none.
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

  RETURN QUERY SELECT _cust, _props, _jobs, _visits, _relinked;
END;
$$;
