
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
  -- STEP 1b: stamp existing platform_customers that match a jobber_client by
  -- normalized phone (last 10 digits) or email. Use bipartite assignment
  -- (DISTINCT ON pc.id) so each platform_customers row is claimed by at most
  -- one jobber_client; remaining jobber_clients fall through to step 1c.
  WITH candidates AS (
    SELECT jc.id AS jc_id, jc.jobber_id, jc.business_id, jc.created_at AS jc_created,
           NULLIF(lower(jc.email),'')                                            AS lemail,
           right(regexp_replace(coalesce(jc.phone,''),          '\D','','g'), 10) AS np,
           right(regexp_replace(coalesce(jc.secondary_phone,''), '\D','','g'), 10) AS np2
    FROM public.jobber_clients jc
    WHERE NOT EXISTS (
      SELECT 1 FROM public.platform_customers pc
      WHERE pc.business_id = jc.business_id
        AND pc.source_system = 'jobber'
        AND pc.source_record_id = jc.jobber_id
    )
  ),
  pairs AS (
    SELECT c.jc_id, c.jobber_id, c.jc_created, pc.id AS pc_id, pc.created_at AS pc_created
    FROM candidates c
    JOIN public.platform_customers pc
      ON pc.business_id = c.business_id
     AND (pc.source_record_id IS NULL OR pc.source_system IS NULL OR pc.source_system <> 'jobber')
     AND (
       (length(c.np)  = 10 AND right(regexp_replace(coalesce(pc.phone,''),         '\D','','g'),10) = c.np)
       OR (length(c.np)  = 10 AND right(regexp_replace(coalesce(pc.secondary_phone,''),'\D','','g'),10) = c.np)
       OR (length(c.np2) = 10 AND right(regexp_replace(coalesce(pc.phone,''),         '\D','','g'),10) = c.np2)
       OR (c.lemail IS NOT NULL AND lower(pc.email) = c.lemail)
     )
  ),
  -- one platform_customers per claimer (earliest jc wins per pc)
  claimed_pc AS (
    SELECT DISTINCT ON (pc_id) pc_id, jc_id, jobber_id
    FROM pairs
    ORDER BY pc_id, jc_created ASC, jc_id
  ),
  -- one jc per claim (earliest pc wins per jc)
  matched AS (
    SELECT DISTINCT ON (jc_id) jc_id, jobber_id, pc_id
    FROM claimed_pc
    ORDER BY jc_id, pc_id
  )
  UPDATE public.platform_customers pc
     SET source_system         = 'jobber',
         source_record_id      = m.jobber_id,
         source_last_synced_at = now(),
         updated_at            = now()
    FROM matched m
   WHERE pc.id = m.pc_id;

  -- STEP 1c: insert net-new platform_customers for jobber_clients still
  -- unmatched (they had no existing row claimable by phone/email, or all
  -- candidate rows were already claimed by a sibling jobber_client).
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

  -- STEP 2..5 (unchanged)
  WITH ins AS (
    INSERT INTO public.platform_properties (
      business_id, customer_id, address_1, address_2, city, state, zip,
      country, latitude, longitude, formatted_address, map_place_id, county,
      source_system, source_record_id, source_last_synced_at
    )
    SELECT
      jp.business_id, pc.id,
      jp.street1, NULLIF(jp.street2,''),
      jp.city, COALESCE(NULLIF(jp.state,''),'FL'), jp.zip,
      COALESCE(jp.country,'US'), jp.lat, jp.lng,
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
      jj.internal_notes, pc.id, pp.id,
      'jobber', 'jobber', jj.id::text, jj.synced_at, true
    FROM public.jobber_jobs jj
    LEFT JOIN public.jobber_clients    jc ON jc.id = jj.client_id
    LEFT JOIN public.platform_customers pc
      ON pc.business_id = jj.business_id AND pc.source_system='jobber' AND pc.source_record_id = jc.jobber_id
    LEFT JOIN public.jobber_properties jp ON jp.id = jj.property_id
    LEFT JOIN public.platform_properties pp
      ON pp.business_id = jj.business_id AND pp.source_system='jobber' AND pp.source_record_id = jp.jobber_id
    WHERE jj.scheduled_start IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.platform_jobs pjx
                       WHERE pjx.source_system='jobber' AND pjx.source_record_id = jj.id::text)
    ON CONFLICT (business_id, job_number) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO _jobs FROM ins;

  WITH upd AS (
    UPDATE public.platform_jobs pj
       SET customer_id = COALESCE(pj.customer_id, pc.id),
           property_id = COALESCE(pj.property_id, pp.id),
           updated_at  = now()
      FROM public.jobber_jobs jj
      LEFT JOIN public.jobber_clients    jc ON jc.id = jj.client_id
      LEFT JOIN public.platform_customers pc
        ON pc.business_id = jj.business_id AND pc.source_system='jobber' AND pc.source_record_id = jc.jobber_id
      LEFT JOIN public.jobber_properties jp ON jp.id = jj.property_id
      LEFT JOIN public.platform_properties pp
        ON pp.business_id = jj.business_id AND pp.source_system='jobber' AND pp.source_record_id = jp.jobber_id
     WHERE pj.source_system='jobber'
       AND pj.source_record_id = jj.id::text
       AND (pj.customer_id IS NULL OR pj.property_id IS NULL)
       AND (pc.id IS NOT NULL OR pp.id IS NOT NULL)
    RETURNING 1
  )
  SELECT count(*) INTO _relinked FROM upd;

  WITH insv AS (
    INSERT INTO public.platform_job_visits (
      business_id, job_id, visit_number, title, status,
      scheduled_date, scheduled_start_time, scheduled_end_time
    )
    SELECT
      pj.business_id, pj.id, 1, jj.title,
      CASE
        WHEN pj.status='completed' THEN 'completed'
        WHEN pj.status='cancelled' THEN 'cancelled'
        WHEN pj.status='in_progress' THEN 'in_progress'
        ELSE 'scheduled'
      END,
      jj.scheduled_start::date,
      (jj.scheduled_start AT TIME ZONE 'UTC')::time,
      CASE WHEN jj.scheduled_end IS NOT NULL
           THEN (jj.scheduled_end AT TIME ZONE 'UTC')::time ELSE NULL END
    FROM public.platform_jobs pj
    JOIN public.jobber_jobs jj ON jj.id::text = pj.source_record_id
    WHERE pj.source_system='jobber'
      AND NOT EXISTS (SELECT 1 FROM public.platform_job_visits pv WHERE pv.job_id = pj.id)
    RETURNING 1
  )
  SELECT count(*) INTO _visits FROM insv;

  RETURN QUERY SELECT _cust, _props, _jobs, _visits, _relinked;
END;
$$;
