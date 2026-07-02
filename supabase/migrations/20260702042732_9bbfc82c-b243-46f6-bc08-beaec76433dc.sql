
CREATE OR REPLACE FUNCTION public.get_jobs_list(p_business_id uuid)
RETURNS TABLE(
  id text, jobber_id text, title text, status text, visit_status text,
  scheduled_start timestamptz, scheduled_end timestamptz,
  client_name text, client_phone text, property_address text,
  assigned_employee_names text[], internal_notes text, job_number text,
  total_amount numeric, business_id uuid, source text, missing_address boolean
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$
  WITH excluded AS (SELECT ARRAY['archived','canceled','cancelled','deleted']::text[] AS arr),
  platform AS (
    SELECT j.id::text AS id, ''::text AS jobber_id, j.title, j.status,
      NULL::text AS visit_status, j.scheduled_start, j.scheduled_end,
      pc.display_name AS client_name, pc.phone AS client_phone,
      NULLIF(concat_ws(', ', NULLIF(btrim(COALESCE(pp.address_1,'')),''), NULLIF(btrim(COALESCE(pp.city,'')),'')), '') AS property_address,
      NULL::text[] AS assigned_employee_names, j.internal_notes, j.job_number,
      j.total::numeric AS total_amount, j.business_id, 'platform'::text AS source,
      (NULLIF(btrim(COALESCE(pp.address_1,'')),'') IS NULL AND NULLIF(btrim(COALESCE(pp.city,'')),'') IS NULL) AS missing_address,
      j.source_record_id
    FROM public.platform_jobs j
    LEFT JOIN public.platform_customers pc ON pc.id = j.customer_id
    LEFT JOIN public.platform_properties pp ON pp.id = j.property_id
    CROSS JOIN excluded e
    WHERE (p_business_id IS NULL OR j.business_id = p_business_id)
      AND j.deleted_at IS NULL
      AND NOT (LOWER(COALESCE(j.status,'scheduled')) = ANY(e.arr))
  ),
  imported_ids AS (SELECT DISTINCT source_record_id AS sid FROM platform WHERE source_record_id IS NOT NULL),
  jobber AS (
    SELECT jj.id::text AS id, COALESCE(jj.jobber_id, jj.id::text) AS jobber_id,
      jj.title, jj.status, jj.visit_status, jj.scheduled_start, jj.scheduled_end,
      jj.client_name, jj.client_phone, jj.property_address, jj.assigned_employee_names,
      jj.internal_notes, jj.job_number, jj.total_amount::numeric AS total_amount,
      jj.business_id, 'jobber'::text AS source,
      (jj.property_address IS NULL OR btrim(jj.property_address) = '') AS missing_address
    FROM public.jobber_jobs jj
    WHERE (p_business_id IS NULL OR jj.business_id = p_business_id)
      AND NOT EXISTS (SELECT 1 FROM imported_ids ii WHERE ii.sid = jj.id::text)
  )
  SELECT id, jobber_id, title, status, visit_status, scheduled_start, scheduled_end,
    client_name, client_phone, property_address, assigned_employee_names,
    internal_notes, job_number, total_amount, business_id, source, missing_address FROM platform
  UNION ALL
  SELECT id, jobber_id, title, status, visit_status, scheduled_start, scheduled_end,
    client_name, client_phone, property_address, assigned_employee_names,
    internal_notes, job_number, total_amount, business_id, source, missing_address FROM jobber
  ORDER BY scheduled_start DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_jobs_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_jobs_list(uuid) TO service_role;
