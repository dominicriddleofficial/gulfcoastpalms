
CREATE OR REPLACE FUNCTION public.get_schedule_jobs(
  p_business_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE(
  id text,
  source text,
  jobber_id text,
  visit_id uuid,
  job_id uuid,
  customer_email text,
  address text,
  title text,
  customer_id uuid,
  client_name text,
  client_phone text,
  property_address text,
  status text,
  visit_status text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  total_amount numeric,
  job_number text,
  internal_notes text,
  assigned_employee_names text[],
  business_id uuid,
  property_id uuid,
  service_items jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  WITH bounds AS (
    SELECT
      (p_start AT TIME ZONE 'America/Chicago')::date AS lo_d,
      (p_end   AT TIME ZONE 'America/Chicago')::date AS hi_d
  ),
  excluded AS (SELECT ARRAY['archived','canceled','cancelled','deleted']::text[] AS arr),
  -- ===== visits in range, joined to platform_jobs =====
  visit_items AS (
    SELECT
      COALESCE(v.id::text, j.id::text) AS id,
      CASE
        WHEN j.source_system = 'jobber' OR j.source = 'jobber' OR j.source_record_id IS NOT NULL
          THEN 'jobber_import' ELSE 'platform'
      END AS source,
      CASE
        WHEN j.source_system = 'jobber' OR j.source = 'jobber' OR j.source_record_id IS NOT NULL
          THEN j.source_record_id ELSE NULL
      END AS jobber_id,
      v.id AS visit_id,
      j.id AS job_id,
      pc.email AS customer_email,
      NULL::text AS address_placeholder,
      COALESCE(v.title, j.title) AS title,
      j.customer_id AS customer_id,
      pc.display_name AS client_name,
      pc.phone AS client_phone,
      pp.address_1, pp.address_2, pp.city, pp.state, pp.zip,
      LOWER(COALESCE(j.status,'scheduled')) AS status,
      LOWER(COALESCE(v.status,'scheduled')) AS visit_status,
      ((v.scheduled_date::text || 'T' || COALESCE(v.scheduled_start_time::text,'00:00:00'))::timestamp
        AT TIME ZONE 'America/Chicago') AS scheduled_start,
      CASE WHEN v.scheduled_end_time IS NOT NULL
        THEN ((v.scheduled_date::text || 'T' || v.scheduled_end_time::text)::timestamp
              AT TIME ZONE 'America/Chicago')
        WHEN j.scheduled_end IS NOT NULL
        THEN ((j.scheduled_end::date::text || 'T00:00:00')::timestamp AT TIME ZONE 'America/Chicago')
        ELSE NULL
      END AS scheduled_end,
      COALESCE(j.total, 0)::numeric AS total_amount,
      j.job_number,
      COALESCE(v.internal_notes, j.internal_notes) AS internal_notes,
      NULL::text[] AS assigned_employee_names,
      COALESCE(v.business_id, j.business_id) AS business_id,
      COALESCE(v.property_id, j.property_id) AS property_id,
      NULL::jsonb AS service_items,
      j.source_record_id AS src_rec_id,
      j.source_system AS src_sys,
      j.source AS src
    FROM public.platform_job_visits v
    JOIN public.platform_jobs j ON j.id = v.job_id
    LEFT JOIN public.platform_customers pc ON pc.id = j.customer_id
    LEFT JOIN public.platform_properties pp ON pp.id = COALESCE(v.property_id, j.property_id)
    CROSS JOIN bounds, excluded
    WHERE v.business_id = p_business_id
      AND v.scheduled_date IS NOT NULL
      AND v.scheduled_date BETWEEN bounds.lo_d AND bounds.hi_d
      AND j.deleted_at IS NULL
      AND NOT (LOWER(COALESCE(j.status,'scheduled')) = ANY(excluded.arr))
      AND NOT (LOWER(COALESCE(v.status,'scheduled')) = ANY(excluded.arr))
  ),
  -- platform_jobs scheduled in range WITHOUT a (range-filtered) visit
  job_items AS (
    SELECT
      j.id::text AS id,
      CASE
        WHEN j.source_system = 'jobber' OR j.source = 'jobber' OR j.source_record_id IS NOT NULL
          THEN 'jobber_import' ELSE 'platform'
      END AS source,
      CASE
        WHEN j.source_system = 'jobber' OR j.source = 'jobber' OR j.source_record_id IS NOT NULL
          THEN j.source_record_id ELSE NULL
      END AS jobber_id,
      NULL::uuid AS visit_id,
      j.id AS job_id,
      pc.email AS customer_email,
      NULL::text AS address_placeholder,
      j.title AS title,
      j.customer_id AS customer_id,
      pc.display_name AS client_name,
      pc.phone AS client_phone,
      pp.address_1, pp.address_2, pp.city, pp.state, pp.zip,
      LOWER(COALESCE(j.status,'scheduled')) AS status,
      'scheduled'::text AS visit_status,
      ((j.scheduled_start::date::text || 'T00:00:00')::timestamp AT TIME ZONE 'America/Chicago') AS scheduled_start,
      CASE WHEN j.scheduled_end IS NOT NULL
        THEN ((j.scheduled_end::date::text || 'T00:00:00')::timestamp AT TIME ZONE 'America/Chicago')
        ELSE NULL END AS scheduled_end,
      COALESCE(j.total, 0)::numeric AS total_amount,
      j.job_number,
      j.internal_notes,
      NULL::text[] AS assigned_employee_names,
      j.business_id,
      j.property_id,
      NULL::jsonb AS service_items,
      j.source_record_id AS src_rec_id,
      j.source_system AS src_sys,
      j.source AS src
    FROM public.platform_jobs j
    LEFT JOIN public.platform_customers pc ON pc.id = j.customer_id
    LEFT JOIN public.platform_properties pp ON pp.id = j.property_id
    CROSS JOIN bounds, excluded
    WHERE j.business_id = p_business_id
      AND j.scheduled_start IS NOT NULL
      AND j.scheduled_start::date BETWEEN bounds.lo_d AND bounds.hi_d
      AND j.deleted_at IS NULL
      AND NOT (LOWER(COALESCE(j.status,'scheduled')) = ANY(excluded.arr))
      AND NOT EXISTS (
        SELECT 1 FROM public.platform_job_visits v2
        WHERE v2.job_id = j.id
          AND v2.scheduled_date IS NOT NULL
          AND v2.scheduled_date BETWEEN (SELECT lo_d FROM bounds) AND (SELECT hi_d FROM bounds)
      )
  ),
  platform_items AS (
    SELECT * FROM visit_items
    UNION ALL
    SELECT * FROM job_items
  ),
  imported_ids AS (
    SELECT DISTINCT src_rec_id AS sid FROM platform_items
    WHERE src_rec_id IS NOT NULL
      AND (src_sys = 'jobber' OR src = 'jobber')
  ),
  jobber_items AS (
    SELECT
      jj.id::text AS id,
      'jobber_synced'::text AS source,
      COALESCE(jj.jobber_id, jj.id::text) AS jobber_id,
      NULL::uuid AS visit_id,
      NULL::uuid AS job_id,
      jc.email AS customer_email,
      NULL::text AS address_placeholder,
      jj.title,
      NULL::uuid AS customer_id,
      COALESCE(jj.client_name, jc.display_name) AS client_name,
      COALESCE(jj.client_phone, jc.phone) AS client_phone,
      NULL::text AS address_1,
      NULL::text AS address_2,
      jp.city AS city,
      jp.state AS state,
      jp.zip AS zip,
      LOWER(COALESCE(jj.status,'scheduled')) AS status,
      LOWER(COALESCE(jj.visit_status,'scheduled')) AS visit_status,
      jj.scheduled_start,
      jj.scheduled_end,
      COALESCE(jj.total_amount, 0)::numeric AS total_amount,
      jj.job_number,
      jj.internal_notes,
      jj.assigned_employee_names,
      jj.business_id,
      jj.property_id,
      to_jsonb(jj.service_items) AS service_items,
      NULL::text AS src_rec_id,
      NULL::text AS src_sys,
      NULL::text AS src,
      -- carry composite address for jobber path
      jj.property_address AS jobber_property_address,
      jp.street1 AS jp_street1,
      jp.street2 AS jp_street2
    FROM public.jobber_jobs jj
    LEFT JOIN public.jobber_clients jc ON jc.id = jj.client_id
    LEFT JOIN public.jobber_properties jp ON jp.id = jj.property_id
    CROSS JOIN excluded
    WHERE jj.business_id = p_business_id
      AND jj.scheduled_start IS NOT NULL
      AND jj.scheduled_start >= p_start
      AND jj.scheduled_start <= p_end
      AND NOT (LOWER(COALESCE(jj.status,'')) = ANY(excluded.arr))
      AND NOT (LOWER(COALESCE(jj.visit_status,'')) = ANY(excluded.arr))
      AND NOT EXISTS (SELECT 1 FROM imported_ids ii WHERE ii.sid = jj.id::text)
  ),
  combined_platform AS (
    SELECT
      pi.id, pi.source, pi.jobber_id, pi.visit_id, pi.job_id,
      pi.customer_email,
      NULLIF(
        concat_ws(', ',
          NULLIF(concat_ws(' ', NULLIF(pi.address_1,''), NULLIF(pi.address_2,'')),''),
          NULLIF(concat_ws(' ', NULLIF(pi.city,''), NULLIF(pi.state,''), NULLIF(pi.zip,'')),'')
        ),
      '') AS address,
      pi.title, pi.customer_id, pi.client_name, pi.client_phone,
      pi.status, pi.visit_status, pi.scheduled_start, pi.scheduled_end,
      pi.total_amount, pi.job_number, pi.internal_notes,
      pi.assigned_employee_names, pi.business_id, pi.property_id, pi.service_items
    FROM platform_items pi
  ),
  combined_jobber AS (
    SELECT
      ji.id, ji.source, ji.jobber_id, ji.visit_id, ji.job_id, ji.customer_email,
      COALESCE(
        ji.jobber_property_address,
        NULLIF(
          concat_ws(', ',
            NULLIF(concat_ws(' ', NULLIF(ji.jp_street1,''), NULLIF(ji.jp_street2,'')),''),
            NULLIF(concat_ws(' ', NULLIF(ji.city,''), NULLIF(ji.state,''), NULLIF(ji.zip,'')),'')
          ),
        '')
      ) AS address,
      ji.title, ji.customer_id, ji.client_name, ji.client_phone,
      ji.status, ji.visit_status, ji.scheduled_start, ji.scheduled_end,
      ji.total_amount, ji.job_number, ji.internal_notes,
      ji.assigned_employee_names, ji.business_id, ji.property_id, ji.service_items
    FROM jobber_items ji
  )
  SELECT
    id, source, jobber_id, visit_id, job_id, customer_email,
    address, title, customer_id, client_name, client_phone,
    address AS property_address,
    status, visit_status, scheduled_start, scheduled_end,
    total_amount, job_number, internal_notes,
    assigned_employee_names, business_id, property_id, service_items
  FROM combined_platform
  UNION ALL
  SELECT
    id, source, jobber_id, visit_id, job_id, customer_email,
    address, title, customer_id, client_name, client_phone,
    address AS property_address,
    status, visit_status, scheduled_start, scheduled_end,
    total_amount, job_number, internal_notes,
    assigned_employee_names, business_id, property_id, service_items
  FROM combined_jobber
  ORDER BY scheduled_start ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_schedule_jobs(uuid, timestamptz, timestamptz) TO authenticated;
